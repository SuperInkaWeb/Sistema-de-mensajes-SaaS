import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import type { AuthState } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import ChatPage from './pages/ChatPage';
import InstancesPage from './pages/InstancesPage';
import AgentsPage from './pages/AgentsPage';
import ControlPanel from './components/ControlPanel';
import GroupsPage from './pages/GroupsPage';
import ContactsPage from './pages/ContactsPage';
import DashboardPage from './pages/DashboardPage';
import QuickRepliesPage from './pages/QuickRepliesPage';
import KanbanPage from './pages/KanbanPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((s: AuthState) => s.token);
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const token = useAuthStore((s: AuthState) => s.token);
    if (token) return <Navigate to="/" replace />;
    return <>{children}</>;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<DashboardPage />} />
                    <Route path="home" element={<DashboardHome />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="instances" element={<InstancesPage />} />
                    <Route path="agents" element={<AgentsPage />} />
                    <Route path="panel" element={<ControlPanel standalone />} />
                    <Route path="groups" element={<GroupsPage />} />
                    <Route path="contacts" element={<ContactsPage />} />
                    <Route path="quick-replies" element={<QuickRepliesPage />} />
                    <Route path="kanban" element={<KanbanPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
