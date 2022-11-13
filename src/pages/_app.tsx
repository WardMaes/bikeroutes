// src/pages/_app.tsx
import { withTRPC } from '@trpc/next'
import type { AppRouter } from '../server/router'
import type { AppType } from 'next/dist/shared/lib/utils'
import superjson from 'superjson'
import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'
import { createContext } from 'react'
import { useInterpret } from '@xstate/react'
import { drawMachine } from '../machines/draw'
import { InterpreterFrom } from 'xstate'
import { tutorialMachine } from '../machines/tutorial'

export const GlobalStateContext = createContext({
  drawService: {} as InterpreterFrom<typeof drawMachine>,
  tutorialService: {} as InterpreterFrom<typeof tutorialMachine>,
})

export const GlobalStateProvider = (props: any) => {
  const drawService = useInterpret(drawMachine)
  const tutorialService = useInterpret(tutorialMachine)

  return (
    <GlobalStateContext.Provider value={{ drawService, tutorialService }}>
      {props.children}
    </GlobalStateContext.Provider>
  )
}

const MyApp: AppType = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <GlobalStateProvider>
        <Component {...pageProps} />
      </GlobalStateProvider>
    </SessionProvider>
  )
}

const getBaseUrl = () => {
  if (typeof window !== undefined) return '' // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

export default withTRPC<AppRouter>({
  config() {
    /**
     * If you want to use SSR, you need to use the server's full URL
     * @link https://trpc.io/docs/ssr
     */
    const url = `${getBaseUrl()}/api/trpc`

    return {
      url,
      transformer: superjson,
      /**
       * @link https://react-query.tanstack.com/reference/QueryClient
       */
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
    }
  },
  /**
   * @link https://trpc.io/docs/ssr
   */
  ssr: false,
})(MyApp)
