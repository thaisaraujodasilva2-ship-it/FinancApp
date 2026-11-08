import React, { useState } from 'react';
import { User, UserPreferences } from '../types';
import {
  X,
  User as UserIcon,
  Mail,
  Calendar,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Check,
  Lock,
  Bell,
  Save,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

interface UserProfileModalProps {
  user: User;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUpdateUser: (updatedUser: User) => void;
  onOpenPaywall?: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  theme,
  onThemeChange,
  onUpdateUser,
  onOpenPaywall,
  onLogout,
  onClose,
}) => {
  const [closingDay, setClosingDay] = useState<number>(
    user.preferences?.monthlyClosingDay || 5
  );
  const [emailNotif, setEmailNotif] = useState<boolean>(
    user.preferences?.notificationChannels?.email ?? true
  );
  const [calendarSync, setCalendarSync] = useState<boolean>(
    user.preferences?.notificationChannels?.googleCalendar ?? true
  );
  const [pushNotif, setPushNotif] = useState<boolean>(
    user.preferences?.notificationChannels?.push ?? true
  );
  const [alertDaysAdvance, setAlertDaysAdvance] = useState<number>(
    user.preferences?.alertDaysAdvance ?? 2
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPreferences: UserPreferences = {
      monthlyClosingDay: closingDay,
      notificationChannels: {
        email: emailNotif,
        googleCalendar: calendarSync,
        push: pushNotif,
      },
      alertDaysAdvance,
    };

    const updatedUser: User = {
      ...user,
      preferences: updatedPreferences,
    };

    onUpdateUser(updatedUser);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight text-white">Cadastro & Preferências</h3>
              <p className="text-[11px] text-slate-400">Personalização, alertas e plano do FinancApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSavePreferences} className="p-6 space-y-5 text-slate-800 dark:text-slate-100 max-h-[80vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Suas preferências foram salvas com sucesso!</span>
            </div>
          )}

          {/* Dados Cadastrais */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Dados do Usuário
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" /> Nome:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail:
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-100">{user.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Perfil:
                </span>
                <span className="font-semibold capitalize text-indigo-600 dark:text-indigo-400">
                  {user.role === 'admin' ? 'Administrador Master' : 'Assinante / Usuário'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Membro desde:
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-100">
                  {formatDateBR(user.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Status da Assinatura SaaS */}
          {user.role !== 'admin' && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Plano & Assinatura SaaS</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    user.subscriptionStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : user.subscriptionStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {user.subscriptionStatus === 'active'
                    ? 'Ativa / Em Dia'
                    : user.subscriptionStatus === 'pending'
                    ? 'Pagamento Pendente'
                    : 'Acesso Expirado'}
                </span>
              </div>

              <div className="p-3.5 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-slate-800 dark:to-slate-800/80 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Plano {user.planName || 'Anual Premium'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Válido até: <span className="font-mono font-medium">{formatDateBR(user.subscriptionExpiresAt)}</span>
                  </p>
                </div>
                {onOpenPaywall && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPaywall();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    Renovar / Planos
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preferências de Ciclo e Notificações (Item 2 do Prompt) */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Preferências de Fechamento & Avisos
            </div>

            {/* Dia de Fechamento / Revisão Mensal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Dia de Fechamento / Revisão Mensal
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                O robô consolida seus relatórios e compara seus gastos com a data de recebimento do seu salário.
              </p>
              <select
                value={closingDay}
                onChange={(e) => setClosingDay(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>Dia 1º de cada mês (Ciclo de Início de Mês)</option>
                <option value={5}>Dia 5 de cada mês (5º dia útil / Recebimento de Salário)</option>
                <option value={10}>Dia 10 de cada mês (Pagamento quinzenal)</option>
                <option value={15}>Dia 15 de cada mês (Meio de mês)</option>
                <option value={20}>Dia 20 de cada mês (Adiantamento)</option>
                <option value={25}>Dia 25 de cada mês (Final de mês)</option>
              </select>
            </div>

            {/* Antecedência de Alertas */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                Antecedência dos Alertas de Vencimento
              </label>
              <select
                value={alertDaysAdvance}
                onChange={(e) => setAlertDaysAdvance(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>1 dia antes e no dia do vencimento</option>
                <option value={2}>2 dias antes e no dia do vencimento (Recomendado)</option>
                <option value={3}>3 dias antes e no dia do vencimento</option>
                <option value={5}>5 dias antes e no dia do vencimento</option>
              </select>
            </div>

            {/* Canais de Notificação */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Canais de Notificação Ativos
              </span>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <div>
                      <div className="text-xs font-medium">Alertas por E-mail</div>
                      <div className="text-[10px] text-slate-400">Resumos semanais e cobrança prévia</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs font-medium">Sincronização com Google Calendar</div>
                      <div className="text-[10px] text-slate-400">Lembretes na sua agenda Google</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={calendarSync}
                    onChange={(e) => setCalendarSync(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-medium">Notificações Push no App</div>
                      <div className="text-[10px] text-slate-400">Avisos imediatos no dispositivo</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotif}
                    onChange={(e) => setPushNotif(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Preferências</span>
            </button>
          </div>

          {/* Preferência de Tema */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Tema de Exibição
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Logo e nome protegidos
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  theme === 'light'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Modo Claro</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Modo Escuro</span>
              </button>
            </div>
          </div>

          {/* Botão de Trocar Usuário / Sair */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-xs font-semibold transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Trocar de Usuário / Sair</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
