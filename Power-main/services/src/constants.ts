
import { InventoryItem, Supplier, User, AppSettings, TablePreferences } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = []; // Kosongkan initial state agar tidak bingung dengan data DB

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Admin',
    email: 'admin@smartstock.com',
    role: 'admin',
    status: 'active',
    lastLogin: new Date().toISOString()
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  // Fix: Removed geminiApiKey.
  viteGasUrl: '/', 
  youtubeApiKey: '',
  tiktokConfig: '',
  mediaItems: []
};

export const DEFAULT_TABLE_PREFS: TablePreferences = {
  inventory: [
    { id: 'name', label: 'Item Name', visible: true },
    { id: 'category', label: 'Category', visible: true },
    { id: 'quantity', label: 'Stock Level', visible: true },
    { id: 'price', label: 'Price', visible: true },
    { id: 'location', label: 'Location', visible: true },
  ],
  history: [
    { id: 'date', label: 'Date', visible: true },
    { id: 'name', label: 'Item Name', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'qty', label: 'Quantity', visible: true },
    { id: 'total', label: 'Total Base', visible: true },
    { id: 'notes', label: 'Notes', visible: true },
  ],
  suppliers: [
    { id: 'company', label: 'Company Name', visible: true },
    { id: 'contact', label: 'Contact Person', visible: true },
    { id: 'info', label: 'Contact Info', visible: true },
    { id: 'address', label: 'Address', visible: true },
  ]
};

export const CATEGORIES = ['Peripherals', 'Displays', 'Accessories', 'Audio', 'Components', 'Cables'];
