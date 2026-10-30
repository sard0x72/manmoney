import { useAppStore } from '../../store/useAppStore';
import { TransactionForm } from './TransactionForm';
import { AddFriendForm } from './AddFriendForm';

/** The add form that opens from anywhere: the Dashboard, Ctrl+N and the command palette. */
export function QuickAdd() {
  const { quickAdd, closeQuickAdd, fetchDashboard, fetchAccounts, fetchLoans, bumpData } = useAppStore();
  if (!quickAdd) return null;
  const refresh = () => { fetchDashboard(); fetchAccounts(); bumpData(); };
  if (quickAdd.kind === 'friend') {
    return <AddFriendForm onClose={closeQuickAdd} onSaved={() => { refresh(); fetchLoans(); }} />;
  }
  return (
    <TransactionForm
      key={quickAdd.kind}
      initialType={quickAdd.kind === 'income' ? 'income' : 'expense'}
      onClose={closeQuickAdd}
      onSaved={refresh}
    />
  );
}
