const mysql = require('mysql2/promise');
require('dotenv').config();

let dbName = process.env.DB_NAME || 'guni_bags_db';

let pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

async function createTables(targetPool) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      mobile VARCHAR(15) NOT NULL UNIQUE,
      country_code VARCHAR(5) NOT NULL DEFAULT '+91',
      name VARCHAR(100) NOT NULL,
      business_name VARCHAR(150),
      role ENUM('SUPER_ADMIN', 'OWNER', 'MANAGER') NOT NULL DEFAULT 'OWNER',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS otp_sessions (
      id VARCHAR(36) PRIMARY KEY,
      session_id VARCHAR(50) NOT NULL UNIQUE,
      mobile VARCHAR(15) NOT NULL,
      country_code VARCHAR(5) NOT NULL DEFAULT '+91',
      otp_hash VARCHAR(255) NOT NULL,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      attempt_count INT NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      last_sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_token (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      mobile VARCHAR(15),
      rate_per_bag DECIMAL(10,2) NOT NULL DEFAULT 5.00,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      address TEXT,
      notes TEXT,
      created_by VARCHAR(36),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_emp_created_by (created_by)
    )`,
    `CREATE TABLE IF NOT EXISTS work_entries (
      id VARCHAR(36) PRIMARY KEY,
      employee_id VARCHAR(36) NOT NULL,
      date DATE NOT NULL,
      bag_count INT NOT NULL DEFAULT 0,
      rate_per_bag DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) GENERATED ALWAYS AS (bag_count * rate_per_bag) STORED,
      entry_time TIME,
      notes TEXT,
      created_by VARCHAR(36),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_work_date (date),
      INDEX idx_work_employee (employee_id),
      INDEX idx_work_created_by (created_by)
    )`,
    `CREATE TABLE IF NOT EXISTS payouts (
      id VARCHAR(36) PRIMARY KEY,
      employee_id VARCHAR(36) NOT NULL,
      date DATE NOT NULL,
      payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      pending_before_payout DECIMAL(10,2) DEFAULT 0.00,
      remaining_amount DECIMAL(10,2) DEFAULT 0.00,
      payment_mode ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE') NOT NULL DEFAULT 'CASH',
      reference_note TEXT,
      created_by VARCHAR(36),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payout_date (date),
      INDEX idx_payout_employee (employee_id),
      INDEX idx_payout_created_by (created_by)
    )`
  ];

  for (const sql of tables) {
    try {
      await targetPool.query(sql);
    } catch (e) {
      console.warn('[DB] Table notice:', e.message);
    }
  }

  // Safe migration for role column
  try {
    await targetPool.query(`ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN', 'OWNER', 'MANAGER') NOT NULL DEFAULT 'OWNER'`);
  } catch (e) {}

  // Seed default admin and sample employees if empty
  try {
    const [existingUsers] = await targetPool.query('SELECT id FROM users LIMIT 1');
    if (existingUsers.length === 0) {
      await targetPool.query(`
        INSERT INTO users (id, mobile, country_code, name, business_name, role)
        VALUES ('usr_001', '9876543210', '+91', 'Varun Agravat', 'Agravat Gunny Bags Trading Co.', 'SUPER_ADMIN')
      `);
      console.log('✅ Demo user seeded (mobile: 9876543210)');
    }

    const [existingEmp] = await targetPool.query('SELECT id FROM employees LIMIT 1');
    if (existingEmp.length === 0) {
      await targetPool.query(`
        INSERT INTO employees (id, name, mobile, rate_per_bag, is_active, notes, created_by)
        VALUES 
          ('emp_1', 'Ramesh', '9876543210', 5.00, TRUE, 'Experienced worker', 'usr_001'),
          ('emp_2', 'Suresh', '9876543211', 5.00, TRUE, '', 'usr_001'),
          ('emp_3', 'Dinesh', '9876543212', 5.50, TRUE, 'Stitching expert', 'usr_001')
      `);
      console.log('✅ Sample employees seeded');
    }
  } catch (e) {
    console.warn('[DB] Seed notice:', e.message);
  }
}

async function testConnection(retries = 5, delayMs = 3000) {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '123456';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Step 1: Ensure database exists
      try {
        const rootConn = await mysql.createConnection({ host, port, user, password });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();
      } catch (err) {
        console.warn(`[DB] Notice creating database ${dbName}: ${err.message}`);
      }

      // Step 2: Test pool connection
      const conn = await pool.getConnection();
      console.log(`✅ MySQL connected successfully to ${dbName} (${host}:${port})`);
      conn.release();

      // Step 3: Synchronize tables
      await createTables(pool);
      return;
    } catch (err) {
      console.error(`❌ [Attempt ${attempt}/${retries}] MySQL connection failed: ${err.message}`);

      // Try fallback to 'defaultdb' if guni_bags_db failed
      if (dbName !== 'defaultdb' && err.code === 'ER_BAD_DB_ERROR') {
        console.warn(`[DB] Database ${dbName} does not exist, falling back to 'defaultdb'...`);
        dbName = 'defaultdb';
        pool = mysql.createPool({
          host,
          port,
          user,
          password,
          database: 'defaultdb',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          timezone: '+00:00',
        });
        continue;
      }

      if (attempt < retries) {
        console.log(`⏳ Waiting ${delayMs / 1000}s before retrying MySQL connection...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.error('⚠️ Could not connect to MySQL after all retries. Server will remain online to accept requests and retry later.');
      }
    }
  }
}

// Proxy pool export to always use current active pool instance
const poolProxy = new Proxy({}, {
  get(target, prop) {
    return pool[prop];
  }
});

module.exports = { pool: poolProxy, testConnection };
