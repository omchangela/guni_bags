const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'guni_bags_db';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  multipleStatements: true,
});

async function testConnection() {
  try {
    // 1. Ensure database exists
    try {
      const rootConn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootConn.end();
    } catch (e) {
      // If user doesn't have create database permission, continue to try direct database connection
    }

    // 2. Connect pool
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');

    // 3. Initialize schema if needed
    const schemaFile = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const sql = fs.readFileSync(schemaFile, 'utf8');
      await conn.query(sql);
      console.log('✅ Database schema verified');
    }
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
