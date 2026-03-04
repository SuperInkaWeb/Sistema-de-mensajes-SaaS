import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/stats/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const companyId = req.user!.companyId;

        const [totalMessages, totalContacts, activeSessions, agents] = await Promise.all([
            prisma.message.count({
                where: { chat: { whatsappSession: { companyId } } }
            }),
            prisma.contact.count({
                where: { companyId }
            }),
            prisma.whatsappSession.count({
                where: { companyId, sessionStatus: 'connected' }
            }),
            prisma.user.findMany({
                where: { companyId, role: 'AGENT' },
                select: { id: true, name: true }
            })
        ]);

        const agentPerformance = await Promise.all(agents.map(async (agent) => {
            const [msgCount, contactCount] = await Promise.all([
                prisma.message.count({
                    where: { chat: { whatsappSession: { userId: agent.id } } }
                }),
                prisma.contact.count({
                    where: { companyId, agentUserId: agent.id }
                })
            ]);
            return {
                name: agent.name,
                messagesReceived: msgCount,
                contactsOwned: contactCount
            };
        }));

        res.json({
            totalMessages,
            totalContacts,
            activeSessions,
            agentPerformance
        });
    } catch (err) {
        console.error('Error in stats dashboard:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
