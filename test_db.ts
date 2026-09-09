import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const global = await prisma.globalSetting.findUnique({ where: { id: 'GLOBAL' } })
  console.log(JSON.stringify(global, null, 2))
}
main()
