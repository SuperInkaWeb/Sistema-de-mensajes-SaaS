import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

const mockChartData = [
    { name: '01/10', tickets: 2, resolved: 1 },
    { name: '02/10', tickets: 5, resolved: 3 },
    { name: '03/10', tickets: 3, resolved: 2 },
    { name: '04/10', tickets: 8, resolved: 6 },
    { name: '05/10', tickets: 12, resolved: 9 },
    { name: '06/10', tickets: 7, resolved: 5 },
];

interface Stats {
    totalMessages: number;
    totalContacts: number;
    activeSessions: number;
    agentPerformance: {
        name: string;
        messagesReceived: number;
        contactsOwned: number;
    }[];
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const chartsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/stats/dashboard');
                setStats(data);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleExportPDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        // Header
        doc.setFillColor(15, 17, 23); // Dark background like the app
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE OPERACIONES', margin, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado el: ${new Date().toLocaleString()}`, margin, 30);
        doc.text('Superinka SS - Panel de Administración', pageWidth - margin - 60, 30);

        // Metrics Section
        let yPos = 55;
        doc.setTextColor(31, 41, 55);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Métricas Principales', margin, yPos);
        yPos += 10;

        const metrics = [
            ['Mensajes Totales', stats?.totalMessages.toLocaleString() || '0'],
            ['Contactos', stats?.totalContacts.toLocaleString() || '0'],
            ['T. de Respuesta (Prom)', '4m 20s'],
            ['Sesiones Activas', stats?.activeSessions.toString() || '0']
        ];

        autoTable(doc, {
            startY: yPos,
            head: [['Indicador', 'Valor']],
            body: metrics,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235], textColor: 255 },
            margin: { left: margin, right: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Charts Capture
        if (chartsRef.current) {
            doc.setFontSize(14);
            doc.text('Visualización de Datos', margin, yPos);
            yPos += 5;

            const canvas = await html2canvas(chartsRef.current, {
                backgroundColor: '#0f1117',
                scale: 2
            });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = pageWidth - (margin * 2);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            doc.addImage(imgData, 'PNG', margin, yPos, pdfWidth, pdfHeight);
            yPos += pdfHeight + 15;
        }

        // Agent Performance Table
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Rendimiento por Agente', margin, yPos);
        yPos += 5;

        const tableData = stats?.agentPerformance.map(agent => [
            agent.name,
            agent.contactsOwned,
            agent.messagesReceived,
            `${Math.round((agent.messagesReceived / 50) * 100)}%`
        ]) || [];

        autoTable(doc, {
            startY: yPos,
            head: [['Agente', 'Contactos', 'Mensajes', 'Conversión']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 17, 23], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 5 },
            margin: { left: margin, right: margin }
        });

        doc.save(`Reporte_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-[#0f1117] min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Informes y Estadísticas</h1>
                    <p className="text-sm text-gray-400">Análisis operativo de tu sistema de atención</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 bg-dark-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-dark-600 border border-dark-600 transition-colors"
                    >
                        Exportar PDF
                    </button>
                    <button className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-bold hover:bg-brand-600 transition-shadow shadow-lg shadow-brand-500/20">Últimos 7 días</button>
                </div>
            </div>

            {/* Metric Grids */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-dark-800/50 p-6 rounded-2xl border border-dark-600/50">
                    <p className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-2">Mensajes</p>
                    <p className="text-3xl font-black text-white">{stats?.totalMessages.toLocaleString() || '0'}</p>
                    <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                        <span>↑ 12%</span>
                        <span className="text-gray-500 font-normal">vs el mes anterior</span>
                    </div>
                </div>
                <div className="bg-dark-800/50 p-6 rounded-2xl border border-dark-600/50">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Contactos</p>
                    <p className="text-3xl font-black text-white">{stats?.totalContacts.toLocaleString() || '0'}</p>
                    <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                        <span>↑ 5%</span>
                        <span className="text-gray-500 font-normal">Nuevos prospectos</span>
                    </div>
                </div>
                <div className="bg-dark-800/50 p-6 rounded-2xl border border-dark-600/50">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">T. de Respuesta</p>
                    <p className="text-3xl font-black text-white">4m 20s</p>
                    <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                        <span>↓ 18%</span>
                        <span className="text-gray-500 font-normal">¡Más rápido!</span>
                    </div>
                </div>
                <div className="bg-dark-800/50 p-6 rounded-2xl border border-dark-600/50">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Conexiones</p>
                    <p className="text-3xl font-black text-white">{stats?.activeSessions || 0}</p>
                    <div className="mt-2 text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                        <span>100%</span>
                        <span className="text-gray-500 font-normal">Uptime del sistema</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tickets Chart */}
                <div className="bg-dark-800/80 p-6 rounded-2xl border border-dark-600">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Tickets Resueltos</h3>
                        <p className="text-xs text-gray-500">Volumen de atención histórico</p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockChartData}>
                                <defs>
                                    <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3348" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: '8px', fontSize: '11px' }}
                                    itemStyle={{ color: '#22c55e' }}
                                />
                                <Area type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Efficiency Chart */}
                <div className="bg-dark-800/80 p-6 rounded-2xl border border-dark-600">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-white">Eficiencia de Respuesta</h3>
                        <p className="text-xs text-gray-500">Tiempos promedios por día</p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3348" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: '8px', fontSize: '11px' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Line type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-dark-800/80 rounded-2xl border border-dark-600 overflow-hidden">
                <div className="p-6 border-b border-dark-600 bg-dark-700/20">
                    <h2 className="text-lg font-bold text-white">Rendimiento por Agente</h2>
                    <p className="text-xs text-gray-500">Seguimiento individual de productividad</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-[10px] text-gray-500 uppercase tracking-widest bg-dark-900/30">
                                <th className="px-6 py-4">Agente</th>
                                <th className="px-6 py-4 text-center">Contactos</th>
                                <th className="px-6 py-4 text-center">Mensajes</th>
                                <th className="px-6 py-4 text-center">Conversión</th>
                                <th className="px-6 py-4 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700/50">
                            {stats?.agentPerformance.map((agent, idx) => (
                                <tr key={idx} className="hover:bg-dark-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                                                {agent.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm text-gray-200 font-medium">{agent.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-400">{agent.contactsOwned}</td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-400">{agent.messagesReceived}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="w-24 bg-dark-700 h-1.5 rounded-full mx-auto overflow-hidden">
                                            <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, (agent.messagesReceived / 50) * 100)}%` }} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                                            Online
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
