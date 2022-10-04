import React, { useState, useEffect, useContext } from 'react'
import ReactDOMServer from 'react-dom/server'
import { useActor } from '@xstate/react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'

import { Controls } from './Controls'
import { GlobalStateContext } from '../pages/_app'
import { RoadCondition } from '../machines/draw'

export const ROAD_COLORS = {
  'very good': '#02FC62',
  good: '#0000FF',
  average: '#555555',
  bad: '#FF0000',
}

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
      {map && <DrawLayer mapProp={map} mapRef={ref} />}
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
  mapProp: google.maps.Map
  mapRef: any
}

export const DrawLayer = ({ mapProp, mapRef }: DrawLayerProps) => {
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager>()

  const globalServices = useContext(GlobalStateContext)
  const [state, send] = useActor(globalServices.drawService)

  function project(latLng: google.maps.LatLng) {
    let siny = Math.sin((latLng.lat() * Math.PI) / 180)

    // Truncating to 0.9999 effectively limits latitude to 89.189. This is
    // about a third of a tile past the edge of the world tile.
    siny = Math.min(Math.max(siny, -0.9999), 0.9999)

    return new google.maps.Point(
      256 * (0.5 + latLng.lng() / 360),
      256 * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
    )
  }

  function createInfoWindowContent(latLng: google.maps.LatLng, zoom: number) {
    const scale = 1 << zoom

    const worldCoordinate = project(latLng)

    const pixelCoordinate = new google.maps.Point(
      Math.floor(worldCoordinate.x * scale),
      Math.floor(worldCoordinate.y * scale)
    )

    const tileCoordinate = new google.maps.Point(
      Math.floor((worldCoordinate.x * scale) / 256),
      Math.floor((worldCoordinate.y * scale) / 256)
    )

    return [
      'LatLng: ' + latLng,
      'Zoom level: ' + zoom,
      'World Coordinate: ' + worldCoordinate,
      'Pixel Coordinate: ' + pixelCoordinate,
      'Tile Coordinate: ' + tileCoordinate,
      // ReactDOMServer.renderToString(<Controls />),
    ].join('<br>')
  }

  const mouseoverListener = (
    e: google.maps.MapMouseEvent,
    polyline: google.maps.Polyline
  ) => {
    const { latLng } = e
    if (!latLng || !state.context.map) {
      return
    }
    if (google.maps.geometry.poly.isLocationOnEdge(latLng, polyline, 10e-1)) {
      console.log(
        globalServices.drawService.getSnapshot().context.existingPaths.length
      )

      // TODO: convert to custom popup
      const coordInfoWindow = new google.maps.InfoWindow()
      coordInfoWindow.setContent(
        createInfoWindowContent(latLng, state.context.map.getZoom()!)
      )
      coordInfoWindow.setPosition(latLng)
      coordInfoWindow.open(state.context.map)
    }
  }

  // Create drawing manager instance
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
    send({ type: 'SET_MAP', map: mapProp })
  }, [])

  useEffect(() => {
    // Draw existing paths
    state.context.existingPaths &&
      state.context.existingPaths.forEach((polyline) => {
        polyline.setMap(state.context.map)

        if (!polyline.get('haslistener')) {
          polyline.set('haslistener', true)
          polyline.addListener('mouseover', (e: google.maps.MapMouseEvent) =>
            mouseoverListener(e, polyline)
          )
        }
      })
  }, [state.context.existingPaths])

  // Add listener to drawingManager
  useEffect(() => {
    if (drawingManager && !drawingManager.getMap() && state.context.map) {
      drawingManager.setMap(state.context.map)
      drawingManager.addListener(
        'polylinecomplete',
        (poly: google.maps.Polyline) => {
          const path = poly.getPath()
          const pathValues = []

          for (let i = 0; i < path.getLength(); i++) {
            pathValues.push(path.getAt(i).toUrlValue())
          }
          send({
            type: 'FINISH_DRAWING',
            path: pathValues.join('|'),
          })

          poly.setMap(null)
        }
      )
    }
  }, [drawingManager])

  // Draw new routes
  useEffect(() => {
    if (!state.context.map) {
      return
    }

    const color = ROAD_COLORS[state.context.roadCondition]
    var snappedPolyline = new google.maps.Polyline({
      path: state.context.snappedPath,
      strokeColor: color,
      strokeWeight: 10,
      strokeOpacity: 0.5,
      draggable: true,
      editable: true,
    })

    snappedPolyline.setMap(state.context.map)
    snappedPolyline.set('haslistener', true)
    snappedPolyline.addListener('mouseover', (e: google.maps.MapMouseEvent) =>
      mouseoverListener(e, snappedPolyline)
    )
  }, [state.context.snappedPath])

  return (
    <div className="">
      <div className="absolute right-0 top-0 w-60 py-2 px-4 bg-white">
        <Controls />
      </div>
      <div className="absolute left-0 top-0 w-60 py-2 px-4 bg-white">
        {JSON.stringify(state.value)}
      </div>
    </div>
  )
}
