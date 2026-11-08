import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  CheckCircle2,
  ArrowRight,
  Loader2,
  DollarSign,
  Utensils,
  CreditCard,
  AlertCircle,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { Transaction, User as UserType, GeminiChatMessage, Category, TransactionType, PaymentMethod } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';

interface GeminiChatWidgetProps {
  user: UserType;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>, generateFutureInstallments?: boolean) => void;
  onTogglePaid: (txId: string) => void;
  onUpdateFoodCardBalance?: (newBalance: number) => void;
}

export const GeminiChatWidget: React.FC<GeminiChatWidgetProps> = ({
  user,
  transactions,
  onAddTransaction,
  onTogglePaid,
  onUpdateFoodCardBalance,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<GeminiChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'gemini',
      text: `Olá, ${user.name}! Sou o Assistente Inteligente do FinancApp com a tecnologia do Google Gemini. Você pode falar ou digitar seus gastos, avisar contas pagas ou consultar seu saldo!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Setup Web Speech recognition
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
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setInputMessage(current);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Reconhecimento de voz não suportado neste navegador. Digite sua mensagem abaixo.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputMessage('');
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: GeminiChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Calculate current user context
      const income = transactions.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
      const fixedExpenses = transactions.filter((t) => t.type === 'fixed').reduce((a, b) => a + b.amount, 0);
      const variableExpenses = transactions.filter((t) => t.type === 'variable').reduce((a, b) => a + b.amount, 0);
      const totalExpenses = fixedExpenses + variableExpenses;
      const balance = income - totalExpenses;
      const pendingBills = transactions.filter((t) => t.type !== 'income' && !t.isPaid);

      const context = {
        userName: user.name,
        foodCardBalance: user.foodCardBalance ?? 850,
        income,
        totalExpenses,
        balance,
        pendingBillsCount: pendingBills.length,
        recentPendingBills: pendingBills.slice(0, 5).map((b) => ({ id: b.id, desc: b.desc, amount: b.amount, dueDate: b.dueDate })),
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context }),
      });

      const json = await res.json();
      const geminiData = json.data;

      // Execute actions returned by Gemini
      let actionPayload: any = undefined;

      if (geminiData.actionType === 'create_transaction' && geminiData.transactionData) {
        const t = geminiData.transactionData;
        const newTx: Omit<Transaction, 'id'> = {
          userId: user.id,
          desc: t.desc || 'Despesa registrada via Gemini',
          amount: Math.abs(Number(t.amount) || 0),
          type: (t.type as TransactionType) || 'variable',
          category: (t.category as Category) || 'Outros',
          date: t.date || new Date().toISOString().split('T')[0],
          dueDate: t.dueDate || t.date || new Date().toISOString().split('T')[0],
          isPaid: t.isPaid ?? true,
          paidAt: t.isPaid ? new Date().toISOString() : undefined,
          paymentMethod: (t.paymentMethod as PaymentMethod) || 'Cartão de Débito',
          notes: t.notes || 'Lançado automaticamente pelo Gemini Chat',
        };

        onAddTransaction(newTx);

        // If paid with Food Card, deduct from food card balance
        if (newTx.paymentMethod === 'Cartão Alimentação' && onUpdateFoodCardBalance) {
          const current = user.foodCardBalance ?? 850;
          const updated = Math.max(0, current - newTx.amount);
          onUpdateFoodCardBalance(updated);
        }

        actionPayload = {
          type: 'transaction_created',
          details: newTx,
        };
      } else if (geminiData.actionType === 'mark_paid' && geminiData.billSearchDesc) {
        const search = geminiData.billSearchDesc.toLowerCase();
        const target = transactions.find(
          (t) => !t.isPaid && t.desc.toLowerCase().includes(search)
        );
        if (target) {
          onTogglePaid(target.id);
          actionPayload = {
            type: 'bill_paid',
            details: target,
          };
        }
      } else if (geminiData.actionType === 'update_food_card' && geminiData.foodCardDelta && onUpdateFoodCardBalance) {
        const current = user.foodCardBalance ?? 850;
        const updated = Math.max(0, current + geminiData.foodCardDelta);
        onUpdateFoodCardBalance(updated);
        actionPayload = {
          type: 'food_card_updated',
          details: { old: current, new: updated, delta: geminiData.foodCardDelta },
        };
      }

      const botMsg: GeminiChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'gemini',
        text: geminiData.reply || 'Comando processado com sucesso!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionPayload,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'gemini',
          text: 'Desculpe, tive uma instabilidade momentânea ao processar. Você pode tentar novamente?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    '🍽️ Gastei 42 no almoço no cartão alimentação',
    '⚡ Marque a conta de luz como paga',
    '📊 Qual meu saldo líquido atual?',
    '💳 Registre 150 de mercado no pix',
  ];

  return (
    <>
      {/* Floating Gemini Toggle Button with Google Gradient Glow */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-indigo-500/20"
            title="Abrir Assistente Gemini (Voz e Chat)"
          >
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
            <Sparkles className="w-6 h-6 animate-spin-slow group-hover:rotate-12 transition-transform" />
            <span className="hidden group-hover:block absolute right-full mr-3 whitespace-nowrap bg-slate-900 text-white text-xs font-semibold py-1.5 px-3 rounded-xl shadow-lg border border-slate-700 pointer-events-none animate-in fade-in slide-in-from-right-2">
              Assistente Gemini 💬
            </span>
          </button>
        )}
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md h-[560px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 text-white flex items-center justify-between border-b border-indigo-600/40 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5 leading-tight">
                  <span>Gemini Finanças</span>
                  <span className="text-[9px] bg-emerald-400/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded-full border border-emerald-400/40">
                    Online
                  </span>
                </div>
                <div className="text-[10px] text-indigo-200">
                  Voz e texto com sincronização automática
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-xs'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75 font-semibold">
                    {m.sender === 'user' ? (
                      <>
                        <User className="w-3 h-3" />
                        <span>Você</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                        <span>Gemini</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-mono">{m.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {/* Action Confirmation Banner if transaction was executed */}
                  {m.actionPayload?.type === 'transaction_created' && (
                    <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lançamento registrado automaticamente:</span>
                      </div>
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span>{m.actionPayload.details.desc}</span>
                        <span>{formatCurrency(m.actionPayload.details.amount)}</span>
                      </div>
                      <div className="text-[10px] opacity-80">
                        {m.actionPayload.details.category} · {m.actionPayload.details.paymentMethod}
                      </div>
                    </div>
                  )}

                  {m.actionPayload?.type === 'bill_paid' && (
                    <div className="mt-2.5 p-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-200 text-[11px]">
                      <div className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Conta quitada no painel:</span>
                      </div>
                      <div className="font-mono font-bold mt-0.5">
                        {m.actionPayload.details.desc} - {formatCurrency(m.actionPayload.details.amount)}
                      </div>
                    </div>
                  )}

                  {m.actionPayload?.type === 'food_card_updated' && (
                    <div className="mt-2.5 p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-[11px]">
                      <div className="font-bold flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-amber-600" />
                        <span>Saldo do Cartão Alimentação Atualizado:</span>
                      </div>
                      <div className="font-mono font-bold mt-0.5">
                        Novo Saldo: {formatCurrency(m.actionPayload.details.new)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Gemini está processando suas finanças...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isListening ? 'Parar gravação' : 'Falar comando por voz'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? 'Ouvindo sua voz...' : 'Digite ou fale seu lançamento...'}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
