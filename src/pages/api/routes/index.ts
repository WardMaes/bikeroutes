// src/pages/api/route.ts
import type { NextApiRequest, NextApiResponse } from 'next'

import { prisma } from '../../../server/db/client'

const routes = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const routes = await prisma.route.findMany({
      include: {
        latlngString: true,
      },
    })
    return res.status(200).json(routes)
  } else if (req.method === 'PUT') {
    const body = JSON.parse(req.body) as {
      snappedCoordinates: { lat: number; lng: number }[]
    }

    const route = await prisma.route.create({
      data: {
        latlngString: {
          createMany: {
            data: body.snappedCoordinates,
          },
        },
      },
      include: {
        latlngString: true,
      },
    })

    return res.status(200).json({ done: 'nothing' })
  } else {
    return res.status(405).end()
  }
}

export default routes
