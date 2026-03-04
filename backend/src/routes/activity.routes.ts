import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

const prismaAny = prisma as any;

// GET /api/contacts/:id/activities - Fetch activities for a contact with optional date filter
router.get('/:id/activities', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Verify contact belongs to company
        const contact = await prisma.contact.findFirst({
            where: { id, companyId: req.user!.companyId }
        });
        if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

        const where: any = { contactId: id };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const activities = await prismaAny.contactActivity.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true } }
            }
        });

        // Compute stats
        const calls = activities.filter((a: any) => a.type === 'call');
        const totalCalls = calls.length;
        const totalMinutes = calls.reduce((sum: number, c: any) => sum + (c.duration || 0), 0);

        res.json({ activities, stats: { totalCalls, totalMinutes } });
    } catch (error) {
        console.error('[GET /activities] Error:', error);
        res.status(500).json({ error: 'Error al obtener el historial' });
    }
});

// POST /api/contacts/:id/activities - Create a manual activity (call or note)
router.post('/:id/activities', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { type, description, duration } = req.body;

        if (!type || !description) {
            return res.status(400).json({ error: 'Tipo y descripción son requeridos' });
        }

        // Verify contact belongs to company
        const contact = await prisma.contact.findFirst({
            where: { id, companyId: req.user!.companyId }
        });
        if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

        const activity = await prismaAny.contactActivity.create({
            data: {
                contactId: id,
                userId: req.user!.id,
                type,
                description,
                duration: duration ? parseInt(duration) : null
            },
            include: {
                user: { select: { name: true } }
            }
        });

        res.status(201).json({ activity });
    } catch (error) {
        console.error('[POST /activities] Error:', error);
        res.status(500).json({ error: 'Error al registrar la actividad' });
    }
});

export default router;
