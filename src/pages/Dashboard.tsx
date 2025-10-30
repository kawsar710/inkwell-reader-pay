import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ReaderDashboard from '@/components/reader/ReaderDashboard';

export default function Dashboard() {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (userRole === 'admin') {
    return <AdminDashboard />;
  }

  return <ReaderDashboard />;
}
