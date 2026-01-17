import { InventoryItem, Supplier, User, AppSettings, TablePreferences } from './types';

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

// Default User: admin / admin22
// Hash SHA-256 untuk 'admin22': 3d3467611599540c49097e3a2779836183c50937617565437172083626217315
export const INITIAL_USERS: User[] = [
  {
    id: '1',
    name: 'Admin Utama',
    username: 'admin',
    password: '3d3467611599540c49097e3a2779836183c50937617565437172083626217315', 
    role: 'admin',
    status: 'active',
    lastLogin: new Date().toISOString()
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  vpsApiUrl: '/', // Default ke '/' agar otomatis menggunakan proxy di vite.config.ts / vercel.json
  viteGasUrl: '', 
  youtubeApiKey: '',
  tiktokConfig: '',
  mediaItems: [],
  lastSheetSync: ''
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
  ],
  transactions: [
    { id: 'date', label: 'Date', visible: true },
    { id: 'type', label: 'Tipe', visible: true },
    { id: 'details', label: 'Rincian', visible: true },
    { id: 'docs', label: 'Dokumen', visible: true },
    { id: 'notes', label: 'Catatan', visible: true },
  ],
  rejects: [
    { id: 'date', label: 'Tanggal', visible: true },
    { id: 'item', label: 'Barang', visible: true },
    { id: 'qty', label: 'Jumlah', visible: true },
    { id: 'reason', label: 'Alasan Reject', visible: true },
    { id: 'notes', label: 'Catatan', visible: true },
  ],
  rejectMaster: [
    { id: 'sku', label: 'SKU', visible: true },
    { id: 'name', label: 'Nama Barang', visible: true },
    { id: 'baseUnit', label: 'Unit Dasar', visible: true },
    { id: 'conversions', label: 'Konversi', visible: true },
  ]
};

export const CATEGORIES = ['Peripherals', 'Displays', 'Accessories', 'Audio', 'Components', 'Cables'];