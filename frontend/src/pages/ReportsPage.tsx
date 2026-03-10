import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import * as XLSX from 'xlsx';

interface DailyReport {
    id: string;
    reportDate: string;
    zone?: string;
    businessType?: string;
    companiesVisited?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactRole?: string;
    contactsMade?: number;
    meetingsHeld?: number;
    proposalsSent?: number;
    mainObjection?: string;
    whatWorked?: string;
    whatToImprove?: string;
    status?: string;
    planPurchased?: string;
    nextStep?: string;
    user?: { id: string; name: string; email: string };
    createdAt: string;
}

const emptyForm = {
    reportDate: new Date().toISOString().split('T')[0],
    zone: '',
    businessType: '',
    companiesVisited: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactRole: '',
    contactsMade: '',
    meetingsHeld: '',
    proposalsSent: '',
    mainObjection: '',
    whatWorked: '',
    whatToImprove: '',
    status: 'pendiente',
    planPurchased: '',
    nextStep: '',
};

const STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente', color: '#64748b' },
    { value: 'compro', label: 'Compró', color: '#22c55e' },
    { value: 'no_compro', label: 'No Compró', color: '#ef4444' },
    { value: 'no_responde', label: 'No Responde', color: '#f59e0b' },
    { value: 'cotizacion_enviada', label: 'Cotización Enviada', color: '#3b82f6' },
];

const getStatusStyle = (status?: string) => {
    const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
    return { background: opt.color + '22', color: opt.color, border: `1px solid ${opt.color}44` };
};

const getStatusLabel = (status?: string) =>
    STATUS_OPTIONS.find(o => o.value === status)?.label || 'Pendiente';

