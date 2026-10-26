/* eslint-disable */
// Chạy file SQL bằng thông tin kết nối trong .env (không cần mở pgAdmin).
//   node scripts/db.js setup   -> schema.sql + seed.sql   (an toàn, giữ dữ liệu cũ)
//   node scripts/db.js reset   -> reset.sql + schema.sql + seed.sql (XÓA SẠCH rồi tạo lại)
//   node scripts/db.js create  -> tạo database DB_NAME nếu chưa có
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) {
    console.error('Không tìm thấy file .env trong thư mục backend. Hãy copy .env.example thành .env rồi sửa DB_PASSWORD.');
    process.exit(1);
  }
  const env = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

async function main() {
  const mode = process.argv[2] || 'setup';
  const env = loadEnv();
  const cfg = {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
  };
  const dbName = env.DB_NAME || 'do_an_tong_hop';

  // Tạo database nếu chưa có
  const admin = new Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`✔ Đã tạo database "${dbName}"`);
  }
  await admin.end();
  if (mode === 'create') return;

  const files =
    mode === 'reset' ? ['reset.sql', 'schema.sql', 'seed.sql'] : ['schema.sql', 'seed.sql'];
  // Dữ liệu mẫu dùng giờ theo múi giờ của máy (giống backend), tránh lệch giờ hiển thị
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const client = new Client({ ...cfg, database: dbName, options: `-c timezone=${tz}` });
  await client.connect();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'database', f), 'utf8');
    await client.query(sql);
    console.log(`✔ Đã chạy ${f}`);
  }
  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
  );
  console.log(`✔ Database "${dbName}" hiện có ${rows[0].n} bảng. Xong!`);
  await client.end();
}

main().catch((e) => {
  console.error('✘ Lỗi:', e.message);
  if (/password authentication failed/i.test(e.message)) console.error('  -> Sai DB_PASSWORD trong file .env');
  if (/ECONNREFUSED/i.test(e.message)) console.error('  -> PostgreSQL chưa chạy hoặc sai DB_HOST/DB_PORT');
  process.exit(1);
});
