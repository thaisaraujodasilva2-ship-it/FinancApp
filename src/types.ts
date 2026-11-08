export type Role = 'admin' | 'user';

export type TransactionType = 'income' | 'fixed' | 'variable';

export type SubscriptionStatus = 'active' | 'pending' | 'expired';

export type Category = 
  | 'Alimentação'
  | 'Moradia'
  | 'Transporte'
  | 'Saúde'
  | 'Educação'
  | 'Lazer'
  | 'Serviços'
  | 'Salário'
  | 'Investimentos'
  | 'Outros';

export type PaymentMethod = 
  | 'Pix'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Cartão Alimentação'
  | 'Boleto'
  | 'Dinheiro'
  | 'Transferência';

export interface FinancialDiagnostic {
  approxSalary?: number; // Salário aproximado / Renda mensal
  estimatedFixedExpenses?: number; // Informações sobre contas fixas aproximadas
  estimatedVariableExpenses?: number; // Contas variáveis aproximadas
  wantsSavings?: boolean; // Se quer fazer uma poupança
  intendedSavingsAmount?: number; // Quanto pretende poupar
  financialGoalObjective?: string; // Objetivo do controle financeiro escrito pelo cliente
  proposalDocumentUrl?: string; // Anexo de documento ou proposta em PDF
  proposalDocumentName?: string;
  proposalText?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AppNotification {
  id: string;
  userId: string; // target user id, or 'admin'
  title: string;
  message: string;
  type: 'approval_request' | 'approval_confirmed' | 'bill_due' | 'goal_updated' | 'info';
  date: string;
  read: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface UserPreferences {
  monthlyClosingDay: number; // e.g. 1, 5, 10, 15, 20
  notificationChannels: {
    email: boolean;
    googleCalendar: boolean;
    push: boolean;
  };
  alertDaysAdvance: number; // e.g. 2 days before
}

export interface User {
  id: string;
  name: string;
  email: string;
  pass: string;
  role: Role;
  createdAt: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  themePreference?: 'light' | 'dark';
  authProvider?: 'email' | 'google';
  // Cartão Alimentação / VR / VA com botão On/Off
  hasFoodCard?: boolean;
  foodCardBalance?: number; // Saldo disponível em reais
  foodCardMonthlyAllowance?: number; // Recarga mensal contratada
  foodCardClosingDay?: number; // Dia de recarga mensal
  // Commercial SaaS Subscription
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string; // YYYY-MM-DD
  planName?: 'Mensal' | 'Trimestral' | 'Anual';
  preferences: UserPreferences;
  financialDiagnostic?: FinancialDiagnostic;
}

export interface Transaction {
  id: string;
  userId: string;
  desc: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD for bill expiration
  isPaid?: boolean;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  installmentInfo?: {
    current: number;
    total: number;
    groupId?: string;
  };
  notes?: string;
}

export interface GoalChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  category?: string;
  target?: string;
}

export interface UserGoal {
  spendingLimit: number;
  savingsGoal: number;
  adminNote?: string;
  updatedAt?: string;
  checklistGoals?: GoalChecklistItem[];
}

export interface MonthlyReport {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  generatedAt: string;
  income: number;
  expenses: number;
  balance: number;
  greeting: string;
  healthDiagnosis: string;
  insights: string[];
  closingMotto: string;
  topCategories: { category: string; amount: number; percentage: number }[];
  deliveredChannels: {
    emailSent: boolean;
    pushSent: boolean;
  };
}

export interface GeminiChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  actionPayload?: {
    type: 'transaction_created' | 'bill_paid' | 'goal_updated' | 'food_card_updated' | 'info';
    details?: any;
  };
}
