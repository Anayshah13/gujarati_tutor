import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'gujgyani.db')

let db: Database.Database | undefined

export const getDb = (): Database.Database => {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initDb(db)
  }
  return db
}

const initDb = (database: Database.Database) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT (datetime('now')),
      start_level INTEGER NOT NULL,
      end_level INTEGER,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      weak_skill TEXT,
      insight TEXT
    );

    CREATE TABLE IF NOT EXISTS session_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      band INTEGER NOT NULL,
      question_type TEXT NOT NULL,
      correct INTEGER NOT NULL,
      level_before INTEGER NOT NULL,
      level_after INTEGER NOT NULL,
      answered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `)
}
