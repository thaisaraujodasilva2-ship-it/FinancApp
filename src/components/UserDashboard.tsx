import React, { useState, useMemo } from 'react';
import { User, Transaction, UserGoal, TransactionType, Category, GoalChecklistItem } from '../types';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Mic,
  FileText,
  Clock,
  Sparkles,
  Bell,
  Check,
  Utensils,
  CheckSquare,
  Square,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatDateBR, exportTransactionsToCSV, CATEGORY_COLORS } from '../utils/formatters';
import { CategoryDonutChart, CashFlowDistribution } from './Charts';
import { TransactionModal } from './TransactionModal';
import { BillCalendarView } from './BillCalendarView';

interface UserDashboardProps {
  user: User;
  transactions: Transaction[];
  goal: UserGoal;
  onAddTransaction: (tx: Omit<Transaction, 'id'>, generateFutureInstallments?: boolean) => void;
  onUpdateTransaction: (id: string, tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onTogglePaid?: (txId: string) => void;
  onOpenVoiceAssistant?: () => void;
  onOpenMonthlyReport?: () => void;
  onUpdateGoals?: (updatedGoal: UserGoal) => void;
  onUpdateFoodCard?: (newBalance: number) => void;
  isAuditing?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  transactions,
  goal,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onTogglePaid,
  onOpenVoiceAssistant,
  onOpenMonthlyReport,
  onUpdateGoals,
  onUpdateFoodCard,
  isAuditing = false,
  activeTab = 'dashboard',
  onTabChange,
}) => {
  // Navigation tabs: 'overview' | 'installments' | 'calendar'
  const [activeView, setActiveView] = useState<'overview' | 'installments' | 'calendar'>('overview');

  // Sync external header navigation tab
  React.useEffect(() => {
    if (activeTab === 'transactions') {
      setActiveView('installments');
    } else if (activeTab === 'dashboard') {
      setActiveView('overview');
    }
  }, [activeTab]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Category>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Food Card editing modal/state
  const [isEditingFoodCard, setIsEditingFoodCard] = useState(false);
  const [foodCardInput, setFoodCardInput] = useState((user.foodCardBalance ?? 850).toString());

  // Month options derived from transactions
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        months.add(t.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Urgent Due Date Alerts: Hoje, Em 2 Dias, Atrasadas
  const urgentAlerts = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    const twoDaysMs = todayMs + 2 * 24 * 60 * 60 * 1000;

    const dueToday: Transaction[] = [];
    const dueIn2Days: Transaction[] = [];
    const overdue: Transaction[] = [];

    transactions.forEach((t) => {
      if (t.type === 'income' || t.isPaid) return;
      const effectiveDateStr = t.dueDate || t.date;
      const targetMs = new Date(effectiveDateStr + 'T00:00:00').getTime();

      if (effectiveDateStr === todayStr) {
        dueToday.push(t);
      } else if (targetMs > todayMs && targetMs <= twoDaysMs) {
        dueIn2Days.push(t);
      } else if (targetMs < todayMs) {
        overdue.push(t);
      }
    });

    return { dueToday, dueIn2Days, overdue };
  }, [transactions]);

  // FINANCIAL VALIDATION (Item 6 do Prompt)
  // Saldo Líquido = Receitas - (Gastos Fixos Pagos) - (Gastos Variáveis Incluídos)
  const metrics = useMemo(() => {
    let income = 0;
    let fixedTotal = 0;
    let fixedPaid = 0;
    let fixedPending = 0;
    let variable = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'fixed') {
        fixedTotal += t.amount;
        if (t.isPaid) {
          fixedPaid += t.amount;
        } else {
          fixedPending += t.amount;
        }
      } else if (t.type === 'variable') {
        variable += t.amount;
      }
    });

    // Automated Liquid Balance formula
    const liquidBalance = income - fixedPaid - variable;
    const totalExpenses = fixedTotal + variable;
    const savingsRate = income > 0 ? Math.max(0, (liquidBalance / income) * 100) : 0;

    return {
      income,
      fixedTotal,
      fixedPaid,
      fixedPending,
      variable,
      totalExpenses,
      liquidBalance,
      savingsRate,
    };
  }, [transactions]);

  // CONTROLE DE PAGAMENTOS (Pagas vs. Pendentes - Item 4 do Prompt)
  // Adicionar indicador numérico claro (ex: 13 pagas de 15 cadastradas)
  const billPaymentStats = useMemo(() => {
    const expenseBills = transactions.filter((t) => t.type !== 'income');
    const total = expenseBills.length;
    const paid = expenseBills.filter((t) => t.isPaid).length;
    const pending = total - paid;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 100;

    return {
      total,
      paid,
      pending,
      percentage,
    };
  }, [transactions]);

  // CARTÃO ALIMENTAÇÃO METRICS (Item 1 do Prompt)
  const foodCardStats = useMemo(() => {
    const foodExpenses = transactions
      .filter((t) => t.category === 'Alimentação' || t.paymentMethod === 'Cartão Alimentação')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = user.foodCardBalance ?? 850;
    const allowance = user.foodCardMonthlyAllowance ?? 1200;
    const consumedPct = allowance > 0 ? Math.min(100, (foodExpenses / allowance) * 100) : 0;

    return {
      balance,
      allowance,
      foodExpenses,
      consumedPct,
    };
  }, [transactions, user]);

  // CHECKLIST DE METAS INTEGRADA (Item 4 do Prompt)
  // Conforme o usuário for ticando, o dashboard atualiza em tempo real
  const checklist = useMemo(() => {
    return (
      goal.checklistGoals || [
        {
          id: 'g-1',
          title: `Manter gastos fixos e variáveis abaixo do teto de ${formatCurrency(goal.spendingLimit || 3500)}`,
          completed: metrics.totalExpenses <= (goal.spendingLimit || 3500),
          target: `Teto: ${formatCurrency(goal.spendingLimit || 3500)}`,
        },
        {
          id: 'g-2',
          title: `Reservar ${formatCurrency(goal.savingsGoal || 1000)} na poupança ou investimentos`,
          completed: metrics.liquidBalance >= (goal.savingsGoal || 1000),
          target: `Meta: ${formatCurrency(goal.savingsGoal || 1000)}`,
        },
        {
          id: 'g-3',
          title: 'Quitar 100% das contas do mês sem pagar juros ou multas',
          completed: urgentAlerts.overdue.length === 0 && billPaymentStats.pending === 0,
          target: 'Pontualidade Total',
        },
        {
          id: 'g-4',
          title: `Manter consumo dentro da recarga do Cartão Alimentação (${formatCurrency(foodCardStats.allowance)})`,
          completed: foodCardStats.foodExpenses <= foodCardStats.allowance,
          target: `VR: ${formatCurrency(foodCardStats.allowance)}`,
        },
      ]
    );
  }, [goal, metrics, urgentAlerts, billPaymentStats, foodCardStats]);

  const checklistProgress = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((c) => c.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [checklist]);

  const handleToggleChecklistGoal = (goalId: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === goalId ? { ...item, completed: !item.completed } : item
    );

    if (onUpdateGoals) {
      onUpdateGoals({
        ...goal,
        checklistGoals: updatedChecklist,
      });
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = t.desc.toLowerCase().includes(term);
        const matchesCat = t.category.toLowerCase().includes(term);
        const matchesPayment = t.paymentMethod?.toLowerCase().includes(term);
        if (!matchesDesc && !matchesCat && !matchesPayment) return false;
      }

      // Type
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== 'all' && t.category !== categoryFilter) {
        return false;
      }

      // Month
      if (monthFilter !== 'all') {
        if (!t.date.startsWith(monthFilter)) return false;
      }

      // Payment Status
      if (paymentStatusFilter === 'paid' && !t.isPaid) return false;
      if (paymentStatusFilter === 'pending' && (t.isPaid || t.type === 'income')) return false;

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, typeFilter, categoryFilter, monthFilter, paymentStatusFilter]);

  // Installments list for "Status e Parcelas" tab (Item 1 do Prompt)
  const installmentsList = useMemo(() => {
    return transactions.filter((t) => Boolean(t.installmentInfo));
  }, [transactions]);

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleModalSave = (payload: Omit<Transaction, 'id'>, generateFuture?: boolean) => {
    if (editingTx && editingTx.id) {
      onUpdateTransaction(editingTx.id, payload);
    } else {
      onAddTransaction(payload, generateFuture);
    }
  };

  const handleSaveFoodCard = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(foodCardInput);
    if (!isNaN(val) && onUpdateFoodCard) {
      onUpdateFoodCard(val);
      setIsEditingFoodCard(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Painel Financeiro
            </h1>
            {isAuditing && (
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                Modo Auditoria Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestão integrada com assistente Gemini, metas em tempo real e controle de vencimentos.
          </p>
        </div>

        {/* Action Buttons: Voice Assistant, Monthly Report, Add Tx */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl transition shadow-xs group"
              title="Lançar transação falando com o Gemini"
            >
              <Mic className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>Voz com Gemini</span>
              <Sparkles className="w-3 h-3 text-indigo-200" />
            </button>
          )}

          {onOpenMonthlyReport && (
            <button
              onClick={onOpenMonthlyReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Relatório Mensal</span>
            </button>
          )}

          <button
            onClick={() => exportTransactionsToCSV(filteredTransactions, `financapp-${user.name.toLowerCase().replace(/\s+/g, '-')}.csv`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingTx(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: METAS INTEGRADA NO TOPO DO PAINEL (Item 4 do Prompt) */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-700/40 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                <span>Metas Mensais & Hábitos Financeiros</span>
                <span className="text-[10px] bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
                  {checklistProgress.completed} de {checklistProgress.total} cumpridas ({checklistProgress.pct}%)
                </span>
              </h2>
              <p className="text-[11px] text-indigo-200">
                Marque suas metas alcançadas. O dashboard atualiza o progresso e o saldo em tempo real!
              </p>
            </div>
          </div>

          {/* Barra de Progresso das Metas */}
          <div className="w-full sm:w-48 space-y-1">
            <div className="flex justify-between text-[11px] text-indigo-200">
              <span>Progresso Real</span>
              <span className="font-bold text-amber-300">{checklistProgress.pct}%</span>
            </div>
            <div className="w-full bg-indigo-950/80 rounded-full h-2 overflow-hidden border border-indigo-700/60">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${checklistProgress.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Checklist Interativo de Metas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleChecklistGoal(item.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                item.completed
                  ? 'bg-indigo-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="shrink-0 text-amber-300">
                  {item.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <span className={`text-xs font-medium leading-snug ${item.completed ? 'line-through opacity-80' : ''}`}>
                  {item.title}
                </span>
              </div>
              {item.target && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 shrink-0 ml-2">
                  {item.target}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2: CARTÃO ALIMENTAÇÃO & CONTROLE DE CONTAS PAGAS (Item 1 & 4 do Prompt) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cartão Alimentação Destacado na Frente */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:to-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider">Cartão Alimentação (VR/VA)</h3>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Recarga dia {user.foodCardClosingDay || 5} do mês
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditingFoodCard(true)}
              className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
            >
              Ajustar Saldo
            </button>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Saldo Disponível no VR</div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(foodCardStats.balance)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Recarga contratada: {formatCurrency(foodCardStats.allowance)}</span>
              <span className="font-mono text-amber-600 font-bold">
                Gasto: {formatCurrency(foodCardStats.foodExpenses)}
              </span>
            </div>
          </div>

          {/* Botão rápido: lançar no cartão alimentação */}
          <button
            onClick={() => {
              setEditingTx({
                id: '',
                userId: user.id,
                desc: 'Almoço / Refeição',
                amount: 35.0,
                type: 'variable',
                category: 'Alimentação',
                date: new Date().toISOString().split('T')[0],
                paymentMethod: 'Cartão Alimentação',
                isPaid: true,
              });
              setIsModalOpen(true);
            }}
            className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Gasto com Alimentação</span>
          </button>
        </div>

        {/* Indicador Numérico de Contas Pagas vs. Pendentes (Item 4 do Prompt) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Controle de Faturas & Pagamentos
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                billPaymentStats.pending === 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {billPaymentStats.pending === 0 ? 'Tudo Pago 🎉' : `${billPaymentStats.pending} Pendente(s)`}
            </span>
          </div>

          <div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tabular-nums flex items-baseline gap-1.5">
              <span>{billPaymentStats.paid} pagas</span>
              <span className="text-sm font-semibold text-slate-400">de {billPaymentStats.total} cadastradas</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {billPaymentStats.percentage}% das faturas do ciclo já foram liquidadas
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                billPaymentStats.percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${billPaymentStats.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Fixos quitados: {formatCurrency(metrics.fixedPaid)}</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold">
              A vencer: {formatCurrency(metrics.fixedPending)}
            </span>
          </div>
        </div>

        {/* Saldo Líquido Automatizado (Item 6 do Prompt: Saldo Líquido = Receitas - Fixos Pagos - Variáveis) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Saldo Líquido Disponível
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Caixa Real</span>
          </div>

          <div>
            <div
              className={`text-2xl font-black font-mono tabular-nums ${
                metrics.liquidBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(metrics.liquidBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Receitas ({formatCurrency(metrics.income)}) - Fixos Pagos ({formatCurrency(metrics.fixedPaid)}) - Variáveis ({formatCurrency(metrics.variable)})
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Taxa de Poupança:</span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.savingsRate.toFixed(1)}% da renda
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: ALERTAS DE VENCIMENTO ANTECIPADOS TOTALMENTE CLICÁVEIS (Item 1 do Prompt) */}
      {(urgentAlerts.overdue.length > 0 || urgentAlerts.dueToday.length > 0 || urgentAlerts.dueIn2Days.length > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300">
              <Bell className="w-4 h-4 animate-bounce" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Alertas de Vencimento Antecipados (Hoje e em 2 Dias)
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium hidden sm:inline">
              Clique em qualquer conta para ajustar, editar ou apagar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Vencem Hoje */}
            <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-rose-600 dark:text-rose-400">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Vencem Hoje
                </span>
                <span className="font-mono">{urgentAlerts.dueToday.length}</span>
              </div>
              {urgentAlerts.dueToday.length > 0 ? (
                <div className="space-y-1.5">
                  {urgentAlerts.dueToday.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer transition border border-transparent hover:border-rose-200 flex items-center justify-between group"
                      title="Clique para editar ou pagar esta conta"
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600">
                          {t.desc}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatDateBR(t.dueDate || t.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(t.amount)}
                        </span>
                        {onTogglePaid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePaid(t.id);
                            }}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded font-sans font-semibold shadow-2xs"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Nenhuma conta vence hoje.</p>
              )}
            </div>

            {/* Vencem em até 2 dias */}
            <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Vencem em 2 dias
                </span>
                <span className="font-mono">{urgentAlerts.dueIn2Days.length}</span>
              </div>
              {urgentAlerts.dueIn2Days.length > 0 ? (
                <div className="space-y-1.5">
                  {urgentAlerts.dueIn2Days.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer transition border border-transparent hover:border-amber-200 flex items-center justify-between group"
                      title="Clique para editar ou pagar esta conta"
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-600">
                          {t.desc}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatDateBR(t.dueDate || t.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(t.amount)}
                        </span>
                        {onTogglePaid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePaid(t.id);
                            }}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded font-sans font-semibold shadow-2xs"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Nenhum vencimento iminente.</p>
              )}
            </div>

            {/* Contas em Atraso */}
            <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-rose-700 dark:text-rose-400">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Contas Atrasadas
                </span>
                <span className="font-mono">{urgentAlerts.overdue.length}</span>
              </div>
              {urgentAlerts.overdue.length > 0 ? (
                <div className="space-y-1.5">
                  {urgentAlerts.overdue.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer transition border border-transparent hover:border-rose-200 flex items-center justify-between group"
                      title="Clique para editar ou pagar esta conta"
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600">
                          {t.desc}
                        </div>
                        <div className="text-[10px] text-rose-500 font-mono font-bold">
                          Venceu em {formatDateBR(t.dueDate || t.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(t.amount)}
                        </span>
                        {onTogglePaid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePaid(t.id);
                            }}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded font-sans font-semibold shadow-2xs"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Sem contas atrasadas. Parabéns!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: NAVEGAÇÃO DE ABAS CORRIGIDA (Item 1 do Prompt) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Visão Geral & Extrato</span>
          </button>

          {/* Aba "Status e Parcelas" (Item 1 do Prompt) */}
          <button
            onClick={() => setActiveView('installments')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'installments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Status e Parcelas ({installmentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveView('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'calendar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendário de Contas</span>
          </button>
        </div>
      </div>

      {/* VIEW: STATUS E PARCELAS (Item 1 do Prompt) */}
      {activeView === 'installments' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Gestão de Compras Parceladas & Cartões</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Acompanhe o status de quitação de cada parcela, vencimentos futuros e valor total comprometido.
              </p>
            </div>
          </div>

          {installmentsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma compra parcelada registrada. Ao cadastrar um lançamento, ative a opção "Compra parcelada".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {installmentsList.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => handleEdit(inst)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition">
                      {inst.desc}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                      {inst.installmentInfo?.current}/{inst.installmentInfo?.total} parcelas
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Vencimento: {formatDateBR(inst.dueDate || inst.date)}</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{inst.category} · {inst.paymentMethod || 'Cartão'}</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        inst.isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {inst.isPaid ? 'Parcela Paga' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeView === 'calendar' ? (
        <BillCalendarView
          transactions={transactions}
          onTogglePaid={onTogglePaid || (() => {})}
          onOpenNewTxForDate={(dateStr) => {
            setEditingTx({
              id: '',
              userId: user.id,
              desc: '',
              amount: 0,
              type: 'fixed',
              category: 'Outros',
              date: dateStr,
              dueDate: dateStr,
              isPaid: false,
            });
            setIsModalOpen(true);
          }}
        />
      ) : (
        /* VIEW: VISÃO GERAL & EXTRATO */
        <>
          {/* KPI Cards Row - Clicáveis (Item 1 do Prompt: clique na seção de Gastos Fixos abre a tela interna) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receitas */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Receitas
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
                  {formatCurrency(metrics.income)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Entradas confirmadas no período</div>
              </div>
            </div>

            {/* Gastos Fixos & Parcelas (CLICÁVEL - Abre filtro de gastos fixos - Item 1 do Prompt) */}
            <div
              onClick={() => {
                setTypeFilter('fixed');
                // Scroll to transactions table
                document.getElementById('tabela-lancamentos')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer transition group"
              title="Clique para abrir e filtrar Gastos Fixos na tabela"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-amber-600">
                  Gastos Fixos & Parcelas ↗
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatCurrency(metrics.fixedTotal)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Quitados: {formatCurrency(metrics.fixedPaid)}</span>
                  <span className="text-amber-600 font-semibold font-mono">
                    Pendente: {formatCurrency(metrics.fixedPending)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gastos Variáveis */}
            <div
              onClick={() => {
                setTypeFilter('variable');
                document.getElementById('tabela-lancamentos')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-rose-400 cursor-pointer transition group"
              title="Clique para filtrar Gastos Variáveis"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-rose-600">
                  Gastos Variáveis ↗
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCurrency(metrics.variable)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Mercado, lazer e delivery</div>
              </div>
            </div>

            {/* Saldo Líquido de Caixa */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Saldo Líquido
                </span>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    metrics.liquidBalance >= 0 ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400' : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                  }`}
                >
                  {metrics.liquidBalance >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="mt-2">
                <div
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    metrics.liquidBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(metrics.liquidBalance)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Taxa de economia: {metrics.savingsRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos de Distribuição */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryDonutChart transactions={transactions} />
            <CashFlowDistribution
              income={metrics.income}
              fixed={metrics.fixedTotal}
              variable={metrics.variable}
              savingsGoal={goal.savingsGoal || 0}
            />
          </div>

          {/* Tabela de Lançamentos & Vencimentos Conectados ao Caixa */}
          <div
            id="tabela-lancamentos"
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden"
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Histórico de Lançamentos & Rastreabilidade de Vencimentos</span>
                    {typeFilter !== 'all' && (
                      <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
                        Filtro: {typeFilter === 'fixed' ? 'Gastos Fixos' : 'Gastos Variáveis'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {filteredTransactions.length} registro(s) encontrado(s) · Conectado ao caixa fixo
                  </p>
                </div>

                {typeFilter !== 'all' && (
                  <button
                    onClick={() => setTypeFilter('all')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Limpar filtro de tipo
                  </button>
                )}
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="income">Receitas (+)</option>
                    <option value="fixed">Gastos Fixos (-)</option>
                    <option value="variable">Gastos Variáveis (-)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <option value="all">Todas as Categorias</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Salário">Salário</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <option value="all">Status: Todos</option>
                    <option value="paid">Apenas Pagas</option>
                    <option value="pending">Apenas Pendentes</option>
                  </select>
                </div>

                <div>
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    <option value="all">Todos os Meses</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Status / Caixa</th>
                    <th className="py-3 px-4">Data / Venc.</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Forma</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p>Nenhuma transação encontrada com os filtros selecionados.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => {
                      const catStyle = CATEGORY_COLORS[t.category] || CATEGORY_COLORS['Outros'];
                      const isOverdue = t.type !== 'income' && !t.isPaid && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0];
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {t.type === 'income' ? (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Recebido
                              </span>
                            ) : (
                              <button
                                onClick={() => onTogglePaid && onTogglePaid(t.id)}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                                  t.isPaid
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : isOverdue
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 ring-1 ring-rose-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                }`}
                                title="Clique para alterar status no caixa"
                              >
                                {t.isPaid ? (
                                  <>
                                    <Check className="w-3 h-3" /> Pago no Caixa
                                  </>
                                ) : isOverdue ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3" /> Atrasada
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" /> Pendente
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <div>{formatDateBR(t.date)}</div>
                            {t.dueDate && t.dueDate !== t.date && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                Venc: {formatDateBR(t.dueDate)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                            <div className="flex items-center space-x-2">
                              <span>{t.desc}</span>
                              {t.installmentInfo && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                  <Layers className="w-3 h-3" />
                                  {t.installmentInfo.current}/{t.installmentInfo.total}
                                </span>
                              )}
                            </div>
                            {t.notes && (
                              <div className="text-[11px] text-slate-400 italic mt-0.5">{t.notes}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${catStyle.text}`}>
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: catStyle.fill }}
                              />
                              {t.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
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
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {t.paymentMethod || '—'}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums text-sm ${
                              t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1">
                              <button
                                onClick={() => handleEdit(t)}
                                title="Editar lançamento"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja realmente excluir "${t.desc}"?`)) {
                                    onDeleteTransaction(t.id);
                                  }
                                }}
                                title="Excluir lançamento"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal de Ajuste do Cartão Alimentação */}
      {isEditingFoodCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-amber-500" />
                <span>Atualizar Saldo do Cartão Alimentação</span>
              </h3>
              <button
                onClick={() => setIsEditingFoodCard(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFoodCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Novo Saldo Disponível (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={foodCardInput}
                  onChange={(e) => setFoodCardInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFoodCard(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                >
                  Salvar Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isModalOpen && (
        <TransactionModal
          userId={user.id}
          initialData={editingTx}
          onSave={handleModalSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTx(null);
          }}
        />
      )}
    </div>
  );
};
