import { useAppStore } from '../../store/useAppStore';
import { TransactionForm } from './TransactionForm';

/** The add form that opens from anywhere: the Dashboard, Ctrl+N and the command palette. */
export function QuickAdd() {
  const { quickAdd, closeQuickAdd, fetchDashboard, fetchAccounts, bumpData } = useAppStore();
  if (!quickAdd) return null;
  const refresh = () => { fetchDashboard(); fetchAccounts(); bumpData(); };
  return (
    <TransactionForm
      key={quickAdd.kind}
      initialType={quickAdd.kind === 'income' ? 'income' : 'expense'}
      onClose={closeQuickAdd}
      onSaved={refresh}
    />
  );
}
