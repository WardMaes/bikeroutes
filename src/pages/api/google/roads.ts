import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from '../../../utils/serialize'

const roads = async (req: NextApiRequest, res: NextApiResponse) => {
  const { path } = JSON.parse(req.body)

  const url =
    'https://roads.googleapis.com/v1/snapToRoads?' +
    serialize({
      interpolate: 'true',
      key: process.env.NEXT_PUBLIC_GMAPS_API_KEY,
    }) +
    '&path=' +
    path

  console.log(url)
  const response = await fetch(url)
  const data = await response.json()
  console.log('data', data)

  res.status(200).json(data)
}

export default roads
