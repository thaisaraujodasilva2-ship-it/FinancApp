import { User, Transaction, UserGoal, MonthlyReport } from '../types';
import { FirebaseDB, testFirestoreConnection } from './firebase';

const STORAGE_KEYS = {
  USERS: 'fa_users',
  TRANSACTIONS: 'fa_transactions',
  GOALS: 'fa_goals',
  SESSION: 'fa_session',
  THEME: 'fa_theme',
  REPORTS: 'fa_monthly_reports',
};

// Calculate relative dates for testing alerts (today, in 2 days, and overdue)
const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];

const dateToday = formatDate(today);

const dateIn2Days = new Date(today);
dateIn2Days.setDate(today.getDate() + 2);
const dateIn2DaysStr = formatDate(dateIn2Days);

const dateIn5Days = new Date(today);
dateIn5Days.setDate(today.getDate() + 5);
const dateIn5DaysStr = formatDate(dateIn5Days);

const dateYesterday = new Date(today);
dateYesterday.setDate(today.getDate() - 1);
const dateYesterdayStr = formatDate(dateYesterday);

const INITIAL_USERS: User[] = [
  {
    id: 'admin-master',
    name: 'Administrador Master',
    email: 'dnacontabilidade8@gmail.com',
    pass: 'Perfumari@20',
    role: 'admin',
    createdAt: '2026-01-01',
    status: 'active',
    themePreference: 'light',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2030-12-31',
    planName: 'Anual',
    foodCardBalance: 1500.0,
    foodCardMonthlyAllowance: 1800.0,
    foodCardClosingDay: 1,
    preferences: {
      monthlyClosingDay: 1,
      notificationChannels: { email: true, googleCalendar: true, push: true },
      alertDaysAdvance: 2,
    },
  },
  {
    id: 'user-demo-1',
    name: 'Maria Oliveira',
    email: 'maria@sistema.com',
    pass: '123456',
    role: 'user',
    createdAt: '2026-01-15',
    status: 'active',
    themePreference: 'light',
    subscriptionStatus: 'active',
    subscriptionExpiresAt: '2026-12-31',
    planName: 'Anual',
    foodCardBalance: 865.0,
    foodCardMonthlyAllowance: 1200.0,
    foodCardClosingDay: 5,
    preferences: {
      monthlyClosingDay: 5,
      notificationChannels: { email: true, googleCalendar: true, push: true },
      alertDaysAdvance: 2,
    },
  },
  {
    id: 'user-demo-2',
    name: 'Carlos Mendes',
    email: 'carlos@sistema.com',
    pass: '123456',
    role: 'user',
    createdAt: '2026-02-01',
    status: 'active',
    themePreference: 'dark',
    subscriptionStatus: 'pending',
    subscriptionExpiresAt: dateIn2DaysStr,
    planName: 'Mensal',
    foodCardBalance: 420.0,
    foodCardMonthlyAllowance: 900.0,
    foodCardClosingDay: 1,
    preferences: {
      monthlyClosingDay: 10,
      notificationChannels: { email: true, googleCalendar: false, push: true },
      alertDaysAdvance: 2,
    },
  },
  {
    id: 'user-demo-3',
    name: 'Lucas Ferreira',
    email: 'lucas@sistema.com',
    pass: '123456',
    role: 'user',
    createdAt: '2026-02-15',
    status: 'active',
    themePreference: 'light',
    subscriptionStatus: 'expired',
    subscriptionExpiresAt: dateYesterdayStr,
    planName: 'Mensal',
    foodCardBalance: 210.0,
    foodCardMonthlyAllowance: 1000.0,
    foodCardClosingDay: 5,
    preferences: {
      monthlyClosingDay: 1,
      notificationChannels: { email: true, googleCalendar: true, push: true },
      alertDaysAdvance: 2,
    },
  },
];

