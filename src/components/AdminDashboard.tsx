import React, { useState, useMemo } from 'react';
import { User, Transaction, UserGoal, SubscriptionStatus } from '../types';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Search,
  UserPlus,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  XCircle,
  Trash2,
  Clock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDateBR, exportTransactionsToCSV } from '../utils/formatters';
import { UserDetailView } from './UserDetailView';

interface AdminDashboardProps {
  admin: User;
  users: User[];
  transactions: Transaction[];
  goals: Record<string, UserGoal>;
  onSaveGoal: (userId: string, goal: UserGoal) => void;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onToggleUserStatus: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onResetDemoData: () => void;
  onUpdateUserSubscription?: (userId: string, status: SubscriptionStatus, daysToAdd?: number) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  users,
  transactions,
  goals,
  onSaveGoal,
  onAddUser,
  onToggleUserStatus,
  onDeleteUser,
  onResetDemoData,
  onUpdateUserSubscription,
  activeTab = 'admin_dashboard',
  onTabChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'red' | 'blue' | 'over_limit' | 'meeting_goal' | 'expired'>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

  const nonAdminUsers = useMemo(() => users.filter((u) => u.role !== 'admin'), [users]);

  // Compute stats for each user focusing on: Red vs Blue, Metas Cumpridas vs Não Cumpridas, Assinatura
  const userStats = useMemo(() => {
    return nonAdminUsers.map((u) => {
      const userTxs = transactions.filter((t) => t.userId === u.id);
      const income = userTxs.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const fixed = userTxs.filter((t) => t.type === 'fixed').reduce((acc, t) => acc + t.amount, 0);
      const variable = userTxs.filter((t) => t.type === 'variable').reduce((acc, t) => acc + t.amount, 0);
      const totalExpenses = fixed + variable;
      const balance = income - totalExpenses;
      const userGoal = goals[u.id] || { spendingLimit: 0, savingsGoal: 0 };

      // Over limit check
      const isOverSpendingLimit = userGoal.spendingLimit > 0 && totalExpenses > userGoal.spendingLimit;

      // "Vermelho" condition: negative balance OR spending exceeding limit
      const isRed = balance < 0 || isOverSpendingLimit;

      // "Azul" condition: positive balance AND within spending limit
      const isBlue = balance >= 0 && !isOverSpendingLimit;

      // Meeting monthly financial goal: within spending limit and if savings goal set, balance >= savings goal
      const isMeetingGoal = !isOverSpendingLimit && (userGoal.savingsGoal === 0 || balance >= userGoal.savingsGoal);

      return {
        user: u,
        txCount: userTxs.length,
        income,
        fixed,
        variable,
        totalExpenses,
        balance,
        goal: userGoal,
        isOverSpendingLimit,
        isRed,
        isBlue,
        isMeetingGoal,
      };
    });
  }, [nonAdminUsers, transactions, goals]);

