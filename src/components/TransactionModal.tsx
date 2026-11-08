import React, { useState } from 'react';
import { Transaction, TransactionType, Category, PaymentMethod } from '../types';
import { X, PlusCircle, CheckCircle2, Layers } from 'lucide-react';

interface TransactionModalProps {
  userId: string;
  initialData?: Transaction | null;
  onSave: (tx: Omit<Transaction, 'id'>, generateFutureInstallments?: boolean) => void;
  onClose: () => void;
}

const CATEGORIES: Category[] = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Serviços',
  'Salário',
  'Investimentos',
  'Outros',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Cartão Alimentação',
  'Boleto',
  'Dinheiro',
  'Transferência',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  userId,
  initialData,
  onSave,
  onClose,
}) => {
  const [desc, setDesc] = useState(initialData?.desc || '');
  const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : '');
  const [type, setType] = useState<TransactionType>(initialData?.type || 'variable');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Alimentação');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialData?.paymentMethod || 'Cartão de Crédito'
  );

  // Installment handling
  const [isInstallment, setIsInstallment] = useState(Boolean(initialData?.installmentInfo));
  const [currentInstallment, setCurrentInstallment] = useState(
    initialData?.installmentInfo?.current || 1
  );
  const [totalInstallments, setTotalInstallments] = useState(
    initialData?.installmentInfo?.total || 10
  );
  const [autoGenerateFuture, setAutoGenerateFuture] = useState(false);
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }

    let finalDesc = desc.trim();
    if (isInstallment && !finalDesc.includes('Parcela')) {
      finalDesc = `${finalDesc} (Parcela ${currentInstallment}/${totalInstallments})`;
    }

    const txPayload: Omit<Transaction, 'id'> = {
      userId,
      desc: finalDesc,
      amount: parsedAmount,
      type: isInstallment ? 'fixed' : type,
      category,
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
      installmentInfo: isInstallment
        ? {
            current: currentInstallment,
            total: totalInstallments,
            groupId: initialData?.installmentInfo?.groupId || `grp-${Date.now()}`,
          }
        : undefined,
    };

    onSave(txPayload, !initialData && isInstallment && autoGenerateFuture);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base text-white">
              {initialData ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo de Transação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tipo do Lançamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setIsInstallment(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                  type === 'income' && !isInstallment
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                + Receita
              </button>
              <button
                type="button"
                onClick={() => setType('fixed')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                  type === 'fixed' || isInstallment
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                Gasto Fixo
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('variable');
                  setIsInstallment(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                  type === 'variable' && !isInstallment
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                Gasto Variável
              </button>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Supermercado Mensal, Fogão, Salário, Conta de Luz..."
              required
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Valor (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono font-medium text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Categoria e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção de Compra Parcelada */}
          {type !== 'income' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={(e) => {
                    setIsInstallment(e.target.checked);
                    if (e.target.checked) setType('fixed');
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Compra Parcelada / Cartão em Parcelas
                </span>
              </label>

              {isInstallment && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Parcela Atual
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={totalInstallments}
                        value={currentInstallment}
                        onChange={(e) => setCurrentInstallment(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Total de Parcelas
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="72"
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 2)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  {!initialData && (
                    <label className="flex items-start space-x-2 cursor-pointer bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={autoGenerateFuture}
                        onChange={(e) => setAutoGenerateFuture(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                        <strong>Autogerar parcelas restantes:</strong> Lançar automaticamente as próximas{' '}
                        {totalInstallments - currentInstallment} parcelas mensais nos meses seguintes.
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialData ? 'Atualizar Lançamento' : 'Confirmar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
