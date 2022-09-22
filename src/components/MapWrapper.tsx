import React, { useState, useEffect } from 'react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'

import { Controls } from './Controls'
import { useMachine } from '@xstate/react'

import { createCustomEqual } from 'fast-equals'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { drawMachine } from '../machines/draw'

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
      <div className="absolute right-0 top-0 w-60 py-2 px-4 bg-white">
        <Controls />
      </div>
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
      send('SET_DRAWING')
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
      strokeColor: '#BADA55',
      strokeWeight: 10,
      strokeOpacity: 0.5,
      draggable: true,
      editable: true,
    })

    snappedPolyline.setMap(map)
  }, [state.context.snappedPath])

  // Add heatmap data
  // useEffect(() => {
  //   const mockData = [
  //     {
  //       location: {
  //         latitude: 51.09470285365336,
  //         longitude: 3.756872274385499,
  //       },
  //       originalIndex: 0,
  //       placeId: 'ChIJQWXZZTd3w0cRjTfhgw2sy2g',
  //     },
  //     {
  //       location: {
  //         latitude: 51.0947695,
  //         longitude: 3.7570693000000004,
  //       },
  //       placeId: 'ChIJQWXZZTd3w0cRjTfhgw2sy2g',
  //     },
  //     {
  //       location: {
  //         latitude: 51.0947695,
  //         longitude: 3.7570693000000004,
  //       },
  //       placeId: 'ChIJtxQA1zl3w0cRhGuA65owvSU',
  //     },
  //     {
  //       location: {
  //         latitude: 51.094856,
  //         longitude: 3.7572848999999997,
  //       },
  //       placeId: 'ChIJtxQA1zl3w0cRhGuA65owvSU',
  //     },
  //     {
  //       location: {
  //         latitude: 51.0949453,
  //         longitude: 3.7574714,
  //       },
  //       placeId: 'ChIJtxQA1zl3w0cRhGuA65owvSU',
  //     },
  //     {
  //       location: {
  //         latitude: 51.095283699999996,
  //         longitude: 3.7581281,
  //       },
  //       placeId: 'ChIJtxQA1zl3w0cRhGuA65owvSU',
  //     },
  //     {
  //       location: {
  //         latitude: 51.0955328,
  //         longitude: 3.758667300000001,
  //       },
  //       placeId: 'ChIJtxQA1zl3w0cRhGuA65owvSU',
  //     },
  //     {
  //       location: {
  //         latitude: 51.0955328,
  //         longitude: 3.758667300000001,
  //       },
  //       placeId: 'ChIJ_51xzDl3w0cR5TbZIUiaHpQ',
  //     },
  //     {
  //       location: {
  //         latitude: 51.09552643777874,
  //         longitude: 3.7586761537607134,
  //       },
  //       originalIndex: 1,
  //       placeId: 'ChIJ_51xzDl3w0cR5TbZIUiaHpQ',
  //     },
  //     {
  //       location: {
  //         latitude: 51.095317679619995,
  //         longitude: 3.7589666628180356,
  //       },
  //       originalIndex: 2,
  //       placeId: 'ChIJ_51xzDl3w0cR5TbZIUiaHpQ',
  //     },
  //   ]

  //   const heatmapData = mockData.map(
  //     (point) =>
  //       new google.maps.LatLng(
  //         point.location.latitude,
  //         point.location.longitude
  //       )
  //   )

  //   const heatmap = new google.maps.visualization.HeatmapLayer({
  //     data: heatmapData,
  //     dissipating: false,
  //     map: map,
  //   })
  // }, [map])

  return <></>
}
