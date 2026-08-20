import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const db = new Database(dbPath)

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "GlobalSetting" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'GLOBAL',
        "aiEndpoint" TEXT DEFAULT 'https://api.openai.com/v1',
        "aiApiKey" TEXT,
        "aiModel" TEXT DEFAULT 'opencode-zen',
        "globalPrice" INTEGER NOT NULL DEFAULT 250,
        "maintenanceMode" BOOLEAN NOT NULL DEFAULT 0,
        "updatedAt" DATETIME NOT NULL
    );
  `)
  
  // Insert default row if not exists
  const count = db.prepare('SELECT COUNT(*) as count FROM "GlobalSetting"').get() as { count: number }
  if (count.count === 0) {
    db.prepare(`
      INSERT INTO "GlobalSetting" (id, aiEndpoint, aiModel, globalPrice, maintenanceMode, updatedAt)
      VALUES ('GLOBAL', 'https://api.openai.com/v1', 'opencode-zen', 250, 0, datetime('now'))
    `).run()
  }

  // Also remove ai related columns from UserSettings if we want, but SQLite doesn't strictly need DROP COLUMN to avoid errors in Prisma if Prisma ignores them.
  console.log('GlobalSetting table created successfully.')
} catch (error) {
  console.error(error)
}
