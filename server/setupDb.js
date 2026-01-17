require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    console.log('🚀 Menyiapkan Database SmartStock...');
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };
    const dbName = process.env.DB_NAME || 'smartstock_db';
    const tables = [
        `CREATE TABLE IF NOT EXISTS inventory (id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100), name VARCHAR(255), category VARCHAR(100), quantity INT, base_unit VARCHAR(50), alternative_units LONGTEXT, min_level INT, unit_price DECIMAL(15,2), location VARCHAR(100), last_updated DATETIME, status VARCHAR(20) DEFAULT 'active')`,
        `CREATE TABLE IF NOT EXISTS transactions (id VARCHAR(50) PRIMARY KEY, date DATE, type VARCHAR(20), items LONGTEXT, notes TEXT, timestamp DATETIME, supplier_name VARCHAR(255), po_number VARCHAR(100), ri_number VARCHAR(100), photos LONGTEXT)`,
        `CREATE TABLE IF NOT EXISTS reject_inventory (id VARCHAR(50) PRIMARY KEY, sku VARCHAR(100), name VARCHAR(255), base_unit VARCHAR(50), unit2 VARCHAR(50), ratio2 INT, unit3 VARCHAR(50), ratio3 INT, last_updated DATETIME)`,
        `CREATE TABLE IF NOT EXISTS rejects (id VARCHAR(50) PRIMARY KEY, date DATE, items LONGTEXT, notes TEXT, timestamp DATETIME)`,
        `CREATE TABLE IF NOT EXISTS suppliers (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), contact_person VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), address TEXT)`,
        `CREATE TABLE IF NOT EXISTS users (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255), username VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(50), status VARCHAR(50), last_login DATETIME)`,
        `CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value LONGTEXT)`
    ];
    try {
        // Coba koneksi awal (tanpa DB) untuk create DB
        const connection = await mysql.createConnection({ ...config, database: undefined });
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.end();

        // Koneksi ulang dengan DB
        const dbConnection = await mysql.createConnection({ ...config, database: dbName });
        console.log('📂 Membuat tabel-tabel...');
        for (const sql of tables) { await dbConnection.query(sql); }
        
        // Insert Admin Default (Username: admin, Password: admin22 [HASHED])
        // Hash: 3d3467611599540c49097e3a2779836183c50937617565437172083626217315
        await dbConnection.query(
            "INSERT IGNORE INTO users (id, name, username, password, role, status, last_login) VALUES ('1', 'Admin Utama', 'admin', '3d3467611599540c49097e3a2779836183c50937617565437172083626217315', 'admin', 'active', NOW())"
        );
        console.log('✅ Database berhasil dikonfigurasi!');
        await dbConnection.end();
        process.exit(0);
    } catch (error) { 
        console.error('❌ Gagal Setup DB:', error.message); 
        process.exit(1); 
    }
}
setupDatabase();