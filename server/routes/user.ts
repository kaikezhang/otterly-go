import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schema for profile update
 */
const updateProfileSchema = z.object({
  customName: z.string().min(1).max(100).optional().nullable(),
  customPicture: z.string().url().optional().nullable(),
  emailNotifications: z.boolean().optional(),
  tripReminders: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
});

/**
 * PATCH /api/user/profile
 * Update user profile and preferences
 */
router.patch(
  '/profile',
  requireAuth,
  validateRequest(updateProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const updates = req.validatedData;

      // Update user in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          picture: true,
          customName: true,
          customPicture: true,
          emailNotifications: true,
          tripReminders: true,
          publicProfile: true,
          subscriptionTier: true,
          googleId: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * DELETE /api/user/account
 * Delete user account and all associated data
 */
router.delete('/account', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete user (cascade will delete trips and conversations)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Clear auth cookie
    res.clearCookie('auth_token');

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
