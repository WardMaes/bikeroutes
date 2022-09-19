import React, { useState } from 'react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'

import { Map } from './Map'
import { Controls } from './Controls'

const render = (status: Status) => {
  return <div>{status}</div>
}

export default function MapWrapper() {
  const [center] = useState<google.maps.LatLngLiteral>({
    lat: 51.092266,
    lng: 3.756351,
  })

  return (
    <Wrapper
      apiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY || ''}
      render={render}
      libraries={['drawing']}
    >
      <Map
        center={center}
        zoom={15}
        style={{ flexGrow: '1', height: '100%' }}
      />
      <div className="absolute right-0 top-0 w-60 py-2 px-4 bg-white">
        <Controls />
      </div>
    </Wrapper>
  )
}
