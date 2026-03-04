import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { sendTextMessage, activeSessions, addGroupMember, getIO } from '../services/whatsapp.service';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

// GET /api/contacts - Listar contactos de la empresa
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const where: any = { companyId: req.user!.companyId };
        // Todos los usuarios ven sus propios contactos o los que no tienen dueño (migración)
        where.OR = [
            { agentUserId: req.user!.id },
            { agentUserId: null }
        ];
        console.log('[GET /api/contacts] Filtro aplicado:', JSON.stringify(where));

        const contacts = await (prisma as any).contact.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.json({ contacts });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener contactos' });
    }
});


// POST /api/contacts - Crear contacto
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    console.log('[POST /api/contacts] Iniciando creación:', req.body);
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            console.log('[POST /api/contacts] Faltan campos:', { name, phone });
            res.status(400).json({ error: 'Nombre y teléfono son requeridos' });
            return;
        }

        // Limpiar teléfono (solo números)
        const cleanPhone = phone.replace(/\D/g, '');
        console.log('[POST /api/contacts] Teléfono limpio:', cleanPhone);

        const contact = await (prisma as any).contact.upsert({
            where: {
                companyId_phone: {
                    companyId: req.user!.companyId,
                    phone: cleanPhone,
                },
            },
            update: { name },
            create: {
                companyId: req.user!.companyId,
                name,
                phone: cleanPhone,
                agentUserId: req.user!.id,
                isAgent: false,
            },

        });

        console.log('[POST /api/contacts] Contacto guardado:', contact.id);
        res.status(201).json({ contact });
    } catch (error: any) {
        console.error('[POST /api/contacts] Error crítico:', error);
        res.status(500).json({
            error: error.message || 'Error al crear contacto',
            details: error.stack
        });
    }
});

// DELETE /api/contacts/:id - Eliminar contacto
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const contact = await (prisma as any).contact.findFirst({
            where: { id: req.params.id, companyId: req.user!.companyId, agentUserId: req.user!.id },
        });

        if (!contact) {
            res.status(404).json({ error: 'Contacto no encontrado' });
            return;
        }

        await (prisma as any).contact.delete({ where: { id: req.params.id } });
        res.json({ message: 'Contacto eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar contacto' });
    }
});

// POST /api/contacts/:id/message - Enviar mensaje WhatsApp
router.post('/:id/message', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { text } = req.body;
        if (!text) {
            res.status(400).json({ error: 'El mensaje es requerido' });
            return;
        }

        const contact = await (prisma as any).contact.findFirst({
            where: { id: req.params.id, companyId: req.user!.companyId, agentUserId: req.user!.id },
        });

        if (!contact) {
            res.status(404).json({ error: 'Contacto no encontrado' });
            return;
        }

        // Buscar una sesión activa propiamente del usuario actual
        const session = await prisma.whatsappSession.findFirst({
            where: {
                companyId: req.user!.companyId,
                userId: req.user!.id,
                sessionStatus: 'connected'
            },
        });

        if (!session) {
            res.status(400).json({ error: 'No hay ninguna sesión de WhatsApp conectada para enviar mensajes' });
            return;
        }

        const remoteJid = `${contact.phone}@s.whatsapp.net`;
        await sendTextMessage(session.id, remoteJid, text);

        // Guardar/Actualizar chat en la DB para que aparezca en la bandeja
        const chat = await prisma.chat.upsert({
            where: {
                whatsappSessionId_remoteJid: {
                    whatsappSessionId: session.id,
                    remoteJid,
                },
            },
            update: {
                lastMessagePreview: text,
                lastMessageAt: new Date(),
                contactName: contact.name,
            },
            create: {
                whatsappSessionId: session.id,
                remoteJid,
                contactName: contact.name,
                lastMessagePreview: text,
                lastMessageAt: new Date(),
            },
        });

        // Guardar el mensaje propiamente
        const savedMessage = await prisma.message.create({
            data: {
                chatId: chat.id,
                senderId: req.user!.id,
                content: text,
                messageType: 'text',
                timestamp: new Date(),
                fromMe: true,
            },
        });

        // Emitir vía socket para que aparezca en la bandeja en tiempo real
        getIO().to(`company:${req.user!.companyId}`).emit('new_message', {
            message: savedMessage,
            chat,
        });

        res.json({ message: 'Mensaje enviado correctamente' });
    } catch (error: any) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ error: error.message || 'Error al enviar mensaje' });
    }
});

