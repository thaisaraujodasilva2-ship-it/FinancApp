import React, { useState } from 'react';
import { User } from '../types';
import {
  Wallet,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  CheckCircle2,
  Calendar,
  CreditCard,
  Bell,
  Clock,
  DollarSign,
  Utensils,
} from 'lucide-react';

interface AuthModalProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (newUser: Omit<User, 'id' | 'createdAt'>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ users, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'unified_onboarding'>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Unified Onboarding Form States
  const [closingDay, setClosingDay] = useState<number>(5);
  const [spendingLimit, setSpendingLimit] = useState<string>('3500');
  const [savingsGoal, setSavingsGoal] = useState<string>('1000');
  const [foodCardBalance, setFoodCardBalance] = useState<string>('850');
  const [foodCardAllowance, setFoodCardAllowance] = useState<string>('1200');
  const [alertAdvance, setAlertAdvance] = useState<number>(2);
  const [notifEmail, setNotifEmail] = useState<boolean>(true);
  const [notifCalendar, setNotifCalendar] = useState<boolean>(true);
  const [notifPush, setNotifPush] = useState<boolean>(true);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const targetUser = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.pass === pass
    );

    if (targetUser) {
      if (targetUser.status === 'inactive') {
        setError('Esta conta foi desativada pelo administrador.');
        return;
      }
      onLogin(targetUser);
    } else {
      setError('E-mail ou senha incorretos.');
    }
  };

  // Google Social Sign-In Handler
  const handleGoogleSignIn = () => {
    setError(null);
    const googleEmail = 'thaisaraujodasilva2@gmail.com';
    const existing = users.find((u) => u.email.toLowerCase() === googleEmail.toLowerCase());

    if (existing) {
      if (existing.status === 'inactive') {
        setError('Esta conta Google está inativa no sistema.');
        return;
      }
      onLogin(existing);
    } else {
      // New Google User -> Redirect to Cadastro Unificado with Google data pre-filled
      setName('Thais Araújo da Silva');
      setEmail(googleEmail);
      setIsGoogleAuth(true);
      setMode('unified_onboarding');
    }
  };

  const handleUnifiedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }

    if (!isGoogleAuth && !pass.trim()) {
      setError('Por favor, informe uma senha.');
      return;
    }

    onRegister({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      pass: isGoogleAuth ? 'google-oauth-authenticated' : pass,
      role: 'user',
      status: 'active',
      authProvider: isGoogleAuth ? 'google' : 'email',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      planName: 'Mensal',
      foodCardBalance: parseFloat(foodCardBalance) || 850,
      foodCardMonthlyAllowance: parseFloat(foodCardAllowance) || 1200,
      foodCardClosingDay: closingDay,
      preferences: {
        monthlyClosingDay: closingDay,
        notificationChannels: {
          email: notifEmail,
          googleCalendar: notifCalendar,
          push: notifPush,
        },
        alertDaysAdvance: alertAdvance,
      },
    });
  };

  const quickLogin = (userEmail: string, userPass: string) => {
    setError(null);
    const found = users.find((u) => u.email === userEmail && u.pass === userPass);
    if (found) {
      onLogin(found);
    } else {
      setEmail(userEmail);
      setPass(userPass);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md mb-3">
          <Wallet className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          FinancApp
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Controle financeiro inteligente com assistente Gemini, alertas e cartão alimentação
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-100 dark:border-slate-800 sm:px-10">
          {/* Toggle Login / Register / Cadastro Unificado */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition ${
                mode === 'login'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Acessar Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('unified_onboarding');
                setIsGoogleAuth(false);
                setError(null);
              }}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition ${
                mode === 'unified_onboarding'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Cadastro Unificado
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Social Google Login Button (Item 2 do Prompt) */}
          {mode !== 'unified_onboarding' && (
            <div className="space-y-4 mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition group"
              >
                {/* Google Colorful G SVG */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entrar com a Conta do Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  ou com e-mail
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              </div>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Cadastro Unificado Centralizado (Item 2 do Prompt) */
            <form onSubmit={handleUnifiedSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {isGoogleAuth && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Autenticado via Google! Complete suas preferências para centralizar suas finanças.</span>
                </div>
              )}

              {/* Dados Básicos */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  1. Dados do Usuário
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Thais Silva"
                      className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="thais@exemplo.com"
                      className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {!isGoogleAuth && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preferências de Ciclo & Vencimentos */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  2. Ciclo e Vencimentos
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dia de Fechamento / Revisão Mensal
                  </label>
                  <select
                    value={closingDay}
                    onChange={(e) => setClosingDay(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Dia 1º (Início do mês)</option>
                    <option value={5}>Dia 5 (5º dia útil / Salário)</option>
                    <option value={10}>Dia 10 (Quinzenal)</option>
                    <option value={15}>Dia 15 (Meio do mês)</option>
                    <option value={20}>Dia 20</option>
                    <option value={25}>Dia 25</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Antecedência dos Alertas de Vencimento
                  </label>
                  <select
                    value={alertAdvance}
                    onChange={(e) => setAlertAdvance(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1 dia antes e no vencimento</option>
                    <option value={2}>2 dias antes e no vencimento (Recomendado)</option>
                    <option value={3}>3 dias antes e no vencimento</option>
                  </select>
                </div>
              </div>

              {/* Cartão Alimentação (Item 1 & 2 do Prompt) */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-500" />
                  <span>3. Cartão Alimentação (VR / VA)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Saldo Atual (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={foodCardBalance}
                      onChange={(e) => setFoodCardBalance(e.target.value)}
                      placeholder="850.00"
                      className="w-full p-2 text-xs font-mono border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Recarga Mensal (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={foodCardAllowance}
                      onChange={(e) => setFoodCardAllowance(e.target.value)}
                      placeholder="1200.00"
                      className="w-full p-2 text-xs font-mono border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Canais de Notificação */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  4. Canais de Notificação
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>E-mail com avisos de vencimento</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifCalendar}
                      onChange={(e) => setNotifCalendar(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sincronizar vencimentos no Google Calendar</span>
                  </label>
                  <label className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifPush}
                      onChange={(e) => setNotifPush(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Notificações push no celular / navegador</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 mt-4"
              >
                <span>Concluir Cadastro Unificado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Atalhos Rápidos para Demonstração */}
          {mode === 'login' && (
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 mb-2.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Acesso Rápido para Avaliação (1 Clique)</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => quickLogin('admin@sistema.com', 'admin')}
                  className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 rounded-xl transition text-left"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Entrar como Administrador</div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono">admin@sistema.com / admin</div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                    Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => quickLogin('maria@sistema.com', '123456')}
                  className="flex items-center justify-between p-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 rounded-xl transition text-left"
                >
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">Entrar como Maria Oliveira</div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">maria@sistema.com / 123456</div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded">
                    Usuário
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
