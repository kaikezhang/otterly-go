/**
 * Email Import Routes (Milestone 5.1)
 * API endpoints for manual email upload and OAuth management
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';
import {
  parseEmailContent,
  isLikelyBookingEmail,
} from '../services/emailParser.js';
import {
  getGmailAuthUrl,
  handleGmailCallback,
  scanGmailInbox,
  disconnectGmail,
} from '../services/gmailService.js';
import {
  getOutlookAuthUrl,
  handleOutlookCallback,
  scanOutlookInbox,
  disconnectOutlook,
} from '../services/outlookService.js';
import {
  insertBookingIntoTrip,
  autoInsertBooking,
  detectConflicts,
} from '../services/autoInsert.js';
import * as pdfParse from 'pdf-parse';

const router = express.Router();

// Configure multer for file uploads (PDF support)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/html'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, and HTML allowed.'));
    }
  },
});

// Validation schemas
const manualUploadSchema = z.object({
  emailSubject: z.string().min(1),
  senderEmail: z.string().email(),
  emailContent: z.string().min(10),
  tripId: z.string().optional(), // Optional: associate with existing trip
});

/**
 * POST /api/email-import/manual-upload
 * Upload email content (text/HTML) for parsing
 */
router.post('/manual-upload', requireAuth, async (req: Request, res: Response) => {
  try {
    const validation = manualUploadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues });
    }

    const { emailSubject, senderEmail, emailContent, tripId } = validation.data;
    const userId = req.user!.id;

    // Quick filter: Check if likely a booking email
    if (!isLikelyBookingEmail(emailSubject, senderEmail)) {
      return res.status(200).json({
        message: 'Email does not appear to be a booking confirmation',
        isBooking: false,
      });
    }

    // Parse email content using GPT
    const parsed = await parseEmailContent(
      emailContent,
      emailSubject,
      senderEmail
    );

    if (!parsed) {
      return res.status(200).json({
        message: 'Could not extract booking information with sufficient confidence',
        isBooking: false,
      });
    }

    // Save parsed booking to database
    const booking = await prisma.parsedBooking.create({
      data: {
        userId,
        tripId,
        bookingType: parsed.bookingType,
        title: parsed.title,
        description: parsed.description,
        confirmationNumber: parsed.confirmationNumber,
        bookingDate: parsed.bookingDate ? new Date(parsed.bookingDate) : null,
        startDateTime: parsed.startDateTime ? new Date(parsed.startDateTime) : null,
        endDateTime: parsed.endDateTime ? new Date(parsed.endDateTime) : null,
        location: parsed.location,
        rawEmailContent: emailContent,
        emailSubject,
        senderEmail,
        parsedDataJson: parsed.extractedData,
        status: 'pending',
        confidence: parsed.confidence,
        source: 'manual_upload',
      },
    });

    return res.status(200).json({
      success: true,
      booking: {
        id: booking.id,
        bookingType: booking.bookingType,
        title: booking.title,
        description: booking.description,
        confirmationNumber: booking.confirmationNumber,
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime,
        location: booking.location,
        confidence: booking.confidence,
        extractedData: booking.parsedDataJson,
      },
    });
  } catch (error) {
    console.error('Manual upload error:', error);
    return res.status(500).json({ error: 'Failed to process email' });
  }
});

/**
 * POST /api/email-import/upload-pdf
 * Upload PDF confirmation (extract text first, then parse)
 */
