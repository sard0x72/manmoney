import { useAppStore } from '../../store/useAppStore';
import { TransactionForm } from './TransactionForm';

/** The add form that opens from anywhere (Dashboard, and later keyboard shortcuts). */
export function QuickAdd() {
  const { quickAdd, closeQuickAdd, fetchDashboard, fetchAccounts, bumpData } = useAppStore();
  if (!quickAdd) return null;
  const refresh = () => { fetchDashboard(); fetchAccounts(); bumpData(); };
  return <TransactionForm onClose={closeQuickAdd} onSaved={refresh} />;
}
