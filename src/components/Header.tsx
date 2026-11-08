import React from 'react';
import { User } from '../types';
import { Wallet, LogOut, ShieldCheck, UserCheck, Sun, Moon, ArrowLeftRight, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAuditingUser?: User | null;
  onExitAudit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  theme,
  onThemeToggle,
  onOpenProfile,
  onLogout,
  activeTab,
  onTabChange,
  isAuditingUser,
  onExitAudit,
}) => {
  const isAdmin = user.role === 'admin';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors">
      {/* Top Banner if in user audit mode */}
      {isAuditingUser && (
        <div className="bg-amber-500 text-slate-900 px-6 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Visualizando modo de auditoria do cliente: <strong>{isAuditingUser.name}</strong> ({isAuditingUser.email})</span>
          </div>
          <button
            onClick={onExitAudit}
            className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs hover:bg-slate-800 transition font-medium cursor-pointer shadow-xs"
          >
            ← Voltar ao Painel Admin
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark (Locked - cannot be modified by user) */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              FinancApp
            </span>
            <span className="text-[10px] -mt-1 font-medium text-slate-400 uppercase tracking-wider">
              Controle Inteligente
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
          {isAdmin ? (
            <>
              <button
                onClick={() => onTabChange('admin_dashboard')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'admin_dashboard'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Visão de Metas & Saúde
              </button>
              <button
                onClick={() => onTabChange('admin_users')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'admin_users'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Clientes & Auditoria
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onTabChange('dashboard')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Meu Painel
              </button>
              <button
                onClick={() => onTabChange('transactions')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Extrato & Parcelas
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Actions - Theme Toggle, Ver Cadastro, Trocar Usuário / Sair */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={onThemeToggle}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Ver Cadastro / Perfil Button */}
          <button
            onClick={onOpenProfile}
            title="Visualizar meus dados cadastrais e preferências"
            className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                isAdmin ? 'bg-purple-600' : 'bg-indigo-600'
              }`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 -mt-0.5">
                Ver Cadastro
              </div>
            </div>
          </button>

          {/* Trocar de Usuário / Sair Button (Clear and explicit) */}
          <button
            onClick={onLogout}
            title="Trocar de usuário ou sair"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition border border-red-100 dark:border-red-900/40"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar Usuário</span>
          </button>
        </div>
      </div>
    </header>
  );
};