router.post(
  '/upload-pdf',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { tripId } = req.body;
      const userId = req.user!.id;

      // Extract text from PDF
      let emailContent: string;
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        emailContent = pdfData.text;
      } else {
        emailContent = req.file.buffer.toString('utf-8');
      }

      // Use filename as subject if not provided
      const emailSubject = req.body.emailSubject || req.file.originalname;
      const senderEmail = req.body.senderEmail || 'unknown@example.com';

      // Quick filter
      if (!isLikelyBookingEmail(emailSubject, senderEmail)) {
        return res.status(200).json({
          message: 'File does not appear to be a booking confirmation',
          isBooking: false,
        });
      }

      // Parse content using GPT
      const parsed = await parseEmailContent(
        emailContent,
        emailSubject,
        senderEmail
      );

      if (!parsed) {
        return res.status(200).json({
          message: 'Could not extract booking information with sufficient confidence',
          isBooking: false,
        });
      }

      // Save parsed booking
      const booking = await prisma.parsedBooking.create({
        data: {
          userId,
          tripId,
          bookingType: parsed.bookingType,
          title: parsed.title,
          description: parsed.description,
          confirmationNumber: parsed.confirmationNumber,
          bookingDate: parsed.bookingDate ? new Date(parsed.bookingDate) : null,
          startDateTime: parsed.startDateTime ? new Date(parsed.startDateTime) : null,
          endDateTime: parsed.endDateTime ? new Date(parsed.endDateTime) : null,
          location: parsed.location,
          rawEmailContent: emailContent,
          emailSubject,
          senderEmail,
          parsedDataJson: parsed.extractedData,
          status: 'pending',
          confidence: parsed.confidence,
          source: 'manual_upload',
        },
      });

      return res.status(200).json({
        success: true,
        booking: {
          id: booking.id,
          bookingType: booking.bookingType,
          title: booking.title,
          description: booking.description,
          confirmationNumber: booking.confirmationNumber,
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime,
          location: booking.location,
          confidence: booking.confidence,
          extractedData: booking.parsedDataJson,
        },
      });
    } catch (error) {
      console.error('PDF upload error:', error);
      return res.status(500).json({ error: 'Failed to process PDF' });
    }
  }
);

/**
 * GET /api/email-import/bookings
 * Get all parsed bookings for current user
 */
router.get('/bookings', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, tripId } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (tripId) where.tripId = tripId;

    const bookings = await prisma.parsedBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookingType: true,
        title: true,
        description: true,
        confirmationNumber: true,
        startDateTime: true,
        endDateTime: true,
        location: true,
        status: true,
        confidence: true,
        conflictDetected: true,
        source: true,
        parsedDataJson: true,
        createdAt: true,
      },
    });

    return res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

/**
 * PATCH /api/email-import/bookings/:id
 * Update booking status (e.g., mark as reviewed, added to trip, ignored)
 */
router.patch('/bookings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { status, tripId } = req.body;

    // Verify ownership
    const booking = await prisma.parsedBooking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updated = await prisma.parsedBooking.update({
      where: { id },
      data: {
        status,
        tripId,
        updatedAt: new Date(),
      },
    });

    return res.json({ success: true, booking: updated });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({ error: 'Failed to update booking' });
  }
});

/**
 * DELETE /api/email-import/bookings/:id
 * Delete a parsed booking
 */
router.delete('/bookings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const booking = await prisma.parsedBooking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await prisma.parsedBooking.delete({ where: { id } });

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete booking error:', error);
    return res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// ===== Auto-Insert Routes =====

/**
 * POST /api/email-import/bookings/:id/add-to-trip
 * Manually add a booking to a specific trip
 */
router.post('/bookings/:id/add-to-trip', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tripId } = req.body;
    const userId = req.user!.id;

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    // Verify booking ownership
    const booking = await prisma.parsedBooking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify trip ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Insert booking
    const result = await insertBookingIntoTrip(id, tripId);

    return res.json(result);
  } catch (error) {
    console.error('Add to trip error:', error);
    return res.status(500).json({ error: 'Failed to add booking to trip' });
  }
});

/**
 * POST /api/email-import/bookings/:id/auto-insert
 * Automatically insert a booking into the best matching trip
 */
router.post('/bookings/:id/auto-insert', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const booking = await prisma.parsedBooking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const result = await autoInsertBooking(id);

    return res.json(result);
  } catch (error) {
    console.error('Auto-insert error:', error);
    return res.status(500).json({ error: 'Failed to auto-insert booking' });
  }
});

