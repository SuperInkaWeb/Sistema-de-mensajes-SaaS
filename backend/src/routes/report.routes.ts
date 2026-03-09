import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// GET /api/reports
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { companyId, role, id: userId } = req.user!;
        const reports = await prisma.dailyReport.findMany({
            where: {
                companyId,
                ...(role !== 'admin' ? { userId } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { reportDate: 'desc' },
        });
        res.json(reports);
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Error al obtener informes' });
    }
});

// POST /api/reports
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { companyId, id: userId } = req.user!;
        const {
            reportDate, zone, businessType, companiesVisited,
            contactName, contactPhone, contactEmail, contactRole,
            contactsMade, meetingsHeld, proposalsSent, mainObjection,
            whatWorked, whatToImprove, status, planPurchased, nextStep,
        } = req.body;

        const report = await prisma.dailyReport.create({
            data: {
                companyId,
                userId,
                reportDate: new Date(reportDate),
                zone, businessType, companiesVisited,
                contactName, contactPhone, contactEmail, contactRole,
                contactsMade: contactsMade ? Number(contactsMade) : null,
                meetingsHeld: meetingsHeld ? Number(meetingsHeld) : null,
                proposalsSent: proposalsSent ? Number(proposalsSent) : null,
                mainObjection, whatWorked, whatToImprove,
                status: status || 'pendiente',
                planPurchased, nextStep,
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        res.status(201).json(report);
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Error al crear informe' });
    }
});

// GET /api/reports/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { companyId, role, id: userId } = req.user!;
        const report = await prisma.dailyReport.findFirst({
            where: {
                id: req.params.id,
                companyId,
                ...(role !== 'admin' ? { userId } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener informe' });
    }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { companyId, role, id: userId } = req.user!;
        const report = await prisma.dailyReport.findFirst({
            where: { id: req.params.id, companyId, ...(role !== 'admin' ? { userId } : {}) },
        });
        if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
        await prisma.dailyReport.delete({ where: { id: req.params.id } });
        res.json({ message: 'Informe eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar informe' });
    }
});

export default router;
