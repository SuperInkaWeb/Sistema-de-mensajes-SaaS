import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';


interface Agent {
    id: string;
    name: string;
    email: string;
    whatsappPhone: string | null;
    isActive: boolean;
    role: string;
    createdAt: string;
}

interface AgentFormData {
    name: string;
    email: string;
    password: string;
    whatsappPhone: string;
}

const emptyForm: AgentFormData = { name: '', email: '', password: '', whatsappPhone: '' };

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [form, setForm] = useState<AgentFormData>(emptyForm);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAgents = async () => {
        try {
            const { data } = await api.get('/agents');
            setAgents(data.agents);
        } catch {
            setError('Error al cargar agentes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAgents(); }, []);

    const openCreate = () => {
        setEditingAgent(null);
        setForm(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEdit = (agent: Agent) => {
        setEditingAgent(agent);
        setForm({ name: agent.name, email: agent.email, password: '', whatsappPhone: agent.whatsappPhone || '' });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        try {
            if (editingAgent) {
                await api.patch(`/agents/${editingAgent.id}`, {
                    name: form.name,
                    whatsappPhone: form.whatsappPhone || null,
                    ...(form.password ? { password: form.password } : {}),
                });
            } else {
                await api.post('/agents', form);
            }
            setShowModal(false);
            fetchAgents();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al guardar agente');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleActive = async (agent: Agent) => {
        try {
            await api.patch(`/agents/${agent.id}`, { isActive: !agent.isActive });
            fetchAgents();
        } catch { /* silently ignore */ }
    };

    const deleteAgent = async (id: string) => {
        if (!confirm('¿Eliminar este agente?')) return;
        try {
            await api.delete(`/agents/${id}`);
            fetchAgents();
        } catch { /* silently ignore */ }
    };

    const campaignColors: Record<string, string> = {
        active: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40',
        inactive: 'bg-red-900/40 text-red-400 border-red-700/40',
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">👥 Subcuentas / Agentes</h1>
                    <p className="text-gray-400 text-sm mt-1">Gestiona los agentes de tu empresa</p>
                </div>
                <button id="create-agent-btn" onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Agente
                </button>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-12">Cargando agentes...</div>
            ) : agents.length === 0 ? (
                <div className="card text-center py-12">
                    <div className="text-4xl mb-3">👤</div>
                    <p className="text-gray-400">No hay agentes creados aún.</p>
                    <button onClick={openCreate} className="btn-primary mt-4">Crear primer agente</button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {agents.map((agent) => (
                        <div key={agent.id} className="card flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center text-brand-400 font-bold text-lg">
                                    {agent.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{agent.name}</p>
                                    <p className="text-sm text-gray-400">{agent.email}</p>
                                    {agent.whatsappPhone && (
                                        <p className="text-xs text-gray-500">📱 {agent.whatsappPhone}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {agent.role === 'agent' && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const { data } = await api.post(`/auth/impersonate/${agent.id}`);
                                                useAuthStore.getState().impersonate(data.token, data.user);
                                            } catch (err: any) {
                                                alert(err.response?.data?.error || 'Error al simular agente');
                                            }
                                        }}
                                        className="btn-primary py-1.5 px-3 text-sm bg-blue-600 hover:bg-blue-700"
                                    >
                                        Acceder como Agente
                                    </button>
                                )}
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${agent.isActive ? campaignColors.active : campaignColors.inactive}`}>
                                    {agent.isActive ? '● Activo' : '● Inactivo'}
                                </span>
                                <button onClick={() => toggleActive(agent)} className="btn-secondary py-1.5 px-3 text-sm">
                                    {agent.isActive ? 'Desactivar' : 'Activar'}
                                </button>
                                <button onClick={() => openEdit(agent)} className="btn-secondary py-1.5 px-3 text-sm">Editar</button>
                                <button onClick={() => deleteAgent(agent.id)} className="btn-danger py-1.5 px-3 text-sm">Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>

            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md">
                        <h2 className="text-xl font-semibold text-white mb-5">
                            {editingAgent ? 'Editar Agente' : 'Crear Nuevo Agente'}
                        </h2>
                        {error && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre completo</label>
                                <input id="agent-name" className="input-field" placeholder="Juan Pérez" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            {!editingAgent && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                                    <input id="agent-email" type="email" className="input-field" placeholder="agente@empresa.com"
                                        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    {editingAgent ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                                </label>
                                <input id="agent-password" type="password" className="input-field" placeholder="••••••••"
                                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required={!editingAgent} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Teléfono WhatsApp (opcional)</label>
                                <input id="agent-phone" className="input-field" placeholder="+51 987 654 321"
                                    value={form.whatsappPhone} onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button id="save-agent-btn" type="submit" disabled={formLoading} className="btn-primary flex-1">
                                    {formLoading ? 'Guardando...' : editingAgent ? 'Guardar cambios' : 'Crear agente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