const INITIAL_GOALS: Record<string, UserGoal> = {
  'user-demo-1': {
    spendingLimit: 4500.0,
    savingsGoal: 1500.0,
    adminNote: 'Mantenha o foco em reduzir gastos variáveis aos finais de semana para atingir sua meta de poupança.',
    updatedAt: '2026-02-15',
    checklistGoals: [
      { id: 'g-1', title: 'Manter despesas fixas e variáveis abaixo de R$ 4.500', completed: true, target: 'Teto R$ 4.500' },
      { id: 'g-2', title: 'Guardar R$ 1.500 na reserva de oportunidade', completed: false, target: 'Meta R$ 1.500' },
      { id: 'g-3', title: 'Pagar todas as contas e faturas antes do vencimento', completed: false, target: 'Zero Multas' },
      { id: 'g-4', title: 'Não ultrapassar a recarga mensal do Cartão Alimentação', completed: true, target: 'Teto R$ 1.200' },
    ],
  },
  'user-demo-2': {
    spendingLimit: 2500.0,
    savingsGoal: 800.0,
    adminNote: 'Atenção aos parcelamentos no cartão de crédito; seus gastos ultrapassaram o teto estipulado.',
    updatedAt: '2026-02-20',
    checklistGoals: [
      { id: 'g-21', title: 'Não fazer novos parcelamentos no cartão de crédito', completed: false },
      { id: 'g-22', title: 'Guardar ao menos R$ 800 este mês', completed: false },
      { id: 'g-23', title: 'Quitar pendências atrasadas do mês anterior', completed: true },
    ],
  },
  'user-demo-3': {
    spendingLimit: 3000.0,
    savingsGoal: 600.0,
    adminNote: 'Regularize sua assinatura mensal para desbloquear todos os recursos e relatórios automáticos.',
    updatedAt: '2026-03-01',
    checklistGoals: [
      { id: 'g-31', title: 'Renovar assinatura do FinancApp', completed: false },
      { id: 'g-32', title: 'Economizar R$ 600 em investimentos', completed: false },
    ],
  },
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  // Maria Oliveira (user-demo-1)
  {
    id: 'tx-101',
    userId: 'user-demo-1',
    desc: 'Salário Mensal - Empresa Tech',
    amount: 6800.0,
    type: 'income',
    category: 'Salário',
    date: '2026-11-01',
    paymentMethod: 'Transferência',
    isPaid: true,
  },
  {
    id: 'tx-102',
    userId: 'user-demo-1',
    desc: 'Projeto Freelance Design UI',
    amount: 1450.0,
    type: 'income',
    category: 'Investimentos',
    date: '2026-11-04',
    paymentMethod: 'Pix',
    isPaid: true,
  },
  {
    id: 'tx-103',
    userId: 'user-demo-1',
    desc: 'Aluguel do Apartamento',
    amount: 1950.0,
    type: 'fixed',
    category: 'Moradia',
    date: dateToday,
    dueDate: dateToday, // VENCE HOJE!
    isPaid: false,
    paymentMethod: 'Pix',
    notes: 'Aluguel com vencimento hoje',
  },
  {
    id: 'tx-104',
    userId: 'user-demo-1',
    desc: 'Conta de Energia Elétrica (Enel)',
    amount: 235.4,
    type: 'fixed',
    category: 'Serviços',
    date: dateIn2DaysStr,
    dueDate: dateIn2DaysStr, // VENCE EM 2 DIAS!
    isPaid: false,
    paymentMethod: 'Boleto',
    notes: 'Alerta programado 2 dias antes',
  },
  {
    id: 'tx-105',
    userId: 'user-demo-1',
    desc: 'Fogão 4 Bocas (Parcela 3/10)',
    amount: 149.9,
    type: 'fixed',
    category: 'Moradia',
    date: dateIn5DaysStr,
    dueDate: dateIn5DaysStr,
    isPaid: false,
    paymentMethod: 'Cartão de Crédito',
    installmentInfo: { current: 3, total: 10, groupId: 'grp-fogao' },
  },
  {
    id: 'tx-106',
    userId: 'user-demo-1',
    desc: 'Plano de Internet Fibra 600Mb',
    amount: 129.9,
    type: 'fixed',
    category: 'Serviços',
    date: '2026-11-05',
    dueDate: '2026-11-05',
    isPaid: true,
    paidAt: '2026-11-05',
    paymentMethod: 'Boleto',
  },
  {
    id: 'tx-107',
    userId: 'user-demo-1',
    desc: 'Supermercado Mensal - Pão de Açúcar',
    amount: 780.45,
    type: 'variable',
    category: 'Alimentação',
    date: '2026-11-03',
    paymentMethod: 'Cartão de Débito',
    isPaid: true,
  },
  {
    id: 'tx-108',
    userId: 'user-demo-1',
    desc: 'Jantar Restaurante Italiano',
    amount: 185.0,
    type: 'variable',
    category: 'Lazer',
    date: '2026-11-06',
    paymentMethod: 'Cartão de Crédito',
    isPaid: true,
  },
  {
    id: 'tx-109',
    userId: 'user-demo-1',
    desc: 'Combustível Posto Shell',
    amount: 220.0,
    type: 'variable',
    category: 'Transporte',
    date: '2026-11-02',
    paymentMethod: 'Pix',
    isPaid: true,
  },

  // Carlos Mendes (user-demo-2)
  {
    id: 'tx-201',
    userId: 'user-demo-2',
    desc: 'Salário Mensal',
    amount: 3200.0,
    type: 'income',
    category: 'Salário',
    date: '2026-11-01',
    paymentMethod: 'Transferência',
    isPaid: true,
  },
  {
    id: 'tx-202',
    userId: 'user-demo-2',
    desc: 'Condomínio Residencial',
    amount: 650.0,
    type: 'fixed',
    category: 'Moradia',
    date: dateToday,
    dueDate: dateToday, // VENCE HOJE!
    isPaid: false,
    paymentMethod: 'Boleto',
  },
  {
    id: 'tx-203',
    userId: 'user-demo-2',
    desc: 'Smartphone 5G (Parcela 5/12)',
    amount: 389.0,
    type: 'fixed',
    category: 'Serviços',
    date: dateIn2DaysStr,
    dueDate: dateIn2DaysStr, // VENCE EM 2 DIAS!
    isPaid: false,
    paymentMethod: 'Cartão de Crédito',
    installmentInfo: { current: 5, total: 12, groupId: 'grp-smart' },
  },
];

