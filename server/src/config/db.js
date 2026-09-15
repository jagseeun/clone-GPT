import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5433', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password123',
  database: process.env.PGDATABASE || 'clonegpt',
});

// 데이터베이스 스키마 초기화 함수
export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
    
    const sqlPath = path.join(__dirname, '../schema/init.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('✅ 데이터베이스 스키마(테이블 및 인덱스) 확인 및 초기화 완료');
    }
    client.release();
    return true;
  } catch (err) {
    console.warn('⚠️ PostgreSQL 연결 실패 (로컬 DB 또는 Docker 컨테이너 실행 여부를 확인하세요):', err.message);
    return false;
  }
}

export default pool;
