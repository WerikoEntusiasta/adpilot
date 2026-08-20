import { PrismaConfig } from '@prisma/config'

export default {
  earlyAccess: true,
  schema: {
    datasource: {
      url: 'file:./dev.db',
    },
  },
} satisfies PrismaConfig
