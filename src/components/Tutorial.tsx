import { useActor } from '@xstate/react'
import { useContext } from 'react'

import { GlobalStateContext } from '../pages/_app'

export const Tutorial = () => {
  const globalServices = useContext(GlobalStateContext)
  const [, send] = useActor(globalServices.tutorialService)

  return (
    <div className="px-4 py-2 flex flex-row bg-white">
      <button className='bg-blue-600 text-white mr-4 px-4 py-2 rounded' onClick={() => send('PREVIOUS')}>BACK</button>
      <button className='bg-blue-600 text-white mr-4 px-4 py-2 rounded' onClick={() => send('NEXT')}>NEXT</button>
      <button className='bg-blue-600 text-white mr-4 px-4 py-2 rounded' onClick={() => send('SKIP')}>SKIP</button>
    </div>
  )
}
