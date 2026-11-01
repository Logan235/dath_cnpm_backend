/**
 * Script chạy adapter-layer.sql migration
 * Usage: node scripts/run-adapter-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running Adapter Layer Migration...\n');

  // Load environment variables
  require('dotenv').config();

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'do_an_tong_hop',
    password: process.env.DB_PASSWORD || '@Trung2006',
    database: process.env.DB_NAME || 'ad_monitoring',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'src', 'database', 'adapter-layer.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing adapter-layer.sql...\n');

    // Execute SQL
    await client.query(sql);

    console.log('✅ Adapter layer migration completed!\n');

    // Query stats
    const stats = await client.query('SELECT * FROM v_adapter_stats');
    console.log('📊 Adapter Stats:');
    console.log(stats.rows[0]);
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
