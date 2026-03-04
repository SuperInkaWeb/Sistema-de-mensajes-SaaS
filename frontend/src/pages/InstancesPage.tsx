import { useEffect, useState } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { QRCodeSVG } from 'qrcode.react';

interface Session {
    id: string;
    sessionName: string;
    phoneNumber: string | null;
    sessionStatus: string;
    qrCodeString: string | null;
    isConnected: boolean;
}

export default function InstancesPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [showForm, setShowForm] = useState(false);

    const fetchSessions = async () => {
        try {
            const { data } = await api.get('/instances');
            setSessions(data.sessions);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();

        const socket = getSocket();

        // Listen for QR code updates
        socket.on('qr_code', ({ sessionId, qr }: { sessionId: string; qr: string }) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, qrCodeString: qr, sessionStatus: 'qr_ready' } : s
                )
            );
        });

        // Listen for session status changes
        socket.on('session_status', ({ sessionId, status, phoneNumber }: { sessionId: string; status: string; phoneNumber?: string }) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId
                        ? { ...s, sessionStatus: status, phoneNumber: phoneNumber || s.phoneNumber, qrCodeString: status === 'connected' ? null : s.qrCodeString, isConnected: status === 'connected' }
                        : s
                )
            );
        });

        return () => {
            socket.off('qr_code');
            socket.off('session_status');
        };
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSessionName.trim()) return;

        setCreating(true);
        try {
            const { data } = await api.post('/instances', { sessionName: newSessionName });
            setSessions((prev) => [...prev, { ...data.session, isConnected: false }]);
            setNewSessionName('');
            setShowForm(false);
        } catch (err) {
            console.error('Failed to create session:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm('¿Eliminar esta sesión de WhatsApp?')) return;
        try {
            await api.delete(`/instances/${sessionId}`);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const handleReconnect = async (sessionId: string) => {
        try {
            await api.post(`/instances/${sessionId}/reconnect`);
        } catch (err) {
            console.error('Failed to reconnect:', err);
        }
    };

    const getStatusBadge = (session: Session) => {
        if (session.sessionStatus === 'connected') {
            return (
                <span className="badge-connected">
                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
                    Conectado
                </span>
            );
        }
        if (session.sessionStatus === 'qr_ready') {
            return (
                <span className="badge-qr">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                    Escanear QR
                </span>
            );
        }
        return (
            <span className="badge-disconnected">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                Desconectado
            </span>
        );
    };

    return (
        <div className="h-full overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Sesiones de WhatsApp</h1>
                        <p className="text-gray-400 mt-1">Gestiona los números conectados a tu empresa</p>
                    </div>
                    <button
                        id="add-instance-btn"
                        onClick={() => setShowForm(!showForm)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar WhatsApp
                    </button>
                </div>

                {/* Add session form */}
                {showForm && (
                    <div className="card mb-6 border-brand-700/30">
                        <h3 className="text-lg font-semibold text-white mb-4">Nueva Sesión</h3>
                        <form onSubmit={handleCreate} className="flex gap-3">
                            <input
                                id="session-name-input"
                                type="text"
                                className="input-field flex-1"
                                placeholder="Ej: Ventas, Soporte, Marketing..."
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                required
                            />
                            <button
                                id="create-session-btn"
                                type="submit"
                                disabled={creating}
                                className="btn-primary"
                            >
                                {creating ? 'Creando...' : 'Crear'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                        </form>
                        <p className="text-xs text-gray-500 mt-2">
                            Se generará un código QR para escanear con tu teléfono
                        </p>
                    </div>
                )}

                {/* Sessions grid */}
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Sin sesiones</h3>
                        <p className="text-gray-500 text-sm">Agrega tu primer número de WhatsApp</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sessions.map((session) => (
                            <div key={session.id} className="card">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-white text-lg">{session.sessionName}</h3>
                                        {session.phoneNumber && (
                                            <p className="text-sm text-gray-400 mt-0.5">+{session.phoneNumber}</p>
                                        )}
                                    </div>
                                    {getStatusBadge(session)}
                                </div>

                                {/* QR Code display */}
                                {session.sessionStatus === 'qr_ready' && session.qrCodeString && (
                                    <div className="flex flex-col items-center py-4 bg-white rounded-xl mb-4">
                                        <QRCodeSVG
                                            value={session.qrCodeString}
                                            size={200}
                                            level="M"
                                        />
                                        <p className="text-dark-900 text-xs font-medium mt-3">
                                            Escanea con WhatsApp en tu teléfono
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 mt-2">
                                    {session.sessionStatus === 'disconnected' && (
                                        <button
                                            onClick={() => handleReconnect(session.id)}
                                            className="btn-secondary text-sm flex-1"
                                        >
                                            Reconectar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="btn-danger text-sm"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
