import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  CollectionReference, 
  DocumentData 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import * as T from "../types/database";



// Mock Firebase for "off" state
const isOff = true;

const mockDb: any = {
  collection: () => mockDb,
  doc: () => mockDb,
  get: async () => ({ docs: [], exists: false, data: () => ({}) }),
  onSnapshot: () => ({ unsubscribe: () => {} }),
};

const mockAuth: any = {
  currentUser: null,
  onAuthStateChange: () => () => {},
  signOut: async () => {},
};

export const app = {} as any;
export const auth = mockAuth;
export const db = mockDb;
export const storage = {} as any;

export const collections = {
  settings: mockDb,
  customers: mockDb,
  inventory: mockDb,
  products: mockDb,
  pipeline: mockDb,
  bills: mockDb,
};
