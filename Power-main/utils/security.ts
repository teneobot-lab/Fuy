
// Utility untuk keamanan dan hashing

// Hash SHA-256 untuk 'admin22'
const ADMIN22_HASH = '3d3467611599540c49097e3a2779836183c50937617565437172083626217315';

/**
 * Menghasilkan SHA-256 hash dari string password
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Cek ketersediaan Web Crypto API (Hanya ada di HTTPS / Localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
  }
  
  // Jika diakses via HTTP (Non-Secure), kembalikan string kosong atau error khusus
  // Aplikasi Admin Panel akan menangani ini saat membuat user baru
  throw new Error("Fitur keamanan browser dibatasi pada koneksi HTTP. Gunakan HTTPS untuk enkripsi penuh.");
};

/**
 * Memverifikasi password input dengan hash yang tersimpan
 * Termasuk fallback untuk koneksi HTTP non-secure dan Plain Text legacy
 */
export const verifyPassword = async (inputPassword: string, storedHash: string): Promise<boolean> => {
  // 1. Cek Plain Text (Fallback utama jika database diisi manual tanpa hash)
  if (inputPassword === storedHash) return true;

  // 2. Cek Hash (Web Crypto API - HTTPS/Localhost only)
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const inputHash = await hashPassword(inputPassword);
      return inputHash === storedHash;
    }
  } catch (e) {
    // Silent fail if crypto not available
  }

  // 3. Fallback khusus admin22 jika di HTTP
  if (inputPassword === 'admin22' && storedHash === ADMIN22_HASH) {
      return true;
  }

  return false;
};
