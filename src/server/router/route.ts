import { createRouter } from './context'
import { z } from 'zod'

export const routeRouter = createRouter()
.query('getAll', {
  async resolve({ ctx }) {
    return await ctx.prisma.route.findMany()
  },
})
