import React, { useState } from 'react';
import { User, UserGoal } from '../types';
import { X, Target, Save, ShieldAlert, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface GoalModalProps {
  user: User;
  currentGoal: UserGoal;
  onSave: (userId: string, updatedGoal: UserGoal) => void;
  onClose: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  user,
  currentGoal,
  onSave,
  onClose,
}) => {
  const [spendingLimit, setSpendingLimit] = useState(currentGoal.spendingLimit.toString());
  const [savingsGoal, setSavingsGoal] = useState(currentGoal.savingsGoal.toString());
  const [adminNote, setAdminNote] = useState(currentGoal.adminNote || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(spendingLimit) || 0;
    const savingsNum = parseFloat(savingsGoal) || 0;

    onSave(user.id, {
      spendingLimit: limitNum,
      savingsGoal: savingsNum,
      adminNote: adminNote.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-base leading-tight">Configurar Metas Financeiras</h3>
              <p className="text-xs text-slate-300">
                Usuário: <span className="text-indigo-200 font-medium">{user.name}</span> ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Papel do Administrador:</span>
              <p className="text-indigo-700 mt-0.5 leading-relaxed">
                As metas definidas aqui aparecem destacadas no painel do usuário e funcionam como teto orçamentário e estímulo de economia.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Teto Máximo de Gastos Mensais (R$)
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
                placeholder="Ex: 3500.00"
                required
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Valor atual configurado: {formatCurrency(currentGoal.spendingLimit)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Meta de Economia / Poupança Mensal (R$)
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
                placeholder="Ex: 1000.00"
                required
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Valor atual configurado: {formatCurrency(currentGoal.savingsGoal)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Orientações / Feedback do Consultor</span>
            </label>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ex: Sugerimos priorizar a redução de delivery nas sextas e concentrar investimentos no Tesouro Selic..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
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
              <Save className="w-4 h-4" />
              <span>Salvar Metas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
