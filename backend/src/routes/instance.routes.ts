import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import {
    createWhatsAppSession,
    disconnectSession,
    getSessionStatus,
} from '../services/whatsapp.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/instances - List all sessions for the company
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const where: any = { companyId: req.user!.companyId };

        // Todos los usuarios ven sus propias sesiones
        where.userId = req.user!.id;


        const sessions = await prisma.whatsappSession.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        // Add live connection status
        const sessionsWithStatus = sessions.map((s) => ({
            ...s,
            isConnected: getSessionStatus(s.id),
        }));

        res.json({ sessions: sessionsWithStatus });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// POST /api/instances - Create a new WhatsApp session
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sessionName, campaignType } = req.body;

        if (!sessionName) {
            res.status(400).json({ error: 'Session name is required' });
            return;
        }

        const validCampaigns = ['general', 'quejas', 'eventos', 'premium', 'standard', 'invitados'];
        const session = await prisma.whatsappSession.create({
            data: {
                companyId: req.user!.companyId,
                userId: req.user!.id,
                sessionName,
                sessionStatus: 'disconnected',
                campaignType: validCampaigns.includes(campaignType) ? campaignType : 'general',
            },
        });

        // Start the WhatsApp connection (will emit QR via socket)
        createWhatsAppSession(session.id, req.user!.companyId, req.user!.id).catch(console.error);


        res.status(201).json({ session });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// DELETE /api/instances/:id - Disconnect and remove a session
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const where: any = {
            id: req.params.id,
            companyId: req.user!.companyId,
            userId: req.user!.id,
        };

        const session = await prisma.whatsappSession.findFirst({
            where,
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        await disconnectSession(session.id);

        await prisma.whatsappSession.delete({ where: { id: session.id } });

        res.json({ message: 'Session disconnected and removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove session' });
    }
});

// POST /api/instances/:id/reconnect
router.post('/:id/reconnect', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const where: any = {
            id: req.params.id,
            companyId: req.user!.companyId,
            userId: req.user!.id,
        };

        const session = await prisma.whatsappSession.findFirst({
            where,
        });

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        createWhatsAppSession(session.id, session.companyId, session.userId || undefined).catch(console.error);

        res.json({ message: 'Reconnection initiated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reconnect' });
    }
});

export default router;