// POST /api/contacts/:id/group - Agregar contacto a un grupo
router.post('/:id/group', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.body;
        if (!groupId) {
            res.status(400).json({ error: 'El ID del grupo es requerido' });
            return;
        }

        const contact = await (prisma as any).contact.findFirst({
            where: { id: req.params.id, companyId: req.user!.companyId, agentUserId: req.user!.id },
        });

        if (!contact) {
            res.status(404).json({ error: 'Contacto no encontrado' });
            return;
        }

        const group = await prisma.whatsappGroup.findFirst({
            where: { id: groupId, companyId: req.user!.companyId },
        });

        if (!group) {
            res.status(404).json({ error: 'Grupo no encontrado' });
            return;
        }

        await addGroupMember(group.sessionId, group.groupJid, contact.phone);

        // Guardar en la DB
        await prisma.whatsappGroupMember.upsert({
            where: {
                groupId_phone: {
                    groupId: group.id,
                    phone: contact.phone,
                },
            },
            update: {},
            create: {
                groupId: group.id,
                phone: contact.phone,
                name: contact.name,
                joinedAt: new Date(),
            },
        });

        res.json({ message: 'Contacto agregado al grupo correctamente' });
    } catch (error: any) {
        console.error('Error al agregar al grupo:', error);
        res.status(500).json({ error: error.message || 'Error al agregar al grupo' });
    }
});

// POST /api/contacts/:id/promote - Promover a subagente
router.post('/:id/promote', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email y contraseña son requeridos para crear la cuenta de agente' });
            return;
        }

        const contact = await (prisma as any).contact.findFirst({
            where: { id: req.params.id, companyId: req.user!.companyId, agentUserId: req.user!.id },
        });

        if (!contact) {
            res.status(404).json({ error: 'Contacto no encontrado' });
            return;
        }

        if (contact.isAgent) {
            res.status(400).json({ error: 'Este contacto ya es un agente' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Crear usuario agente
        const newUser = await prisma.user.create({
            data: {
                companyId: req.user!.companyId,
                name: contact.name,
                email,
                passwordHash,
                role: 'agent',
                whatsappPhone: contact.phone,
                parentId: req.user!.id,
            },
        });

        // Marcar contacto como agente
        const updatedContact = await (prisma as any).contact.update({
            where: { id: contact.id },
            data: {
                isAgent: true,
                agentUserId: newUser.id,
            },
        });

        res.json({ contact: updatedContact, user: { id: newUser.id, email: newUser.email } });
    } catch (error: any) {
        console.error('Error al promover contacto:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'El email ya está en uso' });
        } else {
            res.status(500).json({ error: 'Error al promover contacto' });
        }
    }
});

// PATCH /api/contacts/:id - Update contact details (tags, notes, kanbanStatus)
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { tags, notes, name, kanbanStatus } = req.body;
        const { id } = req.params;

        // Fetch current contact first to detect status changes
        const oldContact = await (prisma as any).contact.findFirst({
            where: { id, companyId: req.user!.companyId }
        });

        if (!oldContact) {
            res.status(404).json({ error: 'Contacto no encontrado' });
            return;
        }

        const contact = await (prisma as any).contact.update({
            where: { id },
            data: { tags, notes, name, kanbanStatus }
        });

        // Auto-log status change activity
        if (kanbanStatus && kanbanStatus !== oldContact.kanbanStatus) {
            const stageNames: Record<string, string> = {
                lead: 'Lead',
                interesado: 'Interesado',
                presupuesto: 'Presupuesto',
                cerrado: 'Cerrado',
                none: 'Sin etapa'
            };
            await (prisma as any).contactActivity.create({
                data: {
                    contactId: id,
                    userId: req.user!.id,
                    type: 'status_change',
                    description: `Movido de "${stageNames[oldContact.kanbanStatus] || oldContact.kanbanStatus}" a "${stageNames[kanbanStatus] || kanbanStatus}"`
                }
            });
        }

        res.json({ contact });
    } catch (err: any) {
        console.error('Error updating contact:', err);
        res.status(500).json({ error: 'Error al actualizar contacto' });
    }
});

export default router;
