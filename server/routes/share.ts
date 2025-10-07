import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { sendEmail, canSendEmail, getEmailPreferences } from '../services/emailService.js';
import { sharedTripViewEmail } from '../services/emailTemplates.js';

const router = Router();

// Validation schema
const shareTokenSchema = z.object({
  token: z.string().uuid(),
});

/**
 * GET /api/share/:token
 * Get a trip by its public share token (no auth required)
 */
router.get('/:token', async (req: Request, res: Response) => {
  try {
    // Validate token parameter
    const validation = shareTokenSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid share token format',
        details: validation.error.errors
      });
    }

    const { token } = validation.data;

    // Find trip by share token
    const trip = await prisma.trip.findUnique({
      where: { publicShareToken: token },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        user: {
          select: {
            name: true,
            picture: true,
            customName: true,
            customPicture: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Shared trip not found' });
    }

    // Check if share link has expired
    if (trip.shareExpiresAt && trip.shareExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Increment view count
    const updatedTrip = await prisma.trip.update({
      where: { id: trip.id },
      data: { shareViewCount: { increment: 1 } },
    });

    // Send notification email to trip owner (async, don't wait)
    // Only send on milestones: 1st view, 5th view, 10th view, 25th view, etc.
    const newCount = updatedTrip.shareViewCount;
    const shouldNotify = newCount === 1 || newCount === 5 || newCount === 10 || newCount === 25 || newCount % 50 === 0;

    if (shouldNotify) {
      const sendViewNotification = async () => {
        try {
          const owner = await prisma.user.findUnique({
            where: { id: trip.userId },
          });

          if (!owner) return;

          const canSend = await canSendEmail(owner.id, 'shared_trip');
          if (canSend) {
            const preferences = await getEmailPreferences(owner.id);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

            const html = sharedTripViewEmail({
              userName: owner.name || 'there',
              tripTitle: trip.title,
              viewerCount: newCount,
              shareUrl: `${frontendUrl}/share/${token}`,
              viewTripUrl: `${frontendUrl}/trip/${trip.id}`,
              unsubscribeUrl: `${frontendUrl}/email/unsubscribe?token=${preferences.unsubscribeToken}`,
            });

            await sendEmail({
              to: owner.email,
              subject: `Someone viewed your shared trip! 👀`,
              html,
              userId: owner.id,
              tripId: trip.id,
              emailType: 'shared_trip',
            });
          }
        } catch (error) {
          console.error('Failed to send shared trip notification:', error);
          // Don't fail the request if email fails
        }
      };
      sendViewNotification();
    }

    // Return trip data without sensitive user info
    res.json({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      tripData: trip.dataJson,
      messages: trip.conversations[0]?.messagesJson || [],
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      owner: {
        name: trip.user.customName || trip.user.name || 'Anonymous',
        picture: trip.user.customPicture || trip.user.picture,
      },
      isShared: true,
      viewCount: trip.shareViewCount + 1, // Include the new count
    });
  } catch (error) {
    console.error('Error fetching shared trip:', error);
    res.status(500).json({
      error: 'Failed to fetch shared trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