// ===== Gmail OAuth Routes =====

/**
 * GET /api/email-import/gmail/auth
 * Initiate Gmail OAuth flow
 */
router.get('/gmail/auth', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const authUrl = getGmailAuthUrl(userId);

    return res.json({ authUrl });
  } catch (error) {
    console.error('Gmail auth URL error:', error);
    return res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/email-import/gmail/callback
 * Handle Gmail OAuth callback
 */
router.get('/gmail/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const result = await handleGmailCallback(code as string, state as string);

    // Redirect to frontend with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings?gmail_connected=true&email=${encodeURIComponent(result.email)}`);
  } catch (error) {
    console.error('Gmail callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings?gmail_error=true`);
  }
});

/**
 * GET /api/email-import/gmail/status
 * Check Gmail connection status
 */
router.get('/gmail/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const connection = await prisma.emailConnection.findFirst({
      where: {
        userId,
        provider: 'gmail',
      },
      select: {
        email: true,
        status: true,
        lastSyncedAt: true,
        syncEnabled: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      email: connection.email,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      syncEnabled: connection.syncEnabled,
      createdAt: connection.createdAt,
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    return res.status(500).json({ error: 'Failed to check Gmail status' });
  }
});

/**
 * POST /api/email-import/gmail/scan
 * Scan Gmail inbox for booking emails and parse them
 */
router.post('/gmail/scan', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Scan Gmail inbox
    const emails = await scanGmailInbox(userId);

    // Parse each email and save to database
    const parsedBookings = [];

    for (const email of emails) {
      // Check if already processed (by message ID)
      const existing = await prisma.parsedBooking.findFirst({
        where: {
          userId,
          sourceMessageId: email.messageId,
        },
      });

      if (existing) {
        console.log(`Email ${email.messageId} already processed, skipping`);
        continue;
      }

      // Quick filter
      if (!isLikelyBookingEmail(email.subject, email.from)) {
        continue;
      }

      try {
        // Parse email content
        const parsed = await parseEmailContent(email.content, email.subject, email.from);

        if (!parsed || parsed.confidence < 0.5) {
          console.log(`Low confidence for email ${email.messageId}, skipping`);
          continue;
        }

        // Save to database
        const booking = await prisma.parsedBooking.create({
          data: {
            userId,
            bookingType: parsed.bookingType,
            title: parsed.title,
            description: parsed.description,
            confirmationNumber: parsed.confirmationNumber,
            bookingDate: parsed.bookingDate ? new Date(parsed.bookingDate) : null,
            startDateTime: parsed.startDateTime ? new Date(parsed.startDateTime) : null,
            endDateTime: parsed.endDateTime ? new Date(parsed.endDateTime) : null,
            location: parsed.location,
            rawEmailContent: email.content,
            emailSubject: email.subject,
            senderEmail: email.from,
            parsedDataJson: parsed.extractedData,
            status: 'pending',
            confidence: parsed.confidence,
            source: 'gmail',
            sourceMessageId: email.messageId,
          },
        });

        parsedBookings.push({
          id: booking.id,
          bookingType: booking.bookingType,
          title: booking.title,
          startDateTime: booking.startDateTime,
          confidence: booking.confidence,
        });
      } catch (parseError) {
        console.error(`Failed to parse email ${email.messageId}:`, parseError);
      }
    }

    return res.json({
      success: true,
      scannedCount: emails.length,
      parsedCount: parsedBookings.length,
      bookings: parsedBookings,
    });
  } catch (error) {
    console.error('Gmail scan error:', error);
    return res.status(500).json({ error: 'Failed to scan Gmail inbox' });
  }
});

/**
 * POST /api/email-import/gmail/disconnect
 * Disconnect Gmail account
 */
