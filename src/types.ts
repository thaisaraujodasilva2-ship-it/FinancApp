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
  themePreference?: 'light' | 'dark';
  authProvider?: 'email' | 'google';
  // Cartão Alimentação / VR / VA
  foodCardBalance?: number; // Saldo disponível em reais
  foodCardMonthlyAllowance?: number; // Recarga mensal contratada
  foodCardClosingDay?: number; // Dia de recarga mensal
  // Commercial SaaS Subscription
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string; // YYYY-MM-DD
  planName?: 'Mensal' | 'Trimestral' | 'Anual';
  preferences: UserPreferences;
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
