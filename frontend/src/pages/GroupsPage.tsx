import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface Session {
    id: string;
    sessionName: string;
    sessionStatus: string;
    phoneNumber?: string;
}

interface Group {
    id: string;
    name: string;
    groupJid: string;
    inviteCode?: string;
    createdAt: string;
    _count?: { members: number };
}

interface Member {
    id: string;
    phone: string;
    name?: string;
    joinedAt: string;
    isAdmin: boolean;
}

export default function GroupsPage() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    // Sessions
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState('');

    // Groups list
    const [groups, setGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Create group form
    const [showCreate, setShowCreate] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [phones, setPhones] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);
    const [createMsg, setCreateMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    // Group detail
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [members, setMembers] = useState<Record<string, Member[]>>({});
    const [loadingMembers, setLoadingMembers] = useState<string | null>(null);
    const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
    const [loadingInvite, setLoadingInvite] = useState<string | null>(null);
    const [removingMember, setRemovingMember] = useState<string | null>(null);

    useEffect(() => {
        fetchSessions();
        fetchGroups();
    }, []);

    const fetchSessions = async () => {
        try {
            const { data } = await api.get('/instances');
            const connected = data.sessions.filter((s: Session) => s.sessionStatus === 'connected');
            setSessions(connected);
            if (connected.length > 0) setSelectedSession(connected[0].id);
        } catch { /* ignore */ }
    };

    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const { data } = await api.get('/groups');
            setGroups(data.groups || []);
        } catch { /* ignore */ } finally {
            setLoadingGroups(false);
        }
    };

    const addPhone = () => {
        const clean = phoneInput.trim();
        if (!clean) return;
        if (!phones.includes(clean)) setPhones(prev => [...prev, clean]);
        setPhoneInput('');
    };

    const removePhone = (p: string) => setPhones(prev => prev.filter(x => x !== p));

    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSession) { setCreateMsg({ type: 'err', text: 'Selecciona una sesión conectada' }); return; }
        if (phones.length === 0) { setCreateMsg({ type: 'err', text: 'Agrega al menos un número' }); return; }
        setCreating(true);
        setCreateMsg(null);
        try {
            await api.post('/groups', { sessionId: selectedSession, name: groupName, participants: phones });
            setCreateMsg({ type: 'ok', text: '✅ Grupo creado exitosamente' });
            setGroupName('');
            setPhones([]);
            setShowCreate(false);
            fetchGroups();
        } catch (err: any) {
            setCreateMsg({ type: 'err', text: err.response?.data?.error || 'Error al crear grupo' });
        } finally {
            setCreating(false);
        }
    };

    const loadMembers = async (groupId: string) => {
        if (expandedGroup === groupId) { setExpandedGroup(null); return; }
        setExpandedGroup(groupId);
        setLoadingMembers(groupId);
        try {
            const { data } = await api.get(`/groups/${groupId}`);
            setMembers(prev => ({ ...prev, [groupId]: data.group.members || [] }));
        } catch { /* ignore */ } finally {
            setLoadingMembers(null);
        }
    };

    const copyInvite = async (groupId: string) => {
        setLoadingInvite(groupId);
        try {
            const { data } = await api.get(`/groups/${groupId}/invite`);
            setInviteLinks(prev => ({ ...prev, [groupId]: data.link }));
            await navigator.clipboard.writeText(data.link);
            alert('✅ Link copiado al portapapeles:\n' + data.link);
        } catch (err: any) {
            alert('Error: ' + (err.response?.data?.error || 'No se pudo obtener el link'));
        } finally {
            setLoadingInvite(null);
        }
    };

    const removeMember = async (groupId: string, phone: string) => {
        if (!confirm(`¿Expulsar al miembro ${phone} del grupo?`)) return;
        setRemovingMember(phone);
        try {
            await api.delete(`/groups/${groupId}/members/${encodeURIComponent(phone)}`);
            setMembers(prev => ({
                ...prev,
                [groupId]: (prev[groupId] || []).filter(m => m.phone !== phone),
            }));
            setGroups(prev => prev.map(g => g.id === groupId && g._count
                ? { ...g, _count: { members: g._count.members - 1 } }
                : g
            ));
        } catch (err: any) {
            alert('Error: ' + (err.response?.data?.error || 'No se pudo expulsar al miembro'));
        } finally {
            setRemovingMember(null);
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (!isAdmin) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
                    <p>Solo los administradores pueden gestionar grupos.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '28px 32px', maxWidth: '1000px', margin: '0 auto', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>👥 Gestor de Grupos WhatsApp</h1>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Crea y administra grupos desde el panel</p>
                </div>
                <button
                    onClick={() => { setShowCreate(!showCreate); setCreateMsg(null); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: '#fff', fontWeight: '600', fontSize: '13px',
                        boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                    }}
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Grupo
                </button>
            </div>

            {/* Create form */}
            {showCreate && (
                <div style={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>➕ Crear nuevo grupo</h3>

                    {createMsg && (
                        <div style={{
                            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
                            background: createMsg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${createMsg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            color: createMsg.type === 'ok' ? '#4ade80' : '#f87171',
                        }}>{createMsg.text}</div>
                    )}

                    <form onSubmit={createGroup}>
                        {/* Session selector */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                                📱 Sesión WhatsApp conectada
                            </label>
                            {sessions.length === 0 ? (
                                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
                                    ⚠️ No hay sesiones conectadas. Ve a <b>WhatsApp / QR</b> y conecta una instancia.
                                </div>
                            ) : (
                                <select
                                    value={selectedSession}
                                    onChange={e => setSelectedSession(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #2d3348', background: '#0f1117', color: '#e2e8f0', fontSize: '13px' }}
                                >
                                    {sessions.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.sessionName} {s.phoneNumber ? `(+${s.phoneNumber})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Group name */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                                ✏️ Nombre del grupo
                            </label>
                            <input
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                placeholder="Ej: Equipo de Ventas 2025"
                                required
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #2d3348', background: '#0f1117', color: '#e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Phone numbers */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '500' }}>
                                📞 Agregar números de WhatsApp
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    value={phoneInput}
                                    onChange={e => setPhoneInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }}
                                    placeholder="+51987654321"
                                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #2d3348', background: '#0f1117', color: '#e2e8f0', fontSize: '13px' }}
                                />
                                <button type="button" onClick={addPhone} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                    + Agregar
                                </button>
                            </div>
                            {phones.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                                    {phones.map(p => (
                                        <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', fontSize: '12px', color: '#4ade80' }}>
                                            📱 {p}
                                            <button type="button" onClick={() => removePhone(p)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                                Presiona Enter o el botón para agregar cada número. Formato: +51987654321
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2d3348', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}>
                                Cancelar
                            </button>
                            <button type="submit" disabled={creating || sessions.length === 0} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: creating ? '#15803d' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                {creating ? '⏳ Creando...' : '🚀 Crear Grupo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Groups list */}
            {loadingGroups ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando grupos...</div>
            ) : groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#1a1f2e', borderRadius: '14px', border: '1px solid #2d3348' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                    <p style={{ fontSize: '14px' }}>Aún no has creado ningún grupo.</p>
                    <p style={{ fontSize: '12px', marginTop: '6px' }}>Haz clic en <b>Nuevo Grupo</b> para comenzar.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', margin: '0 0 4px' }}>
                        {groups.length} grupo{groups.length !== 1 ? 's' : ''} creado{groups.length !== 1 ? 's' : ''}
                    </p>
                    {groups.map(group => (
                        <div key={group.id} style={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: '14px', overflow: 'hidden' }}>
                            {/* Group header row */}
                            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #22c55e22, #16a34a33)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                                    👥
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                                        {group._count?.members ?? 0} miembro{(group._count?.members ?? 0) !== 1 ? 's' : ''} · Creado {formatDate(group.createdAt)}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button
                                        onClick={() => copyInvite(group.id)}
                                        disabled={loadingInvite === group.id}
                                        title="Copiar link de invitación"
                                        style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                    >
                                        {loadingInvite === group.id ? '⏳' : '🔗 Copiar Link'}
                                    </button>
                                    <button
                                        onClick={() => loadMembers(group.id)}
                                        style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #2d3348', background: expandedGroup === group.id ? 'rgba(99,102,241,0.15)' : 'transparent', color: expandedGroup === group.id ? '#818cf8' : '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                    >
                                        {loadingMembers === group.id ? '⏳' : expandedGroup === group.id ? '▲ Ocultar' : '▼ Ver Miembros'}
                                    </button>
                                </div>
                            </div>

                            {/* Members table */}
                            {expandedGroup === group.id && (
                                <div style={{ borderTop: '1px solid #2d3348' }}>
                                    {loadingMembers === group.id ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Cargando miembros...</div>
                                    ) : (members[group.id] || []).length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No hay miembros registrados en la base de datos.</div>
                                    ) : (
                                        <div>
                                            {/* Table header */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', padding: '10px 20px', background: '#141824', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>
                                                <span>Número</span>
                                                <span>Nombre</span>
                                                <span>Hora de ingreso</span>
                                                <span style={{ textAlign: 'right' }}>Acción</span>
                                            </div>
                                            {(members[group.id] || []).map(member => (
                                                <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', padding: '11px 20px', borderTop: '1px solid #1e2535', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>+{member.phone}</span>
                                                        {member.isAdmin && <span style={{ fontSize: '10px', background: 'rgba(250,204,21,0.15)', color: '#fbbf24', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '4px', padding: '1px 5px' }}>Admin</span>}
                                                    </div>
                                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>{member.name || '—'}</span>
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>🕐 {formatDate(member.joinedAt)}</span>
                                                    <button
                                                        onClick={() => removeMember(group.id, member.phone)}
                                                        disabled={removingMember === member.phone}
                                                        style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' }}
                                                    >
                                                        {removingMember === member.phone ? '⏳' : '✕ Expulsar'}
                                                    </button>
                                                </div>
                                            ))}
                                            {/* Summary footer */}
                                            <div style={{ padding: '10px 20px', background: '#141824', borderTop: '1px solid #1e2535', fontSize: '12px', color: '#475569' }}>
                                                Total: <b style={{ color: '#94a3b8' }}>{(members[group.id] || []).length} miembro{(members[group.id] || []).length !== 1 ? 's' : ''}</b>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
