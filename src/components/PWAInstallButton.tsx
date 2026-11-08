import React, { useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, X, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'button' | 'card' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running inside standalone PWA mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else {
      // Fallback: show instructions modal for iOS or browsers that don't trigger beforeinstallprompt in iframe
      setShowGuideModal(true);
    }
  };

  if (variant === 'card') {
    return (
      <>
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs space-y-3 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                  Instalar como Aplicativo no Celular
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Acesse direto da sua tela inicial, rápido e sem precisar de loja
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Instalar FinancApp no Celular</span>
          </button>
        </div>

        {/* Modal de Instruções de Instalação no Celular */}
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Como Instalar no Celular
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>📱 No iPhone / iPad (Safari):</span>
                  </div>
                  <p>1. Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima no rodapé do Safari).</p>
                  <p>2. Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                  <p>3. Toque em <strong>"Adicionar"</strong> no canto superior direito.</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🤖 No Android (Chrome / Edge):</span>
                  </div>
                  <p>1. Toque nos <strong>3 pontinhos</strong> do navegador no canto superior.</p>
                  <p>2. Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                  <p>3. Confirme para criar o ícone do aplicativo na tela do seu celular!</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Variant: Button (e.g. for Header or Login)
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition shrink-0 ${className}`}
        title="Instalar FinancApp como aplicativo no celular ou computador"
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden text-[11px]">Instalar</span>
      </button>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Instalar no Celular
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📱 No iPhone (Safari):</span>
                </div>
                <p>1. Toque em <strong>Compartilhar</strong> (quadrado com seta no rodapé do Safari).</p>
                <p>2. Toque em <strong>"Adicionar à Tela de Início"</strong>.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🤖 No Android (Chrome):</span>
                </div>
                <p>1. Toque no menu de <strong>3 pontinhos</strong> do navegador.</p>
                <p>2. Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
