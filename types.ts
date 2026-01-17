export interface UnitDefinition {
  name: string;
  ratio: number; 
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number; 
  baseUnit: string; 
  alternativeUnits?: UnitDefinition[]; 
  minLevel: number; 
  unitPrice: number; 
  location: string;
  lastUpdated: string;
  status?: 'active' | 'inactive'; 
}

export interface RejectItem {
  id: string;
  name: string;
  sku: string;
  baseUnit: string;
  unit2?: string;
  ratio2?: number;
  unit3?: string;
  ratio3?: number;
  lastUpdated: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
  id: string;
  name: string;
  username: string; 
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface MediaItem {
  id: string;
  type: 'youtube' | 'tiktok';
  url: string;
  embedId: string;
  title: string;
  addedAt: string;
}

export interface AppSettings {
  vpsApiUrl: string; // URL VPS / MySQL
  viteGasUrl: string; // URL Google Sheets / GAS
  youtubeApiKey: string;
  tiktokConfig: string;
  mediaItems: MediaItem[];
  lastSheetSync?: string;
}

export interface TableColumn {
  id: string;
  label: string;
  visible: boolean;
}

export interface TablePreferences {
  inventory: TableColumn[];
  history: TableColumn[];
  suppliers: TableColumn[];
  transactions: TableColumn[];
  rejects: TableColumn[];
  rejectMaster: TableColumn[];
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  TRANSACTIONS = 'TRANSACTIONS',
  REJECT = 'REJECT',
  SUPPLIERS = 'SUPPLIERS',
  ADMIN = 'ADMIN', 
  HISTORY = 'HISTORY',
  AI_ASSISTANT = 'AI_ASSISTANT',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type TransactionType = 'IN' | 'OUT';

export interface TransactionItemDetail {
  itemId: string;
  itemName: string; 
  quantityInput: number;
  selectedUnit: string;
  conversionRatio: number;
  totalBaseQuantity: number; 
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  items: TransactionItemDetail[];
  notes?: string;
  timestamp: string;
  supplierName?: string; 
  poNumber?: string; 
  riNumber?: string; 
  photos?: string[]; 
}

export interface RejectItemDetail {
  itemId: string;
  itemName: string;
  sku: string;
  baseUnit: string;
  quantity: number; 
  unit: string; 
  ratio: number; 
  totalBaseQuantity: number;
  reason: string;
  unit2?: string;
  ratio2?: number;
  unit3?: string;
  ratio3?: number;
}

export interface RejectLog {
  id: string;
  date: string;
  items: RejectItemDetail[];
  notes: string;
  timestamp: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}