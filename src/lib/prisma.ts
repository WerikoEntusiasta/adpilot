import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// Em produção no Docker, o banco de dados estará em /app/prisma/dev.db ou conforme o volume.
// Para garantir que funciona em dev e prod, podemos usar um caminho absoluto baseado no cwd se não estiver na raiz, 
// mas o padrão Prisma usa a pasta prisma.
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'prisma', 'dev.db')
  : path.join(process.cwd(), 'prisma', 'dev.db')

const sqlite = new Database(dbPath)
const adapter = new PrismaBetterSqlite3(sqlite)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
