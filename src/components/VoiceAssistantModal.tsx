import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Check, ArrowRight, Loader2, Volume2, AlertCircle } from 'lucide-react';
import { Transaction, Category, TransactionType, PaymentMethod } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';

interface VoiceAssistantModalProps {
  userId: string;
  onConfirmTransaction: (tx: Omit<Transaction, 'id'>, generateFutureInstallments?: boolean) => void;
  onClose: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  userId,
  onConfirmTransaction,
  onClose,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Setup Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Acesso ao microfone bloqueado no navegador. Você pode digitar ou usar os exemplos abaixo.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    setErrorMsg(null);
    if (!recognitionRef.current) {
      setErrorMsg('Reconhecimento por voz direto não suportado neste navegador. Digite ou use as sugestões abaixo.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setParsedResult(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const processWithGemini = async (textToProcess: string) => {
    if (!textToProcess.trim()) {
      setErrorMsg('Por favor, fale ou digite uma frase antes de processar.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/gemini/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToProcess,
          referenceDate: new Date().toISOString().split('T')[0],
        }),
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setParsedResult(resData.data);
      } else {
        setErrorMsg('Não foi possível interpretar a transação. Tente reformular.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro de conexão com o assistente Gemini.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySample = (sample: string) => {
    setTranscript(sample);
    processWithGemini(sample);
  };

  const handleConfirm = () => {
    if (!parsedResult) return;

    const tx: Omit<Transaction, 'id'> = {
      userId,
      desc: parsedResult.desc || 'Lançamento por Voz',
      amount: Number(parsedResult.amount || 0),
      type: parsedResult.type as TransactionType,
      category: parsedResult.category as Category,
      date: parsedResult.date || new Date().toISOString().split('T')[0],
      dueDate: parsedResult.dueDate || parsedResult.date,
      paymentMethod: parsedResult.paymentMethod as PaymentMethod,
      notes: parsedResult.notes || `Comando de voz: "${transcript}"`,
      isPaid: false,
      installmentInfo: parsedResult.isInstallment
        ? {
            current: parsedResult.currentInstallment || 1,
            total: parsedResult.totalInstallments || 1,
            groupId: `grp-${Date.now()}`,
          }
        : undefined,
    };

    onConfirmTransaction(tx, Boolean(parsedResult.isInstallment && parsedResult.totalInstallments > 1));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight text-white">Assistente de Voz com IA Gemini</h3>
              <p className="text-[11px] text-indigo-200">Fale naturalmente e o Gemini cadastra para você</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-slate-800 dark:text-slate-100">
          {/* Microfone interativo */}
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <div className="relative">
              {isListening && (
                <div className="absolute -inset-3 rounded-full bg-indigo-500/30 dark:bg-indigo-400/20 animate-ping pointer-events-none" />
              )}
              <button
                type="button"
                onClick={toggleListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isListening
                    ? 'bg-rose-600 text-white scale-105 shadow-rose-500/40'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                }`}
                title={isListening ? 'Clique para parar' : 'Clique para falar'}
              >
                {isListening ? <Mic className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <p className="text-xs font-semibold text-center text-slate-600 dark:text-slate-400">
              {isListening ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold animate-pulse">
                  Ouvindo... Fale agora seu lançamento
                </span>
              ) : (
                'Toque no microfone e diga o que pagou ou recebeu'
              )}
            </p>
          </div>

          {/* Campo de transcrição e texto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Frase captada / dita:</span>
              {transcript && (
                <button
                  type="button"
                  onClick={() => processWithGemini(transcript)}
                  disabled={isProcessing}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Reprocessar com Gemini</span>
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                rows={2}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder='Ex: "Paguei aluguel 1500 com vencimento dia 10"'
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
              {transcript && !parsedResult && (
                <button
                  type="button"
                  onClick={() => processWithGemini(transcript)}
                  disabled={isProcessing}
                  className="absolute right-2 bottom-3 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-700 transition flex items-center gap-1"
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                  <span>Interpretar</span>
                </button>
              )}
            </div>
          </div>

          {/* Exemplos Rápidos de Voz */}
          {!parsedResult && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-indigo-500" />
                Exemplos Prontos para Testar:
              </span>
              <div className="flex flex-col gap-1.5">
                {[
                  'Paguei aluguel 1500 com vencimento dia 10',
                  'Gastei 95 no almoço hoje via Pix',
                  'Comprei fogão 1200 parcelado em 10 vezes no cartão',
                  'Recebi freelance de design 1800 via transferência',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => handleApplySample(sample)}
                    className="text-left p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resultado Extraído pela IA Gemini */}
          {parsedResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Estruturado com Sucesso pelo Gemini:</span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-emerald-200/60 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded">
                  {parsedResult.type === 'income' ? 'Receita' : parsedResult.type === 'fixed' ? 'Gasto Fixo' : 'Variável'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Descrição:</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">{parsedResult.desc}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Valor:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    {formatCurrency(parsedResult.amount)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Categoria:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{parsedResult.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Data / Vencimento:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{formatDateBR(parsedResult.date)}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Forma de Pagamento:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{parsedResult.paymentMethod || 'Pix'}</span>
                </div>
                {parsedResult.isInstallment && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Parcelamento:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                      {parsedResult.currentInstallment || 1}/{parsedResult.totalInstallments || 1}
                    </span>
                  </div>
                )}
              </div>

              {parsedResult.notes && (
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-600 dark:text-slate-400 italic">
                  <strong>Observações:</strong> {parsedResult.notes}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setParsedResult(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Editar / Repetir
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar & Salvar Lançamento</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