export default function ReportsPage() {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    const [reports, setReports] = useState<DailyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<DailyReport | null>(null);
    const [filterDate, setFilterDate] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/reports');
            setReports(data);
        } catch { setError('Error al cargar informes'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const exportToExcel = () => {
        const rows = filtered.map(r => ({
            'Fecha': new Date(r.reportDate).toLocaleDateString('es-PE'),
            'Vendedor': r.user?.name || user?.name || '',
            'Zona': r.zone || '',
            'Giro': r.businessType || '',
            'Empresas Visitadas': r.companiesVisited || '',
            'Contacto': r.contactName || '',
            'Cargo': r.contactRole || '',
            'Teléfono': r.contactPhone || '',
            'Email': r.contactEmail || '',
            'Decisores Contactados': r.contactsMade ?? '',
            'Reuniones': r.meetingsHeld ?? '',
            'Propuestas': r.proposalsSent ?? '',
            'Objeción Principal': r.mainObjection || '',
            '¿Qué funcionó?': r.whatWorked || '',
            '¿Qué mejorar?': r.whatToImprove || '',
            'Estado': getStatusLabel(r.status),
            'Plan Comprado': r.planPurchased || '',
            'Próximo Paso': r.nextStep || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Informes');
        const fileName = `informes_diarios_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await api.post('/reports', form);
            setShowForm(false);
            setForm(emptyForm);
            await load();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al guardar');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este informe?')) return;
        try {
            await api.delete(`/reports/${id}`);
            setSelected(null);
            await load();
        } catch { alert('Error al eliminar'); }
    };

    const filtered = filterDate
        ? reports.filter(r => r.reportDate.startsWith(filterDate))
        : reports;

    const inp: React.CSSProperties = {
        width: '100%', background: '#1e2535', border: '1px solid #2d3348',
        borderRadius: '8px', padding: '8px 12px', color: '#e2e8f0',
        fontSize: '13px', boxSizing: 'border-box', outline: 'none',
    };
    const lbl: React.CSSProperties = {
        display: 'block', fontSize: '11px', fontWeight: '600',
        color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px',
    };
    const card: React.CSSProperties = {
        background: '#1a1f2e', border: '1px solid #2d3348',
        borderRadius: '12px', padding: '16px',
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#f1f5f9' }}>
                        📋 Informe Diario del Vendedor
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                        Registra tus actividades, visitas y resultados del día
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setForm(emptyForm); setSelected(null); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        color: '#fff', border: 'none', borderRadius: '10px',
                        padding: '10px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Nuevo Informe
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Informes', value: reports.length, color: '#3b82f6', icon: '📄' },
                    { label: 'Reuniones', value: reports.reduce((s, r) => s + (r.meetingsHeld || 0), 0), color: '#8b5cf6', icon: '🤝' },
                    { label: 'Propuestas', value: reports.reduce((s, r) => s + (r.proposalsSent || 0), 0), color: '#f59e0b', icon: '📊' },
                    { label: 'Ventas', value: reports.filter(r => r.status === 'compro').length, color: '#22c55e', icon: '✅' },
                ].map(stat => (
                    <div key={stat.label} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '24px' }}>{stat.icon}</div>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div style={{ ...card, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ ...lbl, margin: 0, whiteSpace: 'nowrap' }}>Filtrar por fecha:</label>
                <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    style={{ ...inp, width: 'auto' }}
                />
                {filterDate && (
                    <button onClick={() => setFilterDate('')} style={{ padding: '6px 12px', background: '#2d3348', border: 'none', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>
                        Limpiar
                    </button>
                )}
                <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '12px' }}>{filtered.length} informe(s)</span>
                <button
                    onClick={exportToExcel}
                    disabled={filtered.length === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px',
                        background: filtered.length === 0
                            ? '#1e2535'
                            : 'linear-gradient(135deg, #16a34a, #15803d)',
                        border: '1px solid ' + (filtered.length === 0 ? '#2d3348' : '#22c55e44'),
                        borderRadius: '8px',
                        color: filtered.length === 0 ? '#475569' : '#fff',
                        cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '13px', fontWeight: '600',
                        boxShadow: filtered.length === 0 ? 'none' : '0 2px 8px rgba(34,197,94,0.25)',
                        transition: 'all 0.2s',
                    }}
                    title="Exportar informes a Excel"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Exportar Excel
                </button>
            </div>

            {error && <div style={{ background: '#ef444422', border: '1px solid #ef444444', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

            {/* FORM MODAL */}
            {showForm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    padding: '20px', overflowY: 'auto',
                }}>
                    <div style={{ background: '#141824', border: '1px solid #2d3348', borderRadius: '16px', width: '100%', maxWidth: '700px', padding: '28px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f1f5f9' }}>📋 Nuevo Informe Diario</h2>
                            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Section: General */}
                            <div style={{ background: '#1e2535', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>📅 Información General</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={lbl}>Fecha *</label>
                                        <input type="date" required value={form.reportDate} onChange={e => setForm({ ...form, reportDate: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Zona Visitada</label>
                                        <input type="text" placeholder="Ej: Centro, Norte..." value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Giro Priorizado</label>
                                        <input type="text" placeholder="Ej: Retail, Tecnología..." value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })} style={inp} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <label style={lbl}>Empresas Visitadas</label>
                                    <textarea rows={2} placeholder="Lista las empresas visitadas..." value={form.companiesVisited} onChange={e => setForm({ ...form, companiesVisited: e.target.value })} style={{ ...inp, resize: 'vertical' }} />
                                </div>
                            </div>

                            {/* Section: Contact */}
                            <div style={{ background: '#1e2535', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>👤 Datos del Contacto Principal</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={lbl}>Nombre del Contacto</label>
                                        <input type="text" placeholder="Nombre completo" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Cargo</label>
                                        <input type="text" placeholder="Ej: Gerente, Director..." value={form.contactRole} onChange={e => setForm({ ...form, contactRole: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Teléfono</label>
                                        <input type="tel" placeholder="+51 999 999 999" value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Email</label>
                                        <input type="email" placeholder="correo@empresa.com" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} style={inp} />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Activity */}
                            <div style={{ background: '#1e2535', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>📊 Actividad del Día</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={lbl}>Decisores Contactados</label>
                                        <input type="number" min="0" placeholder="0" value={form.contactsMade} onChange={e => setForm({ ...form, contactsMade: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Reuniones Realizadas</label>
                                        <input type="number" min="0" placeholder="0" value={form.meetingsHeld} onChange={e => setForm({ ...form, meetingsHeld: e.target.value })} style={inp} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Propuestas Enviadas</label>
                                        <input type="number" min="0" placeholder="0" value={form.proposalsSent} onChange={e => setForm({ ...form, proposalsSent: e.target.value })} style={inp} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <label style={lbl}>Objeción Principal Detectada</label>
                                    <textarea rows={2} placeholder="¿Cuál fue la principal objeción del cliente?" value={form.mainObjection} onChange={e => setForm({ ...form, mainObjection: e.target.value })} style={{ ...inp, resize: 'vertical' }} />
                                </div>
                            </div>

                            {/* Section: Analysis */}
                            <div style={{ background: '#1e2535', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>💡 Análisis del Día</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={lbl}>¿Qué funcionó?</label>
                                        <textarea rows={3} placeholder="Estrategias que dieron resultado..." value={form.whatWorked} onChange={e => setForm({ ...form, whatWorked: e.target.value })} style={{ ...inp, resize: 'vertical' }} />
                                    </div>
                                    <div>
                                        <label style={lbl}>¿Qué mejorar?</label>
                                        <textarea rows={3} placeholder="Áreas de mejora para mañana..." value={form.whatToImprove} onChange={e => setForm({ ...form, whatToImprove: e.target.value })} style={{ ...inp, resize: 'vertical' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Result */}
                            <div style={{ background: '#1e2535', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#22c55e', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>🎯 Resultado</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={lbl}>Estado</label>
                                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...inp }}>
                                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={lbl}>Plan Comprado</label>
                                        <input type="text" placeholder="Nombre del plan o producto..." value={form.planPurchased} onChange={e => setForm({ ...form, planPurchased: e.target.value })} style={inp} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <label style={lbl}>Próximo Paso</label>
                                    <textarea rows={2} placeholder="Acción a tomar el próximo contacto..." value={form.nextStep} onChange={e => setForm({ ...form, nextStep: e.target.value })} style={{ ...inp, resize: 'vertical' }} />
                                </div>
                            </div>

                            {error && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: '#2d3348', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
                                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                                    {saving ? 'Guardando...' : '💾 Guardar Informe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Report Detail Modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
                    <div style={{ background: '#141824', border: '1px solid #2d3348', borderRadius: '16px', width: '100%', maxWidth: '680px', padding: '28px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f1f5f9' }}>Detalle del Informe</h2>
                                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                                    {new Date(selected.reportDate).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    {isAdmin && selected.user && ` · ${selected.user.name}`}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(isAdmin || selected.user?.id === user?.id) && (
                                    <button onClick={() => handleDelete(selected.id)} style={{ padding: '6px 14px', background: '#ef444422', border: '1px solid #ef444444', borderRadius: '8px', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>🗑 Eliminar</button>
                                )}
                                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            {/* Status badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', ...getStatusStyle(selected.status) }}>{getStatusLabel(selected.status)}</span>
                                {selected.planPurchased && <span style={{ color: '#94a3b8', fontSize: '13px' }}>Plan: <strong style={{ color: '#e2e8f0' }}>{selected.planPurchased}</strong></span>}
                            </div>

                            {/* Info grid */}
                            {[
                                { label: '📍 Zona', value: selected.zone },
                                { label: '🏢 Giro', value: selected.businessType },
                                { label: '👤 Contacto', value: selected.contactName },
                                { label: '📞 Teléfono', value: selected.contactPhone },
                                { label: '✉️ Email', value: selected.contactEmail },
                                { label: '🔖 Cargo', value: selected.contactRole },
                            ].filter(f => f.value).map(f => (
                                <div key={f.label} style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: '#1e2535', borderRadius: '8px' }}>
                                    <span style={{ color: '#64748b', fontSize: '13px', minWidth: '110px' }}>{f.label}</span>
                                    <span style={{ color: '#e2e8f0', fontSize: '13px' }}>{f.value}</span>
                                </div>
                            ))}

                            {/* Companies */}
                            {selected.companiesVisited && (
                                <div style={{ padding: '10px 12px', background: '#1e2535', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>🏙️ EMPRESAS VISITADAS</div>
                                    <div style={{ color: '#e2e8f0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{selected.companiesVisited}</div>
                                </div>
                            )}

                            {/* Numbers */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                {[
                                    { label: 'Decisores', value: selected.contactsMade, color: '#3b82f6' },
                                    { label: 'Reuniones', value: selected.meetingsHeld, color: '#8b5cf6' },
                                    { label: 'Propuestas', value: selected.proposalsSent, color: '#f59e0b' },
                                ].map(n => (
                                    <div key={n.label} style={{ padding: '12px', background: '#1e2535', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: n.color }}>{n.value ?? '-'}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{n.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Text fields */}
                            {[
                                { label: '⚠️ Objeción Principal', value: selected.mainObjection },
                                { label: '✅ ¿Qué funcionó?', value: selected.whatWorked },
                                { label: '📈 ¿Qué mejorar?', value: selected.whatToImprove },
                                { label: '🎯 Próximo Paso', value: selected.nextStep },
                            ].filter(f => f.value).map(f => (
                                <div key={f.label} style={{ padding: '10px 12px', background: '#1e2535', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>{f.label}</div>
                                    <div style={{ color: '#e2e8f0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{f.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ ...card }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando informes...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                        <div style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>No hay informes todavía</div>
                        <p style={{ color: '#475569', fontSize: '13px', margin: '8px 0 0' }}>Crea tu primer informe diario con el botón de arriba</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #2d3348' }}>
                                    {['Fecha', 'Vendedor', 'Zona', 'Empresas', 'Reuniones', 'Propuestas', 'Estado', ''].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #1e2535', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e2535'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                                            {new Date(r.reportDate).toLocaleDateString('es-PE')}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#94a3b8' }}>{isAdmin ? (r.user?.name || 'N/A') : user?.name}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#94a3b8' }}>{r.zone || '-'}</td>
                                        <td style={{ padding: '12px', fontSize: '12px', color: '#64748b', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.companiesVisited || '-'}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ fontWeight: '700', color: '#8b5cf6' }}>{r.meetingsHeld ?? '-'}</span></td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}><span style={{ fontWeight: '700', color: '#f59e0b' }}>{r.proposalsSent ?? '-'}</span></td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', ...getStatusStyle(r.status) }}>
                                                {getStatusLabel(r.status)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <button onClick={() => setSelected(r)} style={{ padding: '5px 12px', background: '#2d3348', border: 'none', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>Ver</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
