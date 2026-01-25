import InvoiceDetail from './InvoiceDetail';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function InvoiceDetailPage() {
  return (
    <ProtectedRoute>
      <InvoiceDetail />
    </ProtectedRoute>
  );
}
