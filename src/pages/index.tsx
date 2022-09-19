import type { NextPage } from 'next'
import Head from 'next/head'

import { trpc } from '../utils/trpc'
import MapWrapper from '../components/MapWrapper'

const Home: NextPage = () => {
  const hello = trpc.useQuery(['example.hello', { text: 'from tRPC' }])

  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
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