export const DB = {
  getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) {
        this.saveUsers(INITIAL_USERS);
        return INITIAL_USERS;
      }
      const users: User[] = JSON.parse(data);
      const masterIdx = users.findIndex((u) => u.email.toLowerCase() === 'dnacontabilidade8@gmail.com');
      if (masterIdx === -1) {
        users.unshift(INITIAL_USERS[0]);
        this.saveUsers(users);
      } else {
        // Guarantee current password and admin role
        if (users[masterIdx].pass !== 'Perfumari@20' || users[masterIdx].role !== 'admin' || users[masterIdx].status !== 'active') {
          users[masterIdx].pass = 'Perfumari@20';
          users[masterIdx].role = 'admin';
          users[masterIdx].status = 'active';
          this.saveUsers(users);
        }
      }
      return users;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: User[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      users.forEach((u) => FirebaseDB.saveUser(u));
    } catch (e) {
      console.error('Error saving users', e);
    }
  },

  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        this.saveTransactions(INITIAL_TRANSACTIONS);
        return INITIAL_TRANSACTIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  },

  saveTransactions(txs: Transaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
      txs.forEach((t) => FirebaseDB.saveTransaction(t));
    } catch (e) {
      console.error('Error saving transactions', e);
    }
  },

  deleteTransaction(txId: string): void {
    const txs = this.getTransactions().filter((t) => t.id !== txId);
    this.saveTransactions(txs);
    FirebaseDB.deleteTransaction(txId);
  },

  getGoals(): Record<string, UserGoal> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (!data) {
        this.saveGoals(INITIAL_GOALS);
        return INITIAL_GOALS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_GOALS;
    }
  },

  saveGoals(goals: Record<string, UserGoal>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      Object.entries(goals).forEach(([userId, goal]) => {
        FirebaseDB.saveGoal(userId, goal);
      });
    } catch (e) {
      console.error('Error saving goals', e);
    }
  },

  getUserGoal(userId: string): UserGoal {
    const goals = this.getGoals();
    return (
      goals[userId] || {
        spendingLimit: 3000.0,
        savingsGoal: 1000.0,
        adminNote: 'Defina limites saudáveis de gastos para seu perfil.',
        updatedAt: new Date().toISOString().split('T')[0],
      }
    );
  },

  updateUserGoal(userId: string, goal: UserGoal): void {
    const goals = this.getGoals();
    goals[userId] = {
      ...goal,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.saveGoals(goals);
  },

  getMonthlyReports(): MonthlyReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMonthlyReport(report: MonthlyReport): void {
    try {
      const reports = this.getMonthlyReports();
      const updated = [report, ...reports.filter((r) => r.id !== report.id)];
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving report', e);
    }
  },

  getSession(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setSession(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    } catch (e) {
      console.error('Error saving session', e);
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (e) {
      console.error('Error clearing session', e);
    }
  },

  getTheme(): 'light' | 'dark' {
    const session = this.getSession();
    if (session?.themePreference) return session.themePreference;
    return (localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark') || 'light';
  },

  setTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const session = this.getSession();
    if (session) {
      session.themePreference = theme;
      this.setSession(session);
      const users = this.getUsers().map((u) => (u.id === session.id ? { ...u, themePreference: theme } : u));
      this.saveUsers(users);
    }
  },

  resetDemoData(): void {
    this.saveUsers(INITIAL_USERS);
    this.saveTransactions(INITIAL_TRANSACTIONS);
    this.saveGoals(INITIAL_GOALS);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
  },

  async syncWithCloud(): Promise<void> {
    try {
      testFirestoreConnection();
      const cloudUsers = await FirebaseDB.fetchUsers();
      if (cloudUsers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudUsers));
      } else {
        INITIAL_USERS.forEach((u) => FirebaseDB.saveUser(u));
        INITIAL_TRANSACTIONS.forEach((t) => FirebaseDB.saveTransaction(t));
        Object.entries(INITIAL_GOALS).forEach(([uid, g]) => FirebaseDB.saveGoal(uid, g));
      }
    } catch (err) {
      console.warn('Sync notice:', err);
    }
  },
};
