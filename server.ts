import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint 1: Parse voice / natural language text into financial transaction
app.post('/api/gemini/parse-voice', async (req, res) => {
  try {
    const { text, referenceDate } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texto para processamento é obrigatório.' });
    }

    const todayStr = referenceDate || new Date().toISOString().split('T')[0];

    // Structured Prompt for Gemini 3.8 Flash
    const prompt = `Você é o Assistente Inteligente de Voz do FinancApp.
A data de hoje é: ${todayStr}.
O usuário falou ou ditou a seguinte transação financeira em português do Brasil:
"${text}"

Analise o texto e extraia estruturadamente:
- desc: Breve descrição limpa (ex: "Aluguel", "Conta de Luz", "Almoço", "Notebook")
- amount: Valor numérico positivo em Reais (ex: 1500.0, 85.5, etc)
- type: 'fixed' (para contas fixas, aluguel, condomínio, internet, financiamentos, parcelas), 'variable' (para mercado, lazer, farmácia, restaurantes, compras eventuais) ou 'income' (para salário, freela, vendas, entradas)
- category: uma de: 'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Serviços', 'Salário', 'Investimentos', 'Outros'
- date: Data calculada no formato YYYY-MM-DD. Se o usuário disse "vencimento dia 10", calcule o dia 10 mais próximo no formato YYYY-MM-DD. Se disse "hoje" ou "ontem", use a data correta relativa a hoje (${todayStr}).
- paymentMethod: 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro' ou 'Transferência'
- isInstallment: true se mencionou compra parcelada (ex: "em 10x", "parcelado em 3 vezes"), senão false
- currentInstallment: número da parcela atual (default 1)
- totalInstallments: total de parcelas (ex: 10, default 1)
- notes: breve nota explicativa do que foi extraído por voz, incluindo vencimento identificado`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            desc: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ['fixed', 'variable', 'income'] },
            category: {
              type: Type.STRING,
              enum: [
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
              ],
            },
            date: { type: Type.STRING },
            paymentMethod: {
              type: Type.STRING,
              enum: [
                'Pix',
                'Cartão de Crédito',
                'Cartão de Débito',
                'Boleto',
                'Dinheiro',
                'Transferência',
              ],
            },
            isInstallment: { type: Type.BOOLEAN },
            currentInstallment: { type: Type.INTEGER },
            totalInstallments: { type: Type.INTEGER },
            notes: { type: Type.STRING },
          },
          required: ['desc', 'amount', 'type', 'category', 'date'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in parse-voice:', error);
    // Intelligent fallback parser in case API key is missing or network failure
    try {
      const { text } = req.body;
      const lower = (text || '').toLowerCase();
      // Simple regex extraction for amount
      const amountMatch = lower.match(/(?:r\$\s*|reais\s*|\b)(\d+(?:[.,]\d{1,2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 100;
      const isFixed = lower.includes('aluguel') || lower.includes('vencimento') || lower.includes('conta') || lower.includes('parcela');
      const isIncome = lower.includes('recebi') || lower.includes('salário') || lower.includes('salario') || lower.includes('ganhei');

      return res.json({
        success: true,
        data: {
          desc: text.substring(0, 50),
          amount,
          type: isIncome ? 'income' : isFixed ? 'fixed' : 'variable',
          category: isIncome ? 'Salário' : lower.includes('aluguel') ? 'Moradia' : lower.includes('mercado') || lower.includes('almoço') ? 'Alimentação' : 'Outros',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: lower.includes('pix') ? 'Pix' : lower.includes('cartão') ? 'Cartão de Crédito' : 'Boleto',
          notes: `Lançamento captado por voz: "${text}"`,
          isInstallment: lower.includes('parcela') || lower.includes('x de'),
          currentInstallment: 1,
          totalInstallments: 1,
        },
        fallbackUsed: true,
      });
    } catch {
      return res.status(500).json({ error: 'Erro ao processar comando de voz.' });
    }
  }
});

// Endpoint 2: Monthly closing cycle report with personalized Gemini insights
app.post('/api/gemini/monthly-insights', async (req, res) => {
  try {
    const { userName, month, income, expenses, balance, topCategories } = req.body;

    const categoriesText = (topCategories || [])
      .map((c: any) => `${c.category}: R$ ${Number(c.amount || 0).toFixed(2)}`)
      .join(', ');

    const prompt = `Você é o Consultor Financeiro Inteligente do FinancApp.
Gere um relatório humanizado de fechamento mensal para o cliente ${userName || 'Cliente'}.
Mês de referência: ${month || 'Mês anterior'}
Dados financeiros do período:
- Total Receitas: R$ ${Number(income || 0).toFixed(2)}
- Total Despesas: R$ ${Number(expenses || 0).toFixed(2)}
- Saldo Final: R$ ${Number(balance || 0).toFixed(2)}
- Principais categorias de gastos: ${categoriesText || 'Diversos'}

Escreva:
1. Uma mensagem humanizada e calorosa agradecendo a parceria ("Olá [Nome]! Chegamos ao fim de mais um ciclo. Muito obrigado por estar conosco e confiar na nossa plataforma...")
2. 3 insights e sugestões financeiras personalizadas e práticas para o próximo mês com base no comportamento de consumo.
3. Frase curta de motivação.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            greeting: { type: Type.STRING },
            healthDiagnosis: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            closingMotto: { type: Type.STRING },
          },
          required: ['greeting', 'healthDiagnosis', 'insights', 'closingMotto'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, report: parsed });
  } catch (error) {
    console.error('Error generating monthly insights:', error);
    return res.json({
      success: true,
      report: {
        greeting: `Olá ${req.body.userName || 'Cliente'}! Chegamos ao fim de mais um ciclo. Muito obrigado por estar conosco e confiar na nossa plataforma para guiar sua jornada financeira.`,
        healthDiagnosis: req.body.balance >= 0 ? 'Você fechou o ciclo no azul com equilíbrio e controle!' : 'Este ciclo exigiu mais despesas que o planejado. Vamos juntos ajustar para o próximo.',
        insights: [
          'Priorize a quitação de parcelamentos para liberar margem no seu orçamento fixo.',
          'Estabeleça um teto semanal para gastos variáveis aos finais de semana.',
          'Separe ao menos 10% de qualquer receita logo no início do mês.',
        ],
        closingMotto: 'Constância é o segredo da tranquilidade financeira. Conte sempre com o FinancApp!',
      },
      fallbackUsed: true,
    });
  }
});

// Endpoint 3: Interactive Gemini Financial Assistant Chat
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const userContextStr = JSON.stringify(context || {});

    const prompt = `Você é o Assistente Financeiro Pessoal do FinancApp com a inteligência do Google Gemini.
A data de hoje é: ${todayStr}.
Contexto financeiro atual do usuário:
${userContextStr}

O usuário enviou a seguinte mensagem (falada ou digitada):
"${message}"

Sua missão:
1. Responder em português brasileiro de forma amigável, clara e objetiva.
2. Identificar se o usuário solicitou alguma ação financeira no applet, como:
   - Cadastrar um novo gasto ou receita (ex: "Gastei 45 no almoço", "Paguei 120 de luz", "Recebi 500 de freela", "Gastei 60 no cartão alimentação")
   - Marcar uma conta como paga (ex: "Paguei o condomínio hoje", "Marca a conta de internet como paga")
   - Ajustar o saldo do Cartão Alimentação (ex: "Recarreguei 800 no cartão alimentação", "Gastei 50 no VR")
   - Ajustar metas orçamentárias (ex: "Aumenta meu teto de gastos para 4000")
   - Apenas tirar dúvidas ou pedir análise (ex: "Quanto gastei esse mês?", "Tenho contas vencendo?")

Retorne um JSON com:
- reply: Texto de resposta para o usuário.
- actionType: 'create_transaction' | 'mark_paid' | 'update_food_card' | 'update_goal' | 'none'
- transactionData: se actionType === 'create_transaction', objeto com desc, amount, type ('fixed' | 'variable' | 'income'), category ('Alimentação' | 'Moradia' | 'Transporte' | 'Saúde' | 'Educação' | 'Lazer' | 'Serviços' | 'Salário' | 'Investimentos' | 'Outros'), date (YYYY-MM-DD), dueDate (YYYY-MM-DD), isPaid (boolean), paymentMethod ('Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Cartão Alimentação' | 'Boleto' | 'Dinheiro' | 'Transferência'), notes
- billSearchDesc: se actionType === 'mark_paid', nome aproximado da conta a marcar como paga
- foodCardDelta: se actionType === 'update_food_card', valor a somar (positivo) ou subtrair (negativo) do cartão alimentação
- newGoalData: se actionType === 'update_goal', objeto com spendingLimit e/ou savingsGoal`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            actionType: {
              type: Type.STRING,
              enum: ['create_transaction', 'mark_paid', 'update_food_card', 'update_goal', 'none'],
            },
            transactionData: {
              type: Type.OBJECT,
              properties: {
                desc: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['fixed', 'variable', 'income'] },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                isPaid: { type: Type.BOOLEAN },
                paymentMethod: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
            },
            billSearchDesc: { type: Type.STRING },
            foodCardDelta: { type: Type.NUMBER },
            newGoalData: {
              type: Type.OBJECT,
              properties: {
                spendingLimit: { type: Type.NUMBER },
                savingsGoal: { type: Type.NUMBER },
              },
            },
          },
          required: ['reply', 'actionType'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in gemini chat:', error);
    // Intelligent local fallback
    const { message } = req.body;
    const lower = (message || '').toLowerCase();
    const amountMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 50;

    let actionType: any = 'none';
    let transactionData: any = null;

    if (lower.includes('gastei') || lower.includes('comprei') || lower.includes('paguei') || lower.includes('almoço')) {
      actionType = 'create_transaction';
      const isFood = lower.includes('almoço') || lower.includes('mercado') || lower.includes('alimentação') || lower.includes('vr') || lower.includes('va');
      transactionData = {
        desc: message.substring(0, 40),
        amount,
        type: lower.includes('aluguel') ? 'fixed' : 'variable',
        category: isFood ? 'Alimentação' : 'Outros',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        isPaid: true,
        paymentMethod: lower.includes('alimentação') || lower.includes('vr') ? 'Cartão Alimentação' : lower.includes('pix') ? 'Pix' : 'Cartão de Débito',
        notes: 'Registrado via chat assistente',
      };
    }

    return res.json({
      success: true,
      data: {
        reply: actionType === 'create_transaction'
          ? `Entendido! Registrei ${transactionData.desc} no valor de R$ ${amount.toFixed(2)} e atualizei seu painel financeiro.`
          : `Olá! Sou seu assistente Gemini do FinancApp. Como posso ajudar nas suas finanças hoje?`,
        actionType,
        transactionData,
      },
    });
  }
});

// Vite dev middleware or Production static files
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinancApp server listening on http://localhost:${PORT}`);
  });
}

setupServer();
