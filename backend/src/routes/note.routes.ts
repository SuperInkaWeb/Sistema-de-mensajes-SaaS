import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/notes - Listar notas del usuario autenticado
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const notes = await prisma.note.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ notes });
    } catch {
        res.status(500).json({ error: 'Error al obtener notas' });
    }
});

// POST /api/notes - Crear nueva nota
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { content } = req.body;
        if (!content || content.trim() === '') {
            res.status(400).json({ error: 'El contenido de la nota es requerido' });
            return;
        }
        const note = await prisma.note.create({
            data: { userId: req.user!.id, content: content.trim() },
        });
        res.status(201).json({ note });
    } catch {
        res.status(500).json({ error: 'Error al crear nota' });
    }
});

// DELETE /api/notes/:id - Eliminar nota
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const note = await prisma.note.findFirst({
            where: { id: req.params.id, userId: req.user!.id },
        });
        if (!note) {
            res.status(404).json({ error: 'Nota no encontrada' });
            return;
        }
        await prisma.note.delete({ where: { id: note.id } });
        res.json({ message: 'Nota eliminada' });
    } catch {
        res.status(500).json({ error: 'Error al eliminar nota' });
    }
});

export default router;
