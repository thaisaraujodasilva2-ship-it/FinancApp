import React, { useState, useMemo } from 'react';
import { User, Transaction, UserGoal, SubscriptionStatus } from '../types';
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  Save,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  ShieldAlert,
  Clock,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { formatCurrency, formatDateBR, CATEGORY_COLORS, exportTransactionsToCSV } from '../utils/formatters';
import { CategoryDonutChart } from './Charts';

interface UserDetailViewProps {
  user: User;
  transactions: Transaction[];
  goal: UserGoal;
  onBack: () => void;
  onSaveGoal: (userId: string, goal: UserGoal) => void;
  onToggleUserStatus?: (userId: string) => void;
  onUpdateSubscription?: (userId: string, status: SubscriptionStatus, daysToAdd?: number) => void;
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({
  user,
  transactions,
  goal,
  onBack,
  onSaveGoal,
  onToggleUserStatus,
  onUpdateSubscription,
}) => {
  const [spendingLimit, setSpendingLimit] = useState(goal.spendingLimit.toString());
  const [savingsGoal, setSavingsGoal] = useState(goal.savingsGoal.toString());
  const [adminNote, setAdminNote] = useState(goal.adminNote || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Financial calculations
  const metrics = useMemo(() => {
    let income = 0;
    let fixed = 0;
    let variable = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'fixed') fixed += t.amount;
      else if (t.type === 'variable') variable += t.amount;
    });

    const totalExpenses = fixed + variable;
    const balance = income - totalExpenses;
    const isOverLimit = goal.spendingLimit > 0 && totalExpenses > goal.spendingLimit;
    const isRed = balance < 0 || isOverLimit;
    const meetsSavings = goal.savingsGoal > 0 && balance >= goal.savingsGoal;

    return {
      income,
      fixed,
      variable,
      totalExpenses,
      balance,
      isOverLimit,
      isRed,
      meetsSavings,
    };
  }, [transactions, goal]);

  // Installments list
  const activeInstallments = useMemo(() => {
    return transactions.filter((t) => t.installmentInfo);
  }, [transactions]);

  // Realistic goal suggestions based on actual income and fixed commitments
  const suggestedRealisticLimit = useMemo(() => {
    if (metrics.income <= 0) return 2500;
    // Suggest fixed expenses + 50% of remaining income as realistic variable limit
    const remaining = Math.max(0, metrics.income - metrics.fixed);
    const suggested = metrics.fixed + remaining * 0.55;
    return Math.round(suggested / 50) * 50;
  }, [metrics]);

  const suggestedRealisticSavings = useMemo(() => {
    if (metrics.income <= 0) return 500;
    const remaining = Math.max(0, metrics.income - suggestedRealisticLimit);
    return Math.round(remaining / 50) * 50;
  }, [metrics, suggestedRealisticLimit]);

  const applyRealisticSuggestion = () => {
    setSpendingLimit(suggestedRealisticLimit.toString());
    setSavingsGoal(suggestedRealisticSavings.toString());
    setAdminNote(
      `Com base em seus gastos fixos essenciais de ${formatCurrency(metrics.fixed)}, estruturamos um teto de ${formatCurrency(suggestedRealisticLimit)} para permitir uma economia viável de ${formatCurrency(suggestedRealisticSavings)} ao mês.`
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(spendingLimit) || 0;
    const savingsNum = parseFloat(savingsGoal) || 0;

    onSaveGoal(user.id, {
      spendingLimit: limitNum,
      savingsGoal: savingsNum,
      adminNote: adminNote.trim(),
      updatedAt: new Date().toISOString().split('T')[0],
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const filteredTxs = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(
      (t) =>
        t.desc.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        t.paymentMethod?.toLowerCase().includes(term)
    );
  }, [transactions, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-3.5 py-2 rounded-xl transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Usuários</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportTransactionsToCSV(transactions, `extrato-${user.name.toLowerCase().replace(/\s+/g, '-')}.csv`)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Extrato deste Usuário</span>
          </button>
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    metrics.isRed
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  {metrics.isRed ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      <span>No Vermelho / Em Risco</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>No Azul / Equilibrado</span>
                    </>
                  )}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.status === 'active'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  Conta: {user.status === 'active' ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Cadastrado em: {formatDateBR(user.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" /> Total de {transactions.length} transações
                </span>
              </div>
            </div>
          </div>

          {/* SaaS Commercial Subscription Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                Assinatura SaaS:
                <span
                  className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                    user.subscriptionStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : user.subscriptionStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}
                >
                  {user.subscriptionStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Vence em: <span className="font-mono font-medium">{formatDateBR(user.subscriptionExpiresAt)}</span>
              </p>
            </div>

            {onUpdateSubscription && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onUpdateSubscription(user.id, 'active', 30)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition"
                  title="Prorrogar acesso em 30 dias"
                >
                  +30 Dias
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSubscription(user.id, 'active', 90)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition"
                  title="Prorrogar acesso em 90 dias"
                >
                  +90 Dias
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSubscription(
                      user.id,
                      user.subscriptionStatus === 'expired' ? 'active' : 'expired'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold transition"
                  title="Alternar entre Pago/Ativo e Expirado"
                >
                  {user.subscriptionStatus === 'expired' ? 'Liberar' : 'Bloquear'}
                </button>
              </div>
            )}

            {onToggleUserStatus && (
              <button
                type="button"
                onClick={() => onToggleUserStatus(user.id)}
                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                {user.status === 'active' ? 'Inativar' : 'Ativar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Health KPIs for this user */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Receitas Totais
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(metrics.income)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Entradas e salários</p>
        </div>

        {/* Gastos Fixos & Parcelas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gastos Fixos & Parcelas
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {formatCurrency(metrics.fixed)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeInstallments.length} compras parceladas ativas
          </p>
        </div>

        {/* Gastos Variáveis */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gastos Variáveis
          </span>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {formatCurrency(metrics.variable)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lazer, alimentação e extras</p>
        </div>

        {/* Saldo Líquido Atual */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo Atual Líquido
          </span>
          <div
            className={`text-2xl font-bold font-mono mt-1 tabular-nums ${
              metrics.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(metrics.balance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Gastos totais: {formatCurrency(metrics.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Consultoria Financeira & Definição de Metas Realistas */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <PiggyBank className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base text-white">
                  Consultoria & Estipulação de Metas Realistas
                </h3>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Defina metas que o usuário realmente consiga cumprir com base em seus compromissos fixos.
              </p>
            </div>

            <button
              type="button"
              onClick={applyRealisticSuggestion}
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-xs transition"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Sugerir Metas Realistas Automaticamente</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Metas atualizadas e entregues com sucesso ao painel de {user.name}!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Teto Limite de Gastos Mensais (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-medium text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spendingLimit}
                  onChange={(e) => setSpendingLimit(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Gasto real atual: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(metrics.totalExpenses)}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Meta de Poupança / Reserva Mensal (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-medium text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Saldo economizado atual: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(Math.max(0, metrics.balance))}</strong>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Orientações, Diagnóstico e Plano de Ação para o Usuário
            </label>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ex: Identificamos que o parcelamento de eletrônicos compromete 30% da sua renda. Recomendamos priorizar a quitação dessas parcelas antes de assumir novos parcelamentos..."
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Diretrizes e Metas Realistas</span>
            </button>
          </div>
        </form>
      </div>

      {/* Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonutChart transactions={transactions} />

        {/* Parcelamentos Ativos */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Compras Parceladas em Andamento
            </h3>
          </div>
          {activeInstallments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Nenhuma compra parcelada registrada para este usuário.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {activeInstallments.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{inst.desc}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Vencimento: {formatDateBR(inst.date)}</span>
                      <span>·</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400">
                        {inst.installmentInfo?.current}/{inst.installmentInfo?.total} parcelas
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {formatCurrency(inst.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transações deste Usuário */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Extrato Detalhado de Lançamentos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredTxs.length} lançamento(s) registrado(s)
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar lançamento..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((t) => {
                  const catStyle = CATEGORY_COLORS[t.category] || CATEGORY_COLORS['Outros'];
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateBR(t.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center space-x-2">
                          <span>{t.desc}</span>
                          {t.installmentInfo && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                              <Layers className="w-3 h-3" />
                              {t.installmentInfo.current}/{t.installmentInfo.total}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${catStyle.text}`}>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: catStyle.fill }}
                          />
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            t.type === 'income'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : t.type === 'fixed'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {t.type === 'income' ? 'Receita' : t.type === 'fixed' ? 'Fixo / Parcela' : 'Variável'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {t.paymentMethod || '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums text-sm ${
                          t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
