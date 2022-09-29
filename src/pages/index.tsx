import type { NextPage } from 'next'
import Head from 'next/head'

import { trpc } from '../utils/trpc'
import MapWrapper from '../components/MapWrapper'

const Home: NextPage = () => {
  const hello = trpc.useQuery(['example.hello', { text: 'from tRPC' }])

  return (
    <>
      <Head>
        <title>Bikeroutes</title>
        <meta name="description" content="Draw and discover the best routes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="relative mx-auto flex flex-col items-center justify-center min-h-screen">
        <div className="w-screen h-screen">
          <MapWrapper />
        </div>
      </main>
    </>
  )
}

export default Home
