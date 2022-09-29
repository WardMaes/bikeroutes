import React, { useState, useEffect } from 'react'
import { useMachine } from '@xstate/react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'

import { drawMachine } from '../machines/draw'
import { Controls } from './Controls'
import { roadSelectorMachine } from '../machines/road'

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
      libraries={['drawing', 'visualization']}
    >
      <Map
        center={center}
        zoom={15}
        style={{ flexGrow: '1', height: '100%' }}
      />
    </Wrapper>
  )
}

interface MapProps extends google.maps.MapOptions {
  style: { [key: string]: string }
  onClick?: (e: google.maps.MapMouseEvent) => void
  onIdle?: (map: google.maps.Map) => void
  children?: React.ReactNode
}

export const Map: React.FC<MapProps> = ({
  onClick,
  onIdle,
  children,
  style,
  ...options
}) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const [map, setMap] = React.useState<google.maps.Map>()

  React.useEffect(() => {
    if (ref.current && !map) {
      setMap(new window.google.maps.Map(ref.current, {}))
    }
  }, [ref, map])

  // because React does not do deep comparisons, a custom hook is used
  // see discussion in https://github.com/googlemaps/js-samples/issues/946
  useDeepCompareEffectForMaps(() => {
    if (map) {
      map.setOptions(options)
    }
  }, [map, options])

  React.useEffect(() => {
    if (map) {
      ;['click', 'idle'].forEach((eventName) =>
        google.maps.event.clearListeners(map, eventName)
      )

      if (onClick) {
        map.addListener('click', onClick)
      }

      if (onIdle) {
        map.addListener('idle', () => onIdle(map))
      }
    }
  }, [map, onClick, onIdle])

  return (
    <>
      <div ref={ref} style={style} />
      <DrawLayer map={map} />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // set the map prop on the child component
          // TODO: fix cast
          return React.cloneElement(child, { map } as unknown as HTMLElement)
        }
      })}
    </>
  )
}

const deepCompareEqualsForMaps = createCustomEqual(
  // @ts-ignore
  (deepEqual) => (a: any, b: any) => {
    if (
      isLatLngLiteral(a) ||
      a instanceof google.maps.LatLng ||
      isLatLngLiteral(b) ||
      b instanceof google.maps.LatLng
    ) {
      return new google.maps.LatLng(a).equals(new google.maps.LatLng(b))
    }

    // TODO extend to other types
    // use fast-equals for other objects
    // @ts-ignore
    return deepEqual(a, b)
  }
)

function useDeepCompareMemoize(value: any) {
  const ref = React.useRef()

  if (!deepCompareEqualsForMaps(value, ref.current)) {
    ref.current = value
  }

  return ref.current
}

function useDeepCompareEffectForMaps(
  callback: React.EffectCallback,
  dependencies: any[]
) {
  React.useEffect(callback, dependencies.map(useDeepCompareMemoize))
}

type DrawLayerProps = {
  map: google.maps.Map | undefined
}

export const DrawLayer = ({ map }: DrawLayerProps) => {
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager>()
  const [initialDraw, setInitialDraw] = useState(false)
  const [color, setColor] = useState<string>('#BADA55')

  const [state, send] = useMachine(drawMachine)

  useEffect(() => {
    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYLINE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.BOTTOM_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYLINE],
      },
      polylineOptions: {
        editable: true,
        strokeColor: '#00FFFF',
      },
    })
    if (manager) {
      setDrawingManager(manager)
    }
  }, [])

  useEffect(() => {
    if (drawingManager && !drawingManager.getMap() && map) {
      drawingManager.setMap(map)
      drawingManager.addListener('polylinecomplete', (poly: any) => {
        const path = poly.getPath()

        const pathValues = []
        for (let i = 0; i < path.getLength(); i++) {
          pathValues.push(path.getAt(i).toUrlValue())
        }

        send({ type: 'FINISH_DRAWING', path: pathValues.join('|') })
        poly.setMap(null)
      })
    }
  }, [drawingManager])

  useEffect(() => {
    if (!map) {
      return
    }
    var snappedPolyline = new google.maps.Polyline({
      path: state.context.snappedPath,
      strokeColor: color,
      strokeWeight: 10,
      strokeOpacity: 0.5,
      draggable: true,
      editable: true,
    })

    snappedPolyline.setMap(map)
  }, [state.context.snappedPath])

  useEffect(() => {
    if (!map || !state.context.existingPaths || initialDraw) {
      return
    }
    state.context.existingPaths.forEach((path) => {
      var snappedPolyline = new google.maps.Polyline({
        path: path.map((p: any) => ({
          ...p,
          lat: Number(p.lat),
          lng: Number(p.lng),
        })),
        strokeColor: '#BADA55',
        strokeWeight: 10,
        strokeOpacity: 0.5,
        draggable: true,
        editable: true,
      })
      setInitialDraw(true)
      snappedPolyline.setMap(map)
    })
  }, [state.context.existingPaths])

  return (
    <div className="">
      <div className="absolute right-0 top-0 w-60 py-2 px-4 bg-white">
        <Controls onColorUpdate={(color: string) => setColor(color)} />
      </div>
    </div>
  )
}
