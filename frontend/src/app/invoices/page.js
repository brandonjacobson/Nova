import InvoiceList from './InvoiceList';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function InvoicesPage() {
  return (
    <ProtectedRoute>
      <InvoiceList />
    </ProtectedRoute>
  );
}
