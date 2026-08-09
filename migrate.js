import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const database = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    const sql = fs.readFileSync('./db/migrations/008_add_is_deleted_to_messages.sql', 'utf8');
    await database.query(sql);
    console.log('Migration 008 applied successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await database.end();
  }
}

migrate();
