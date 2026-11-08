import React, { useState, useEffect } from 'react';
import { User, Transaction, UserGoal, SubscriptionStatus } from './types';
import { DB } from './storage/db';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { PaywallScreen } from './components/PaywallScreen';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { GeminiChatWidget } from './components/GeminiChatWidget';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<User | null>(() => DB.getSession());
  const [users, setUsers] = useState<User[]>(() => DB.getUsers());
  const [transactions, setTransactions] = useState<Transaction[]>(() => DB.getTransactions());
  const [goals, setGoals] = useState<Record<string, UserGoal>>(() => DB.getGoals());

  // Theme state
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => DB.getTheme());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>(() =>
    session?.role === 'admin' ? 'admin_dashboard' : 'dashboard'
  );

  // Admin auditing user
  const [auditingUser, setAuditingUser] = useState<User | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Sync theme with DOM and database
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync with Firestore Cloud on startup
  useEffect(() => {
    DB.syncWithCloud();
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    DB.setTheme(nextTheme);
    showToast(`Tema alterado para Modo ${nextTheme === 'dark' ? 'Escuro' : 'Claro'}`);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    DB.setTheme(newTheme);
    showToast(`Tema alterado para Modo ${newTheme === 'dark' ? 'Escuro' : 'Claro'}`);
  };

  // Sync session changes with tab default
  useEffect(() => {
    if (session) {
      if (session.themePreference) {
        setThemeState(session.themePreference);
        DB.setTheme(session.themePreference);
      }
      if (session.role === 'admin') {
        setActiveTab('admin_dashboard');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [session?.id]);

  const handleLogin = (user: User) => {
    DB.setSession(user);
    setSession(user);
    if (user.themePreference) {
      setThemeState(user.themePreference);
      DB.setTheme(user.themePreference);
    }
    setAuditingUser(null);
    showToast(`Bem-vindo(a), ${user.name}!`);
  };

  const handleLogout = () => {
    DB.clearSession();
    setSession(null);
    setAuditingUser(null);
    setIsProfileOpen(false);
    setIsPaywallOpen(false);
    setIsVoiceModalOpen(false);
    setIsMonthlyReportOpen(false);
    showToast('Sessão encerrada com sucesso.');
  };

  const handleRegister = (newUserData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...newUserData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      themePreference: theme,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      planName: 'Mensal',
      preferences: {
        monthlyClosingDay: 5,
        notificationChannels: { email: true, googleCalendar: true, push: true },
        alertDaysAdvance: 2,
      },
    };
    const updatedUsers = [...users, newUser];
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    // Initial default goal
    const updatedGoals = {
      ...goals,
      [newUser.id]: {
        spendingLimit: 3000.0,
        savingsGoal: 1000.0,
        adminNote: 'Bem-vindo ao FinancApp! Mantenha suas despesas dentro do teto estipulado.',
        updatedAt: new Date().toISOString().split('T')[0],
      },
    };
    DB.saveGoals(updatedGoals);
    setGoals(updatedGoals);

    DB.setSession(newUser);
    setSession(newUser);
    showToast('Conta criada com sucesso! Aproveite o FinancApp.');
  };

  // Add transaction with optional installment generator
  const handleAddTransaction = (
    txData: Omit<Transaction, 'id'>,
    generateFutureInstallments = false
  ) => {
    const newTxList: Transaction[] = [];

    const baseTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dueDate: txData.dueDate || txData.date,
      isPaid: txData.isPaid ?? (txData.type === 'income'),
    };
    newTxList.push(baseTx);

    // Auto-generate subsequent installments if requested
    if (
      generateFutureInstallments &&
      baseTx.installmentInfo &&
      baseTx.installmentInfo.current < baseTx.installmentInfo.total
    ) {
      const currentNum = baseTx.installmentInfo.current;
      const totalNum = baseTx.installmentInfo.total;
      const baseDate = new Date(baseTx.date);
      const rawDesc = baseTx.desc.replace(/\s*\(Parcela\s+\d+\/\d+\)/i, '').trim();

      for (let i = currentNum + 1; i <= totalNum; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setMonth(nextDate.getMonth() + (i - currentNum));
        const formattedDate = nextDate.toISOString().split('T')[0];

        newTxList.push({
          ...baseTx,
          id: `tx-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          desc: `${rawDesc} (Parcela ${i}/${totalNum})`,
          date: formattedDate,
          dueDate: formattedDate,
          isPaid: false,
          installmentInfo: {
            current: i,
            total: totalNum,
            groupId: baseTx.installmentInfo.groupId,
          },
        });
      }
    }

    const updatedTransactions = [...transactions, ...newTxList];
    DB.saveTransactions(updatedTransactions);
    setTransactions(updatedTransactions);

    showToast(
      newTxList.length > 1
        ? `${newTxList.length} parcelas registradas com sucesso!`
        : 'Lançamento adicionado com sucesso!'
    );
  };

  const handleUpdateTransaction = (id: string, updatedData: Omit<Transaction, 'id'>) => {
    const updated = transactions.map((t) => (t.id === id ? { ...updatedData, id } : t));
    DB.saveTransactions(updated);
    setTransactions(updated);
    showToast('Lançamento atualizado com sucesso.');
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    DB.saveTransactions(updated);
    setTransactions(updated);
    showToast('Lançamento removido.');
  };

  // Toggle bill payment status
  const handleTogglePaid = (txId: string) => {
    const target = transactions.find((t) => t.id === txId);
    if (!target) return;
    const nextPaid = !target.isPaid;
    const updated = transactions.map((t) =>
      t.id === txId
        ? {
            ...t,
            isPaid: nextPaid,
            paidAt: nextPaid ? new Date().toISOString() : undefined,
          }
        : t
    );
    DB.saveTransactions(updated);
    setTransactions(updated);
    showToast(nextPaid ? `Conta "${target.desc}" marcada como PAGA!` : `Conta "${target.desc}" marcada como PENDENTE.`);
  };

  const handleSaveGoal = (userId: string, updatedGoal: UserGoal) => {
    const updatedGoals = {
      ...goals,
      [userId]: {
        ...updatedGoal,
        updatedAt: new Date().toISOString().split('T')[0],
      },
    };
    DB.saveGoals(updatedGoals);
    setGoals(updatedGoals);
    showToast('Metas e diretrizes do usuário atualizadas com sucesso!');
  };

  const handleAddUserByAdmin = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
      subscriptionStatus: userData.subscriptionStatus || 'active',
      subscriptionExpiresAt:
        userData.subscriptionExpiresAt ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      preferences: userData.preferences || {
        monthlyClosingDay: 5,
        notificationChannels: { email: true, googleCalendar: true, push: true },
        alertDaysAdvance: 2,
      },
    };
    const updatedUsers = [...users, newUser];
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    // Initial default goal
    const updatedGoals = {
      ...goals,
      [newUser.id]: {
        spendingLimit: 3500.0,
        savingsGoal: 1000.0,
        adminNote: 'Conta criada pela administração.',
        updatedAt: new Date().toISOString().split('T')[0],
      },
    };
    DB.saveGoals(updatedGoals);
    setGoals(updatedGoals);

    showToast(`Usuário ${newUser.name} cadastrado com sucesso.`);
  };

  const handleToggleUserStatus = (userId: string) => {
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? 'inactive' : 'active';
        return { ...u, status: nextStatus as 'active' | 'inactive' };
      }
      return u;
    });
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    if (session?.id === userId) {
      setSession((prev) => (prev ? { ...prev, status: prev.status === 'active' ? 'inactive' : 'active' } : null));
    }
    showToast('Status da conta atualizado.');
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter((u) => u.id !== userId);
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    const updatedTxs = transactions.filter((t) => t.userId !== userId);
    DB.saveTransactions(updatedTxs);
    setTransactions(updatedTxs);

    showToast('Usuário e seus lançamentos foram excluídos.');
  };

  // SaaS Commercial Subscription handlers
  const handleRenewSubscription = (plan: 'Mensal' | 'Trimestral' | 'Anual', daysToAdd: number) => {
    if (!session) return;
    const baseDate = session.subscriptionExpiresAt && session.subscriptionExpiresAt > new Date().toISOString().split('T')[0]
      ? new Date(session.subscriptionExpiresAt)
      : new Date();

    const newExpireDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const updatedUser: User = {
      ...session,
      subscriptionStatus: 'active',
      planName: plan,
      subscriptionExpiresAt: newExpireDate,
    };

    const updatedUsers = users.map((u) => (u.id === session.id ? updatedUser : u));
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    DB.setSession(updatedUser);
    setSession(updatedUser);
    setIsPaywallOpen(false);
    showToast(`Parabéns! Assinatura renovada no Plano ${plan} até ${newExpireDate}!`);
  };

  const handleUpdateUserSubscription = (
    userId: string,
    status: SubscriptionStatus,
    daysToAdd = 30
  ) => {
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        let newExpires = u.subscriptionExpiresAt;
        if (daysToAdd > 0) {
          const base = u.subscriptionExpiresAt && u.subscriptionExpiresAt > new Date().toISOString().split('T')[0]
            ? new Date(u.subscriptionExpiresAt)
            : new Date();
          newExpires = new Date(base.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        return {
          ...u,
          subscriptionStatus: status,
          subscriptionExpiresAt: newExpires,
        };
      }
      return u;
    });

    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);

    if (session?.id === userId) {
      const self = updatedUsers.find((u) => u.id === userId);
      if (self) {
        setSession(self);
        DB.setSession(self);
      }
    }

    showToast(`Assinatura do usuário atualizada com sucesso (+${daysToAdd} dias).`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    if (session?.id === updatedUser.id) {
      setSession(updatedUser);
      DB.setSession(updatedUser);
    }
    showToast('Preferências e cadastro atualizados com sucesso!');
  };

  const handleUpdateFoodCard = (newBalance: number) => {
    if (!session) return;
    const updatedUser: User = {
      ...session,
      foodCardBalance: newBalance,
    };
    const updatedUsers = users.map((u) => (u.id === session.id ? updatedUser : u));
    DB.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    DB.setSession(updatedUser);
    setSession(updatedUser);
    showToast(`Saldo do Cartão Alimentação atualizado: R$ ${newBalance.toFixed(2)}`);
  };

  const handleResetDemoData = () => {
    if (confirm('Deseja restaurar os dados de demonstração iniciais?')) {
      DB.resetDemoData();
      setUsers(DB.getUsers());
      setTransactions(DB.getTransactions());
      setGoals(DB.getGoals());
      showToast('Dados restaurados com sucesso!');
    }
  };

  // If not logged in, show AuthModal
  if (!session) {
    return <AuthModal users={users} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  // COMMERCIAL PAYWALL GATE (Item 3 do Prompt)
  // Se o usuário não for admin e sua assinatura estiver com status "expired", corta o acesso e exibe a tela de renovação
  const isSubscriptionCutoff = session.role !== 'admin' && session.subscriptionStatus === 'expired';

  if (isSubscriptionCutoff || isPaywallOpen) {
    return (
      <PaywallScreen
        user={session}
        onRenewSubscription={handleRenewSubscription}
        onLogout={handleLogout}
      />
    );
  }

  const effectiveUser = auditingUser || session;
  const effectiveTxs = transactions.filter((t) => t.userId === effectiveUser.id);
  const effectiveGoal = goals[effectiveUser.id] || {
    spendingLimit: 3000,
    savingsGoal: 1000,
    adminNote: 'Mantenha o controle diário de seus gastos.',
    updatedAt: new Date().toISOString().split('T')[0],
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-800 dark:border-slate-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        user={session}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAuditingUser={auditingUser}
        onExitAudit={() => setAuditingUser(null)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {session.role === 'admin' && !auditingUser ? (
          <AdminDashboard
            admin={session}
            users={users}
            transactions={transactions}
            goals={goals}
            onSaveGoal={handleSaveGoal}
            onAddUser={handleAddUserByAdmin}
            onToggleUserStatus={handleToggleUserStatus}
            onDeleteUser={handleDeleteUser}
            onResetDemoData={handleResetDemoData}
            onUpdateUserSubscription={handleUpdateUserSubscription}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <UserDashboard
            user={effectiveUser}
            transactions={effectiveTxs}
            goal={effectiveGoal}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onTogglePaid={handleTogglePaid}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
            onUpdateGoals={(g) => handleSaveGoal(effectiveUser.id, g)}
            onUpdateFoodCard={handleUpdateFoodCard}
            isAuditing={Boolean(auditingUser)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>

      {/* Profile & Onboarding Preferences Modal */}
      {isProfileOpen && (
        <UserProfileModal
          user={session}
          theme={theme}
          onThemeChange={handleThemeChange}
          onUpdateUser={handleUpdateUser}
          onOpenPaywall={() => {
            setIsProfileOpen(false);
            setIsPaywallOpen(true);
          }}
          onLogout={handleLogout}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* Voice Assistant Modal com Gemini (Item 1 do Prompt) */}
      {isVoiceModalOpen && (
        <VoiceAssistantModal
          userId={effectiveUser.id}
          onConfirmTransaction={handleAddTransaction}
          onClose={() => setIsVoiceModalOpen(false)}
        />
      )}

      {/* Automated Monthly Closing Cycle Report (Item 5 do Prompt) */}
      {isMonthlyReportOpen && (
        <MonthlyReportModal
          user={effectiveUser}
          transactions={effectiveTxs}
          onClose={() => setIsMonthlyReportOpen(false)}
        />
      )}

      {/* Floating Interactive Gemini Chat Widget (Item 5 do Prompt) */}
      <GeminiChatWidget
        user={effectiveUser}
        transactions={effectiveTxs}
        onAddTransaction={handleAddTransaction}
        onTogglePaid={handleTogglePaid}
        onUpdateFoodCardBalance={handleUpdateFoodCard}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 FinancApp · Controle Financeiro Inteligente</p>
          <div className="flex items-center space-x-4">
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Sessão ativa: {session.name} ({session.role === 'admin' ? 'Administrador' : 'Usuário'})
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
