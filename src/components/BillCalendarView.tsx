import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Bell,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { formatCurrency, formatDateBR, CATEGORY_COLORS } from '../utils/formatters';

interface BillCalendarViewProps {
  transactions: Transaction[];
  onTogglePaid: (txId: string) => void;
  onOpenNewTxForDate?: (dateStr: string) => void;
}

export const BillCalendarView: React.FC<BillCalendarViewProps> = ({
  transactions,
  onTogglePaid,
  onOpenNewTxForDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Today reference
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const targetYear = currentDate.getFullYear();
  const targetMonth = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(targetYear, targetMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(targetYear, targetMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDayStr(todayStr);
  };

  // Due Date Alerts (Hoje, Em 2 Dias, Atrasadas)
  const dueAlerts = useMemo(() => {
    const todayMs = new Date(todayStr + 'T00:00:00').getTime();
    const twoDaysMs = todayMs + 2 * 24 * 60 * 60 * 1000;

    const dueToday: Transaction[] = [];
    const dueIn2Days: Transaction[] = [];
    const overdue: Transaction[] = [];

    transactions.forEach((t) => {
      if (t.type === 'income' || t.isPaid) return;
      const refDateStr = t.dueDate || t.date;
      if (!refDateStr) return;

      const billMs = new Date(refDateStr + 'T00:00:00').getTime();

      if (refDateStr === todayStr) {
        dueToday.push(t);
      } else if (billMs > todayMs && billMs <= twoDaysMs) {
        dueIn2Days.push(t);
      } else if (billMs < todayMs) {
        overdue.push(t);
      }
    });

    return { dueToday, dueIn2Days, overdue };
  }, [transactions, todayStr]);

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(targetYear, targetMonth, 1).getDay(); // 0 is Sun
    const totalDays = new Date(targetYear, targetMonth + 1, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(targetYear, targetMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = targetMonth === 0 ? 12 : targetMonth;
      const y = targetMonth === 0 ? targetYear - 1 : targetYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const m = targetMonth + 1;
      const dateStr = `${targetYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = targetMonth === 11 ? 1 : targetMonth + 2;
      const y = targetMonth === 11 ? targetYear + 1 : targetYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [targetYear, targetMonth]);

  // Map transactions by date
  const txByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      const d = t.dueDate || t.date;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [transactions]);

  // Transactions for selected day
  const selectedDayTransactions = useMemo(() => {
    return txByDate[selectedDayStr] || [];
  }, [txByDate, selectedDayStr]);

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  return (
    <div className="space-y-6">
      {/* Alertas de Vencimento Antecipados (2 dias antes e no dia) */}
      {(dueAlerts.dueToday.length > 0 || dueAlerts.dueIn2Days.length > 0 || dueAlerts.overdue.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
            <span>Alertas de Vencimento Antecipados & Urgentes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Vence Hoje */}
            {dueAlerts.dueToday.length > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span>VENCE HOJE ({dueAlerts.dueToday.length})</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-800 dark:text-rose-200">
                    {formatCurrency(dueAlerts.dueToday.reduce((a, b) => a + b.amount, 0))}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {dueAlerts.dueToday.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs border border-rose-100 dark:border-rose-900/40"
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.desc}</div>
                        <div className="text-[10px] text-slate-400">{t.paymentMethod}</div>
                      </div>
                      <button
                        onClick={() => onTogglePaid(t.id)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition"
                      >
                        Pagar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vence em até 2 Dias */}
            {dueAlerts.dueIn2Days.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>VENCE EM ATÉ 2 DIAS ({dueAlerts.dueIn2Days.length})</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-200">
                    {formatCurrency(dueAlerts.dueIn2Days.reduce((a, b) => a + b.amount, 0))}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {dueAlerts.dueIn2Days.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs border border-amber-100 dark:border-amber-900/40"
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.desc}</div>
                        <div className="text-[10px] text-slate-400">Vence em: {formatDateBR(t.dueDate || t.date)}</div>
                      </div>
                      <button
                        onClick={() => onTogglePaid(t.id)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition"
                      >
                        Pagar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contas em Atraso */}
            {dueAlerts.overdue.length > 0 && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>EM ATRASO ({dueAlerts.overdue.length})</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(dueAlerts.overdue.reduce((a, b) => a + b.amount, 0))}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {dueAlerts.overdue.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs border border-slate-200 dark:border-slate-700"
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.desc}</div>
                        <div className="text-[10px] text-red-500">Venceu em: {formatDateBR(t.dueDate || t.date)}</div>
                      </div>
                      <button
                        onClick={() => onTogglePaid(t.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold shrink-0 transition"
                      >
                        Regularizar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendário Visual Interativo de Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grade do Calendário */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Navegação do Mês */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {monthNames[targetMonth]} de {targetYear}
                </h3>
                <p className="text-xs text-slate-400">Sinalização visual de contas a pagar e vencimentos</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
              >
                Hoje
              </button>
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={prevMonth}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-2.5 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 p-px">
            {calendarDays.map((item, index) => {
              const dayTxs = txByDate[item.dateStr] || [];
              const pendingBills = dayTxs.filter((t) => t.type !== 'income' && !t.isPaid);
              const paidOrIncomes = dayTxs.filter((t) => t.isPaid || t.type === 'income');
              const isSelected = item.dateStr === selectedDayStr;
              const isToday = item.dateStr === todayStr;

              const totalPending = pendingBills.reduce((acc, t) => acc + t.amount, 0);

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDayStr(item.dateStr)}
                  className={`min-h-[72px] sm:min-h-[88px] p-2 flex flex-col justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500 ring-inset z-10'
                      : item.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                      : 'bg-slate-50/70 dark:bg-slate-950/70 text-slate-400 dark:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : isSelected
                          ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.day}
                    </span>
                    {pendingBills.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>

                  {/* Badges do dia */}
                  <div className="space-y-1 mt-1">
                    {totalPending > 0 && (
                      <div className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold truncate">
                        -{formatCurrency(totalPending)}
                      </div>
                    )}
                    {paidOrIncomes.length > 0 && totalPending === 0 && (
                      <div className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold truncate">
                        ✓ {paidOrIncomes.length} pagas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalhes do Dia Selecionado */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400">Dia Selecionado</span>
                <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 font-mono">
                  {formatDateBR(selectedDayStr)}
                </h4>
              </div>
              {onOpenNewTxForDate && (
                <button
                  type="button"
                  onClick={() => onOpenNewTxForDate(selectedDayStr)}
                  className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl transition"
                  title="Lançar conta para este dia"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedDayTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">Nenhuma conta com vencimento nesta data.</p>
                {onOpenNewTxForDate && (
                  <button
                    type="button"
                    onClick={() => onOpenNewTxForDate(selectedDayStr)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    + Adicionar conta para este dia
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto">
                {selectedDayTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 transition ${
                      tx.isPaid
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
                        : 'bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900/60 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{tx.desc}</div>
                        <div className="text-[11px] text-slate-400">
                          {tx.category} · {tx.paymentMethod}
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold text-sm tabular-nums shrink-0 ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                      <span
                        className={`font-semibold ${
                          tx.isPaid ? 'text-emerald-600' : 'text-rose-600 font-bold'
                        }`}
                      >
                        {tx.isPaid ? '✓ Liquidado / Pago' : '⏳ Pendente de Pagamento'}
                      </span>

                      {tx.type !== 'income' && (
                        <button
                          type="button"
                          onClick={() => onTogglePaid(tx.id)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                            tx.isPaid
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          {tx.isPaid ? 'Desmarcar' : 'Marcar como Pago'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo do dia */}
          {selectedDayTransactions.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline text-xs">
              <span className="text-slate-500 font-medium">Total do dia:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base">
                {formatCurrency(
                  selectedDayTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
