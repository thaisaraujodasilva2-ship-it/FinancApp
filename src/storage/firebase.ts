import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, Transaction, UserGoal } from '../types';

export const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without this line
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline / check configuration.');
    }
    // Expected if doc doesn't exist or permissions
    return false;
  }
}

// Collections in Firestore
export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  GOALS: 'goals',
};

// Firestore cloud sync helpers
export const FirebaseDB = {
  async fetchUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.USERS));
      const list: User[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<User, 'id'>) });
      });
      return list;
    } catch (err) {
      console.warn('Could not fetch users from cloud Firestore, falling back to local storage:', err);
      return [];
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, user.id), {
        name: user.name,
        email: user.email,
        pass: user.pass,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        themePreference: user.themePreference || 'light',
      });
    } catch (err) {
      console.warn('Could not write user to cloud Firestore:', err);
    }
  },

  async fetchTransactions(): Promise<Transaction[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
      const list: Transaction[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) });
      });
      return list;
    } catch (err) {
      console.warn('Could not fetch transactions from cloud Firestore:', err);
      return [];
    }
  },

  async saveTransaction(tx: Transaction): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, tx.id), { ...tx });
    } catch (err) {
      console.warn('Could not save transaction to cloud Firestore:', err);
    }
  },

  async deleteTransaction(txId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TRANSACTIONS, txId));
    } catch (err) {
      console.warn('Could not delete transaction from cloud Firestore:', err);
    }
  },

  async fetchGoals(): Promise<Record<string, UserGoal>> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.GOALS));
      const result: Record<string, UserGoal> = {};
      snap.forEach((d) => {
        result[d.id] = d.data() as UserGoal;
      });
      return result;
    } catch (err) {
      console.warn('Could not fetch goals from cloud Firestore:', err);
      return {};
    }
  },

  async saveGoal(userId: string, goal: UserGoal): Promise<void> {
    try {
      await setDoc(doc(db, COLLECTIONS.GOALS, userId), {
        userId,
        spendingLimit: goal.spendingLimit,
        savingsGoal: goal.savingsGoal,
        adminNote: goal.adminNote || '',
        updatedAt: goal.updatedAt || new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.warn('Could not save goal to cloud Firestore:', err);
    }
  },
};
