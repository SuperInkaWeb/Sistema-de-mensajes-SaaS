import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import instanceRoutes from './routes/instance.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import noteRoutes from './routes/note.routes';
import agentRoutes from './routes/agent.routes';
import groupRoutes from './routes/group.routes';
import contactRoutes from './routes/contact.routes';
import activityRoutes from './routes/activity.routes';
import statsRoutes from './routes/stats.routes';
import reportRoutes from './routes/report.routes';
import { errorHandler } from './middleware/error.middleware';
import { setupSocketIO } from './socket/socket.handler';
import { setSocketIO, restoreAllSessions } from './services/whatsapp.service';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Make io accessible globally
app.set('io', io);

// Inject io into whatsapp service (avoids circular import)
setSocketIO(io);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/contacts', activityRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Setup Socket.io handlers
setupSocketIO(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.io ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    // Restore persisted WhatsApp sessions after server is ready
    restoreAllSessions().catch(console.error);
});

export { io };
export default app;
