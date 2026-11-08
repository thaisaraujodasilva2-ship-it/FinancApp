import { Category, Transaction } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; fill: string }> = {
  Alimentação: { bg: 'bg-emerald-50', text: 'text-emerald-700', fill: '#10B981' },
  Moradia: { bg: 'bg-blue-50', text: 'text-blue-700', fill: '#3B82F6' },
  Transporte: { bg: 'bg-amber-50', text: 'text-amber-700', fill: '#F59E0B' },
  Saúde: { bg: 'bg-rose-50', text: 'text-rose-700', fill: '#F43F5E' },
  Educação: { bg: 'bg-purple-50', text: 'text-purple-700', fill: '#8B5CF6' },
  Lazer: { bg: 'bg-pink-50', text: 'text-pink-700', fill: '#EC4899' },
  Serviços: { bg: 'bg-cyan-50', text: 'text-cyan-700', fill: '#06B6D4' },
  Salário: { bg: 'bg-teal-50', text: 'text-teal-700', fill: '#14B8A6' },
  Investimentos: { bg: 'bg-indigo-50', text: 'text-indigo-700', fill: '#6366F1' },
  Outros: { bg: 'bg-slate-50', text: 'text-slate-700', fill: '#64748B' },
};

export function exportTransactionsToCSV(transactions: Transaction[], filename = 'transacoes-financapp.csv'): void {
  const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Forma de Pagamento', 'Valor (R$)'];
  const rows = transactions.map((t) => [
    formatDateBR(t.date),
    `"${t.desc.replace(/"/g, '""')}"`,
    t.category || 'Outros',
    t.type === 'income' ? 'Receita' : t.type === 'fixed' ? 'Gasto Fixo' : 'Gasto Variável',
    t.paymentMethod || 'Não informado',
    t.amount.toFixed(2).replace('.', ','),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