  // Meaningful Admin KPIs requested by user:
  // "quantos usuarios não estão comprindo as metas mensais financeiras, quantos estão no 'vermelho' e quantos estão cumprindo e no 'azul'"
  const healthMetrics = useMemo(() => {
    const total = userStats.length;
    const inRed = userStats.filter((s) => s.isRed).length;
    const inBlue = userStats.filter((s) => s.isBlue).length;
    const meetingGoals = userStats.filter((s) => s.isMeetingGoal).length;
    const failingGoals = userStats.filter((s) => !s.isMeetingGoal).length;
    const expiredSubs = userStats.filter((s) => s.user.subscriptionStatus === 'expired').length;

    const complianceRate = total > 0 ? Math.round((meetingGoals / total) * 100) : 0;
    const healthyRate = total > 0 ? Math.round((inBlue / total) * 100) : 0;

    return {
      total,
      inRed,
      inBlue,
      meetingGoals,
      failingGoals,
      expiredSubs,
      complianceRate,
      healthyRate,
    };
  }, [userStats]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return userStats.filter((s) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = s.user.name.toLowerCase().includes(term);
        const matchesEmail = s.user.email.toLowerCase().includes(term);
        if (!matchesName && !matchesEmail) return false;
      }

      // Status filter
      if (statusFilter === 'red' && !s.isRed) return false;
      if (statusFilter === 'blue' && !s.isBlue) return false;
      if (statusFilter === 'over_limit' && !s.isOverSpendingLimit) return false;
      if (statusFilter === 'meeting_goal' && !s.isMeetingGoal) return false;
      if (statusFilter === 'expired' && s.user.subscriptionStatus !== 'expired') return false;

      return true;
    });
  }, [userStats, searchTerm, statusFilter]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPass.trim()) return;

    onAddUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      pass: newUserPass.trim(),
      role: newUserRole,
      status: 'active',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      planName: 'Mensal',
      preferences: {
        monthlyClosingDay: 5,
        notificationChannels: { email: true, googleCalendar: true, push: true },
        alertDaysAdvance: 2,
      },
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPass('');
    setIsAddUserOpen(false);
  };

  // If viewing single user detail
  if (selectedUserDetail) {
    const userGoal = goals[selectedUserDetail.id] || {
      spendingLimit: 3000,
      savingsGoal: 1000,
      adminNote: '',
      updatedAt: new Date().toISOString().split('T')[0],
    };
    const userTxs = transactions.filter((t) => t.userId === selectedUserDetail.id);
    const updatedSelectedUser = users.find((u) => u.id === selectedUserDetail.id) || selectedUserDetail;

    return (
      <UserDetailView
        user={updatedSelectedUser}
        transactions={userTxs}
        goal={userGoal}
        onBack={() => setSelectedUserDetail(null)}
        onSaveGoal={onSaveGoal}
        onToggleUserStatus={onToggleUserStatus}
        onUpdateSubscription={onUpdateUserSubscription}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Painel de Controle do Administrador
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestão de usuários, saúde orçamentária (Azul vs Vermelho) e controle comercial de assinaturas.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => exportTransactionsToCSV(transactions, 'auditoria-geral-financapp.csv')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Auditoria Geral</span>
          </button>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Usuário</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation (Visão e Metas vs Clientes e Auditoria) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => onTabChange && onTabChange('admin_dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'admin_dashboard'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Visão de Metas & Saúde ({healthMetrics.total})</span>
        </button>

        <button
          onClick={() => onTabChange && onTabChange('admin_users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'admin_users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Clientes & Auditoria ({healthMetrics.total})</span>
        </button>
      </div>

      {/* KPI Cards Focus: Vermelho vs Azul / Cumprindo vs Não Cumprindo Metas (Exibido na Visão de Metas & Saúde) */}
      {activeTab === 'admin_dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-150">
          {/* Usuários no Vermelho */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Usuários no "Vermelho"
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                {healthMetrics.inRed}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {healthMetrics.inRed > 0
                  ? 'Saldo negativo ou gastos acima do teto estipulado'
                  : 'Nenhum usuário em situação de risco'}
              </div>
            </div>
          </div>

          {/* Usuários no Azul */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Usuários no "Azul"
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {healthMetrics.inBlue}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Saldo positivo e gastos dentro do teto ({healthMetrics.healthyRate}% da base)
              </div>
            </div>
          </div>

          {/* Cumprindo Metas Mensais */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Cumprindo Metas
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                {healthMetrics.meetingGoals}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Respeitando o teto de gastos estipulado pelo admin
              </div>
            </div>
          </div>

          {/* Não Cumprindo Metas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Não Cumprindo Metas
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                {healthMetrics.failingGoals}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Precisam de ajuste ou renegociação de teto realista
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Usuários com Abertura da Página de Detalhes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Lista de Clientes & Gestão Comercial de Assinaturas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitore status da assinatura, ative/inative contas, prorrogue prazos e estipule metas realistas.
              </p>
            </div>

            {/* Quick Segmented Filter */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todos ({healthMetrics.total})
              </button>
              <button
                onClick={() => setStatusFilter('red')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'red'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                No Vermelho ({healthMetrics.inRed})
              </button>
              <button
                onClick={() => setStatusFilter('blue')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'blue'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                No Azul ({healthMetrics.inBlue})
              </button>
              <button
                onClick={() => setStatusFilter('expired')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'expired'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Assinatura Vencida ({healthMetrics.expiredSubs})
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar cliente por nome ou e-mail..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Cliente / E-mail</th>
                <th className="py-3 px-4 text-center">Assinatura SaaS</th>
                <th className="py-3 px-4 text-center">Saúde</th>
                <th className="py-3 px-4">Status Meta</th>
                <th className="py-3 px-4 text-right">Teto Estipulado</th>
                <th className="py-3 px-4 text-right">Saldo Atual</th>
                <th className="py-3 px-4 text-center">Controles Rápidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((stat) => (
                  <tr
                    key={stat.user.id}
                    onClick={() => setSelectedUserDetail(stat.user)}
                    className="hover:bg-purple-50/50 dark:hover:bg-slate-800/60 transition cursor-pointer group"
                  >
                    {/* Usuário */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {stat.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition flex items-center gap-1.5">
                            <span>{stat.user.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                stat.user.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700'
                              }`}
                            >
                              {stat.user.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{stat.user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Assinatura SaaS */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            stat.user.subscriptionStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : stat.user.subscriptionStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                          }`}
                        >
                          {stat.user.subscriptionStatus === 'active'
                            ? 'Ativa'
                            : stat.user.subscriptionStatus === 'pending'
                            ? 'Pendente'
                            : 'Expirada'}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Até {formatDateBR(stat.user.subscriptionExpiresAt)}
                        </div>
                      </div>
                    </td>

                    {/* Situação: Vermelho vs Azul */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          stat.isRed
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {stat.isRed ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>No Vermelho</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>No Azul</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Status da Meta */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {stat.isOverSpendingLimit ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3 h-3" />
                          <span>Teto Ultrapassado!</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Cumprindo Teto</span>
                        </span>
                      )}
                    </td>

                    {/* Teto Estipulado */}
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {formatCurrency(stat.goal.spendingLimit)}
                    </td>

                    {/* Saldo Atual */}
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        stat.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatCurrency(stat.balance)}
                    </td>

                    {/* Ações / Controles Rápidos */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center space-x-1.5">
                        {onUpdateUserSubscription && (
                          <button
                            type="button"
                            onClick={() => onUpdateUserSubscription(stat.user.id, 'active', 30)}
                            className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition"
                            title="Prorrogar acesso em 30 dias"
                          >
                            +30d
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedUserDetail(stat.user)}
                          className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <span>Diagnóstico</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir "${stat.user.name}"?`)) {
                              onDeleteUser(stat.user.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastrar Usuário */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-purple-200" />
                <h3 className="font-semibold text-base">Cadastrar Novo Usuário</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-purple-200 hover:text-white p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Amanda Silva"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="amanda@exemplo.com"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Senha Provisória
                </label>
                <input
                  type="password"
                  required
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                >
                  <option value="user">Cliente / Assinante Comum</option>
                  <option value="admin">Administrador Master</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition"
                >
                  Criar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
