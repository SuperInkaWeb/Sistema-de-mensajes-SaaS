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

interface ProfileForm {
    name: string;
    email: string;
    companyName: string;
    password: string;
    confirmPassword: string;
}

interface AgentForm {
    name: string;
    email: string;
    password: string;
    whatsappPhone: string;
}

const emptyAgent: AgentForm = { name: '', email: '', password: '', whatsappPhone: '' };

export default function ControlPanel({ standalone = false }: { standalone?: boolean }) {
    const [open, setOpen] = useState(standalone);
    const [activeTab, setActiveTab] = useState<'perfil' | 'agentes'>('perfil');
    const { user, setAuth, token } = useAuthStore();

    // Profile
    const [profile, setProfile] = useState<ProfileForm>({
        name: user?.name || '',
        email: user?.email || '',
        companyName: user?.companyName || '',
        password: '',
        confirmPassword: '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Agents
    const [agents, setAgents] = useState<Agent[]>([]);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [showAgentForm, setShowAgentForm] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [agentForm, setAgentForm] = useState<AgentForm>(emptyAgent);
    const [agentFormLoading, setAgentFormLoading] = useState(false);
    const [agentMsg, setAgentMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const isAdmin = user?.role === 'admin';

    const fetchAgents = async () => {
        if (!isAdmin) return;
        setAgentsLoading(true);
        try {
            const { data } = await api.get('/agents');
            setAgents(data.agents);
        } catch { /* ignore */ } finally {
            setAgentsLoading(false);
        }
    };

    useEffect(() => {
        if (open && activeTab === 'agentes') fetchAgents();
    }, [open, activeTab]);

    useEffect(() => {
        if (open) {
            setProfile({ name: user?.name || '', email: user?.email || '', companyName: user?.companyName || '', password: '', confirmPassword: '' });
        }
    }, [open]);

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg(null);
        if (profile.password && profile.password !== profile.confirmPassword) {
            setProfileMsg({ type: 'err', text: 'Las contraseñas no coinciden' });
            return;
        }
        setProfileLoading(true);
        try {
            const body: any = { name: profile.name, email: profile.email };
            if (profile.companyName) body.companyName = profile.companyName;
            if (profile.password) body.password = profile.password;
            const { data } = await api.patch('/auth/profile', body);
            setAuth(token!, data.user);
            setProfileMsg({ type: 'ok', text: '✅ Datos actualizados correctamente' });
            setProfile(p => ({ ...p, password: '', confirmPassword: '' }));
        } catch (err: any) {
            setProfileMsg({ type: 'err', text: err.response?.data?.error || 'Error al guardar' });
        } finally {
            setProfileLoading(false);
        }
    };

    const openCreateAgent = () => {
        setEditingAgent(null);
        setAgentForm(emptyAgent);
        setAgentMsg(null);
        setShowAgentForm(true);
    };

    const openEditAgent = (agent: Agent) => {
        setEditingAgent(agent);
        setAgentForm({ name: agent.name, email: agent.email, password: '', whatsappPhone: agent.whatsappPhone || '' });
        setAgentMsg(null);
        setShowAgentForm(true);
    };

    const saveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        setAgentFormLoading(true);
        setAgentMsg(null);
        try {
            if (editingAgent) {
                await api.patch(`/agents/${editingAgent.id}`, {
                    name: agentForm.name,
                    whatsappPhone: agentForm.whatsappPhone || null,
                    ...(agentForm.password ? { password: agentForm.password } : {}),
                });
            } else {
                await api.post('/agents', agentForm);
            }
            setShowAgentForm(false);
            setAgentMsg({ type: 'ok', text: editingAgent ? '✅ Agente actualizado' : '✅ Agente creado' });
            fetchAgents();
        } catch (err: any) {
            setAgentMsg({ type: 'err', text: err.response?.data?.error || 'Error al guardar agente' });
        } finally {
            setAgentFormLoading(false);
        }
    };

    const toggleAgent = async (agent: Agent) => {
        try {
            await api.patch(`/agents/${agent.id}`, { isActive: !agent.isActive });
            fetchAgents();
        } catch { /* ignore */ }
    };

    const deleteAgent = async (id: string) => {
        if (!confirm('¿Eliminar este agente?')) return;
        try {
            await api.delete(`/agents/${id}`);
            fetchAgents();
        } catch { /* ignore */ }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <>
            {/* Sidebar icon button */}
            <button
                id="control-panel-btn"
                onClick={() => setOpen(true)}
                title="Panel de Control"
                style={{
                    width: '40px', height: '40px',
                    borderRadius: '10px',
                    border: 'none',
                    background: open ? '#16a34a' : 'transparent',
                    color: open ? '#ffffff' : '#8b949e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                    if (!open) {
                        (e.currentTarget as HTMLElement).style.background = '#21262d';
                        (e.currentTarget as HTMLElement).style.color = '#e6edf3';
                    }
                }}
                onMouseLeave={e => {
                    if (!open) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#8b949e';
                    }
                }}
            >
                {/* Book icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </button>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sliding Panel (book-style from left) */}
            <div className={`fixed top-0 left-0 h-full w-[480px] bg-dark-800 border-r border-dark-600 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-dark-600 bg-dark-900/80">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-600/20 border border-brand-600/40 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">Panel de Control</h2>
                            <p className="text-gray-400 text-xs">{user?.companyName}</p>
                        </div>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-dark-600">
                    {[
                        { key: 'perfil', label: '👤 Mi Perfil' },
                        ...(isAdmin ? [{ key: 'agentes', label: '👥 Sub Cuentas' }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex-1 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${activeTab === tab.key
                                ? 'text-brand-400 border-brand-500 bg-brand-600/5'
                                : 'text-gray-400 border-transparent hover:text-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ── PERFIL TAB ── */}
                    {activeTab === 'perfil' && (
                        <div>
                            {/* Avatar card */}
                            <div className="bg-gradient-to-r from-brand-900/40 to-dark-700 border border-brand-700/30 rounded-2xl p-5 mb-6 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-lg">{user?.name}</p>
                                    <p className="text-gray-400 text-sm">{user?.email}</p>
                                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${user?.role === 'admin'
                                        ? 'bg-brand-900/60 text-brand-300 border border-brand-700/40'
                                        : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {user?.role === 'admin' ? '⚡ Administrador' : '👤 Agente'}
                                    </span>
                                </div>
                            </div>

                            {profileMsg && (
                                <div className={`px-4 py-3 rounded-xl text-sm mb-4 border ${profileMsg.type === 'ok'
                                    ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400'
                                    : 'bg-red-900/30 border-red-700/50 text-red-400'
                                    }`}>{profileMsg.text}</div>
                            )}

                            <form onSubmit={saveProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre completo</label>
                                    <input id="profile-name" className="input-field" value={profile.name}
                                        onChange={e => setProfile({ ...profile, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                                    <input id="profile-email" type="email" className="input-field" value={profile.email}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })} required />
                                </div>
                                {isAdmin && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre de la empresa</label>
                                        <input id="profile-company" className="input-field" value={profile.companyName}
                                            onChange={e => setProfile({ ...profile, companyName: e.target.value })} />
                                    </div>
                                )}
                                <div className="border-t border-dark-600 pt-4">
                                    <p className="text-sm font-medium text-gray-400 mb-3">🔒 Cambiar contraseña <span className="text-gray-600">(opcional)</span></p>
                                    <div className="space-y-3">
                                        <input id="profile-password" type="password" className="input-field" placeholder="Nueva contraseña"
                                            value={profile.password} onChange={e => setProfile({ ...profile, password: e.target.value })} />
                                        <input id="profile-confirm" type="password" className="input-field" placeholder="Confirmar contraseña"
                                            value={profile.confirmPassword} onChange={e => setProfile({ ...profile, confirmPassword: e.target.value })} />
                                    </div>
                                </div>
                                <button id="save-profile-btn" type="submit" disabled={profileLoading} className="btn-primary w-full mt-2">
                                    {profileLoading ? 'Guardando...' : '💾 Guardar cambios'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── AGENTES TAB ── */}
                    {activeTab === 'agentes' && isAdmin && (
                        <div>
                            {agentMsg && (
                                <div className={`px-4 py-3 rounded-xl text-sm mb-4 border ${agentMsg.type === 'ok'
                                    ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400'
                                    : 'bg-red-900/30 border-red-700/50 text-red-400'
                                    }`}>{agentMsg.text}</div>
                            )}

                            {/* Create agent form */}
                            {showAgentForm ? (
                                <div className="bg-dark-700 border border-dark-500 rounded-2xl p-5 mb-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-white">{editingAgent ? 'Editar Agente' : '+ Nueva Subcuenta'}</h3>
                                        <button onClick={() => setShowAgentForm(false)} className="text-gray-500 hover:text-white">✕</button>
                                    </div>
                                    <form onSubmit={saveAgent} className="space-y-3">
                                        <input id="af-name" className="input-field text-sm" placeholder="Nombre completo"
                                            value={agentForm.name} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} required />
                                        {!editingAgent && (
                                            <input id="af-email" type="email" className="input-field text-sm" placeholder="Email"
                                                value={agentForm.email} onChange={e => setAgentForm({ ...agentForm, email: e.target.value })} required />
                                        )}
                                        <input id="af-password" type="password" className="input-field text-sm"
                                            placeholder={editingAgent ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}
                                            value={agentForm.password} onChange={e => setAgentForm({ ...agentForm, password: e.target.value })}
                                            required={!editingAgent} />
                                        <input id="af-phone" className="input-field text-sm" placeholder="📱 Nº WhatsApp (ej: +51987654321)"
                                            value={agentForm.whatsappPhone} onChange={e => setAgentForm({ ...agentForm, whatsappPhone: e.target.value })} />
                                        <div className="flex gap-2 pt-1">
                                            <button type="button" onClick={() => setShowAgentForm(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                                            <button id="af-save" type="submit" disabled={agentFormLoading} className="btn-primary flex-1 text-sm">
                                                {agentFormLoading ? 'Guardando...' : editingAgent ? 'Guardar' : 'Crear agente'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <button id="new-agent-btn" onClick={openCreateAgent} className="btn-primary w-full mb-4 flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Nueva Subcuenta / Agente
                                </button>
                            )}

                            {/* Agents list */}
                            {agentsLoading ? (
                                <div className="text-center text-gray-500 py-8">Cargando agentes...</div>
                            ) : agents.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <div className="text-3xl mb-2">👤</div>
                                    <p className="text-sm">Aún no hay agentes registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Historial de Subcuentas ({agents.length})</p>
                                    {agents.map((agent) => (
                                        <div key={agent.id} className="bg-dark-700 border border-dark-500 rounded-xl p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center text-brand-400 font-bold">
                                                        {agent.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-white text-sm truncate">{agent.name}</p>
                                                        <p className="text-gray-400 text-xs truncate">{agent.email}</p>
                                                        {agent.whatsappPhone && (
                                                            <p className="text-green-400 text-xs mt-0.5">📱 {agent.whatsappPhone}</p>
                                                        )}
                                                        <p className="text-gray-600 text-xs mt-1">Creado: {formatDate(agent.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${agent.isActive
                                                        ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40'
                                                        : 'bg-red-900/40 text-red-400 border-red-700/40'
                                                        }`}>
                                                        {agent.isActive ? '● Activo' : '● Inactivo'}
                                                    </span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openEditAgent(agent)}
                                                            className="text-xs bg-dark-600 hover:bg-dark-500 text-gray-300 px-2 py-1 rounded-lg transition-colors">
                                                            Editar
                                                        </button>
                                                        <button onClick={() => toggleAgent(agent)}
                                                            className="text-xs bg-dark-600 hover:bg-dark-500 text-gray-300 px-2 py-1 rounded-lg transition-colors">
                                                            {agent.isActive ? 'Off' : 'On'}
                                                        </button>
                                                        <button onClick={() => deleteAgent(agent.id)}
                                                            className="text-xs bg-red-900/40 hover:bg-red-800/50 text-red-400 px-2 py-1 rounded-lg transition-colors">
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