router.post('/gmail/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await disconnectGmail(userId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

// ===== Outlook OAuth Routes =====

/**
 * GET /api/email-import/outlook/auth
 * Initiate Outlook OAuth flow
 */
router.get('/outlook/auth', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const authUrl = await getOutlookAuthUrl(userId);

    return res.json({ authUrl });
  } catch (error) {
    console.error('Outlook auth URL error:', error);
    return res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/email-import/outlook/callback
 * Handle Outlook OAuth callback
 */
router.get('/outlook/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const result = await handleOutlookCallback(code as string, state as string);

    // Redirect to frontend with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings?outlook_connected=true&email=${encodeURIComponent(result.email)}`);
  } catch (error) {
    console.error('Outlook callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings?outlook_error=true`);
  }
});

/**
 * GET /api/email-import/outlook/status
 * Check Outlook connection status
 */
router.get('/outlook/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const connection = await prisma.emailConnection.findFirst({
      where: {
        userId,
        provider: 'outlook',
      },
      select: {
        email: true,
        status: true,
        lastSyncedAt: true,
        syncEnabled: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      email: connection.email,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
      syncEnabled: connection.syncEnabled,
      createdAt: connection.createdAt,
    });
  } catch (error) {
    console.error('Outlook status error:', error);
    return res.status(500).json({ error: 'Failed to check Outlook status' });
  }
});

/**
 * POST /api/email-import/outlook/scan
 * Scan Outlook inbox for booking emails and parse them
 */
router.post('/outlook/scan', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Scan Outlook inbox
    const emails = await scanOutlookInbox(userId);

    // Parse each email and save to database (same logic as Gmail)
    const parsedBookings = [];

    for (const email of emails) {
      // Check if already processed (by message ID)
      const existing = await prisma.parsedBooking.findFirst({
        where: {
          userId,
          sourceMessageId: email.messageId,
        },
      });

      if (existing) {
        console.log(`Email ${email.messageId} already processed, skipping`);
        continue;
      }

      // Quick filter
      if (!isLikelyBookingEmail(email.subject, email.from)) {
        continue;
      }

      try {
        // Parse email content
        const parsed = await parseEmailContent(email.content, email.subject, email.from);

        if (!parsed || parsed.confidence < 0.5) {
          console.log(`Low confidence for email ${email.messageId}, skipping`);
          continue;
        }

        // Save to database
        const booking = await prisma.parsedBooking.create({
          data: {
            userId,
            bookingType: parsed.bookingType,
            title: parsed.title,
            description: parsed.description,
            confirmationNumber: parsed.confirmationNumber,
            bookingDate: parsed.bookingDate ? new Date(parsed.bookingDate) : null,
            startDateTime: parsed.startDateTime ? new Date(parsed.startDateTime) : null,
            endDateTime: parsed.endDateTime ? new Date(parsed.endDateTime) : null,
            location: parsed.location,
            rawEmailContent: email.content,
            emailSubject: email.subject,
            senderEmail: email.from,
            parsedDataJson: parsed.extractedData,
            status: 'pending',
            confidence: parsed.confidence,
            source: 'outlook',
            sourceMessageId: email.messageId,
          },
        });

        parsedBookings.push({
          id: booking.id,
          bookingType: booking.bookingType,
          title: booking.title,
          startDateTime: booking.startDateTime,
          confidence: booking.confidence,
        });
      } catch (parseError) {
        console.error(`Failed to parse email ${email.messageId}:`, parseError);
      }
    }

    return res.json({
      success: true,
      scannedCount: emails.length,
      parsedCount: parsedBookings.length,
      bookings: parsedBookings,
    });
  } catch (error) {
    console.error('Outlook scan error:', error);
    return res.status(500).json({ error: 'Failed to scan Outlook inbox' });
  }
});

/**
 * POST /api/email-import/outlook/disconnect
 * Disconnect Outlook account
 */
router.post('/outlook/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await disconnectOutlook(userId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Outlook disconnect error:', error);
    return res.status(500).json({ error: 'Failed to disconnect Outlook' });
  }
});

export default router;
