import { AdminAuthProvider } from './AdminAuthProvider';
import AdminPanel from './App';
import './styles.css';

export default function AdminEntry() {
  return (
    <AdminAuthProvider>
      <AdminPanel />
    </AdminAuthProvider>
  );
}
