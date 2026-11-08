import React, { useState, useEffect } from 'react';
import { User, Transaction, MonthlyReport } from '../types';
import {
  FileText,
  X,
  Sparkles,
  Mail,
  Smartphone,
  CheckCircle,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MonthlyReportModalProps {
  user: User;
  transactions: Transaction[];
  onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  user,
  transactions,
  onClose,
}) => {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate monthly metrics
  const lastMonthName = 'Outubro / Ciclo Anterior';

  useEffect(() => {
    generateReport();
  }, [user.id]);

  const generateReport = async () => {
    setLoading(true);

    const income = transactions.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter((t) => t.type !== 'income').reduce((a, b) => a + b.amount, 0);
    const balance = income - expenses;

    // Top categories
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter((t) => t.type !== 'income')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
      }));

    try {
      const response = await fetch('/api/gemini/monthly-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user.name,
          month: lastMonthName,
          income,
          expenses,
          balance,
          topCategories,
        }),
      });

      const data = await response.json();
      if (data.success && data.report) {
        setReport({
          id: `rep-${Date.now()}`,
          userId: user.id,
          month: lastMonthName,
          generatedAt: new Date().toISOString(),
          income,
          expenses,
          balance,
          greeting: data.report.greeting,
          healthDiagnosis: data.report.healthDiagnosis,
          insights: data.report.insights,
          closingMotto: data.report.closingMotto,
          topCategories,
          deliveredChannels: {
            emailSent: user.preferences?.notificationChannels?.email ?? true,
            pushSent: user.preferences?.notificationChannels?.push ?? true,
          },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">Relatório Mensal de Fechamento de Ciclo</h3>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  Robô Dia 1º
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Disparado automaticamente para assinantes ativos no fechamento de ciclo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              O robô do FinancApp está compilando seus dados e gerando insights com a IA Gemini...
            </p>
          </div>
        ) : report ? (
          <div className="p-6 space-y-6 text-slate-800 dark:text-slate-100">
            {/* Status de Notificação Multicanal Disparada */}
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                  Notificações Multicanal Disparadas com Sucesso:
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  E-mail: <strong>{user.email}</strong>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  Push Celular: <strong>Ativo</strong>
                </span>
              </div>
            </div>

            {/* Tom Acolhedor / Mensagem Humanizada */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Mensagem do Seu Consultor FinancApp</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                "{report.greeting}"
              </p>
            </div>

            {/* Balanço Consolidado */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Balanço Consolidado do Ciclo
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-500 block">Total Receitas</span>
                  <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(report.income)}
                  </span>
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-500 block">Total Gastos</span>
                  <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                    {formatCurrency(report.expenses)}
                  </span>
                </div>
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-500 block">Saldo Líquido</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      report.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(report.balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Categorias que Mais Consumiram */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Categorias com Maior Consumo
              </span>
              <div className="space-y-2">
                {report.topCategories.map((c) => (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.category}</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(c.amount)} ({c.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, c.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sugestões Personalizadas da IA Gemini */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Sugestões & Dicas Personalizadas da IA Gemini para o Próximo Ciclo:
              </span>
              <div className="space-y-2">
                {report.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs flex items-start space-x-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Frase Final */}
            <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 italic">
              "{report.closingMotto}"
            </div>

            {/* Ações */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={generateReport}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerar com IA</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Fechar Relatório
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
