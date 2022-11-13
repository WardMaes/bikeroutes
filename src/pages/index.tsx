import type { NextPage } from 'next'
import Head from 'next/head'

import { trpc } from '../utils/trpc'
import MapWrapper from '../components/MapWrapper'
// import { Tutorial } from '../components/Tutorial'
import { Controls } from '../components/Controls'

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
          {/* <div className="absolute left-0 bottom-0 w-60 z-10">
            <Tutorial />
          </div> */}
          <MapWrapper />
          <Controls />
        </div>
      </main>
    </>
  )
}

export default Home
