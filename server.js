import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// =======================
// DATABASE CONFIG
// =======================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smartstock_db',
    dateStrings: true
};

let pool;
let dbConnected = false;

// =======================
// INIT DATABASE
// =======================
async function initDb() {
    try {
        pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();
        console.log('✅ DATABASE CONNECTED');
        dbConnected = true;

        // Default Admin Hash (admin22)
        const ADMIN_HASH = crypto
            .createHash('sha256')
            .update('admin22')
            .digest('hex');

        const [rows] = await conn.query("SELECT id FROM users WHERE username = 'admin'");
        if (rows.length === 0) {
            console.log('⚠️ Creating default admin...');
            await conn.query(
                `INSERT INTO users (id, name, username, password, role, status, last_login)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                ['1', 'Admin Utama', 'admin', ADMIN_HASH, 'admin', 'active']
            );
        }
        conn.release();
    } catch (err) {
        console.error('❌ DB ERROR:', err.message);
        dbConnected = false;
        setTimeout(initDb, 5000);
    }
}

// =======================
// UTILS
// =======================
const toCamel = (row) => {
    const res = {};
    for (let key in row) {
        const camel = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
        let val = row[key];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try { val = JSON.parse(val); } catch {}
        }
        res[camel] = val;
    }
    return res;
};

const checkDb = (req, res, next) => {
    if (!dbConnected || !pool) {
        return res.status(503).json({ status: 'error', message: 'Database offline' });
    }
    next();
};

// =======================
// ROUTES
// =======================

// Root endpoint for direct checks
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        database: dbConnected ? 'connected' : 'offline',
        service: 'smartstock-backend'
    });
});

// Specific API health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        database: dbConnected ? 'connected' : 'offline',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/login', checkDb, async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
        if (rows.length === 0) return res.status(401).json({ status: 'error', message: 'User tidak ditemukan' });
        
        const user = rows[0];
        const dbPassword = user.password || '';
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');

        if (dbPassword === password || dbPassword === inputHash) {
            await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
            return res.json({ status: 'success', data: toCamel(user) });
        }
        return res.status(401).json({ status: 'error', message: 'Password salah' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

app.get('/api/data', checkDb, async (req, res) => {
    try {
        const [inventory] = await pool.query('SELECT * FROM inventory');
        const [transactions] = await pool.query('SELECT * FROM transactions ORDER BY timestamp DESC');
        const [reject_inventory] = await pool.query('SELECT * FROM reject_inventory');
        const [rejects] = await pool.query('SELECT * FROM rejects');
        const [suppliers] = await pool.query('SELECT * FROM suppliers');
        const [users] = await pool.query('SELECT * FROM users');

        res.json({
            status: 'success',
            data: {
                inventory: inventory.map(toCamel),
                transactions: transactions.map(toCamel),
                reject_inventory: reject_inventory.map(toCamel),
                rejects: rejects.map(toCamel),
                suppliers: suppliers.map(toCamel),
                users: users.map(toCamel)
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/sync', checkDb, async (req, res) => {
    const { type, data } = req.body;
    if (!type || !data) return res.status(400).json({ status: 'error', message: 'Missing type or data' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (type === 'inventory') {
            await conn.query('DELETE FROM inventory');
            for (const item of data) {
                await conn.query(
                    `INSERT INTO inventory (id, sku, name, category, quantity, base_unit, alternative_units, min_level, unit_price, location, last_updated, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.id, item.sku, item.name, item.category, item.quantity, item.baseUnit, JSON.stringify(item.alternativeUnits || []), item.minLevel, item.unitPrice, item.location, item.lastUpdated, item.status || 'active']
                );
            }
        } else if (type === 'transactions') {
            await conn.query('DELETE FROM transactions');
            for (const tx of data) {
                await conn.query(
                    `INSERT INTO transactions (id, date, type, items, notes, timestamp, supplier_name, po_number, ri_number, photos)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [tx.id, tx.date, tx.type, JSON.stringify(tx.items), tx.notes, tx.timestamp, tx.supplierName, tx.poNumber, tx.riNumber, JSON.stringify(tx.photos || [])]
                );
            }
        } else if (type === 'reject_inventory') {
            await conn.query('DELETE FROM reject_inventory');
            for (const item of data) {
                await conn.query(
                    `INSERT INTO reject_inventory (id, sku, name, base_unit, unit2, ratio2, unit3, ratio3, last_updated)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.id, item.sku, item.name, item.baseUnit, item.unit2, item.ratio2, item.unit3, item.ratio3, item.lastUpdated]
                );
            }
        } else if (type === 'rejects') {
            await conn.query('DELETE FROM rejects');
            for (const log of data) {
                await conn.query(
                    `INSERT INTO rejects (id, date, items, notes, timestamp)
                     VALUES (?, ?, ?, ?, ?)`,
                    [log.id, log.date, JSON.stringify(log.items), log.notes, log.timestamp]
                );
            }
        } else if (type === 'suppliers') {
            await conn.query('DELETE FROM suppliers');
            for (const s of data) {
                await conn.query(
                    `INSERT INTO suppliers (id, name, contact_person, email, phone, address)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [s.id, s.name, s.contactPerson, s.email, s.phone, s.address]
                );
            }
        } else if (type === 'users') {
            await conn.query('DELETE FROM users');
            for (const u of data) {
                await conn.query(
                    `INSERT INTO users (id, name, username, password, role, status, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [u.id, u.name, u.username, u.password, u.role, u.status, u.lastLogin]
                );
            }
        } else if (type === 'settings') {
            for (const [key, value] of Object.entries(data)) {
                await conn.query(
                    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                    [key, JSON.stringify(value), JSON.stringify(value)]
                );
            }
        }

        await conn.commit();
        res.json({ status: 'success', message: `Data ${type} synced successfully` });
    } catch (err) {
        await conn.rollback();
        console.error('SYNC ERROR:', err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        conn.release();
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});

initDb();