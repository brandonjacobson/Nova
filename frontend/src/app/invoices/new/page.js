import CreateInvoice from './CreateInvoice';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function NewInvoicePage() {
  return (
    <ProtectedRoute>
      <CreateInvoice />
    </ProtectedRoute>
  );
}
