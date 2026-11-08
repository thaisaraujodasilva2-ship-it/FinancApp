import React, { useState } from 'react';
import { User } from '../types';
import {
  Lock,
  ShieldAlert,
  CreditCard,
  QrCode,
  CheckCircle,
  ArrowRight,
  Sparkles,
  LogOut,
  Clock,
  Zap,
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

interface PaywallScreenProps {
  user: User;
  onRenewSubscription: (plan: 'Mensal' | 'Trimestral' | 'Anual', daysToAdd: number) => void;
  onLogout: () => void;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
  user,
  onRenewSubscription,
  onLogout,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'Mensal' | 'Trimestral' | 'Anual'>('Anual');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  const plans = [
    {
      id: 'Mensal' as const,
      name: 'Plano Mensal',
      price: 'R$ 29,90',
      period: '/mês',
      days: 30,
      description: 'Ideal para controle financeiro mês a mês com renovação automática.',
    },
    {
      id: 'Trimestral' as const,
      name: 'Plano Trimestral',
      price: 'R$ 79,90',
      period: '/trimestre',
      days: 90,
      badge: 'Economia de 11%',
      description: 'Mais comodidade com ciclo trimestral de relatórios e planejamento.',
    },
    {
      id: 'Anual' as const,
      name: 'Plano Anual Premium',
      price: 'R$ 239,90',
      period: '/ano (R$ 19,99/mês)',
      days: 365,
      badge: 'MAIS POPULAR · 33% OFF',
      highlight: true,
      description: 'Acesso irrestrito ao assistente de voz Gemini, IA preditiva e relatórios mensais.',
    },
  ];

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const chosen = plans.find((p) => p.id === selectedPlan)!;
      setIsProcessing(false);
      setSimulatedSuccess(true);
      setTimeout(() => {
        onRenewSubscription(chosen.id, chosen.days);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl w-full space-y-6">
        {/* Banner de Bloqueio Comercial */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-2">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Assinatura Expirada · Regularize seu Acesso
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Olá, <strong className="text-white">{user.name}</strong>! O período da sua assinatura do FinancApp venceu em{' '}
            <span className="font-mono text-rose-300 font-bold">{formatDateBR(user.subscriptionExpiresAt)}</span>.
            Para continuar aproveitando o assistente por voz Gemini, relatórios e controle financeiro inteligente, renove seu plano abaixo.
          </p>
        </div>

        {/* Planos de Comercialização */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`p-5 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                selectedPlan === p.id
                  ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/50'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full shadow-xs">
                  {p.badge}
                </span>
              )}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-200">{p.name}</h3>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black font-mono text-white">{p.price}</span>
                  <span className="text-xs text-slate-400">{p.period}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                <span className="text-slate-400">{p.days} dias de acesso</span>
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    selectedPlan === p.id ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                  }`}
                >
                  {selectedPlan === p.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Seção de Pagamento */}
        <div className="bg-slate-800/70 p-6 rounded-2xl border border-slate-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-white">Forma de Pagamento Instantâneo</h4>
              <p className="text-xs text-slate-400">Liberação imediata de acesso após confirmação</p>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  paymentMethod === 'pix' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Pix Instantâneo</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  paymentMethod === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cartão de Crédito</span>
              </button>
            </div>
          </div>

          {paymentMethod === 'pix' ? (
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-900" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Pix Copia e Cola Gerado</div>
                  <div className="text-[11px] text-slate-400 font-mono">00020126580014br.gov.bcb.pix0136financapp...</div>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Zap className="w-3 h-3" /> Chave ativa para renovação automática
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || simulatedSuccess}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2 shrink-0"
              >
                {isProcessing ? (
                  <span>Processando...</span>
                ) : simulatedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Confirmado! Liberando...</span>
                  </>
                ) : (
                  <>
                    <span>Simular Pagamento Pix</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Número do Cartão</label>
                  <input
                    type="text"
                    disabled
                    value="•••• •••• •••• 4242"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Titular</label>
                  <input
                    type="text"
                    disabled
                    value={user.name}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || simulatedSuccess}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <span>Processando com operadora...</span>
                ) : simulatedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Pagamento Confirmado!</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar Pagamento e Desbloquear Acesso</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Botão de Trocar Usuário / Sair para não prender o usuário */}
        <div className="text-center pt-2">
          <button
            onClick={onLogout}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition py-1 px-3 rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Fazer login com outra conta ou acessar como Administrador</span>
          </button>
        </div>
      </div>
    </div>
  );
};
