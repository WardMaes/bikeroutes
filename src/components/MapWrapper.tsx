import React, { useState, useEffect, useContext, useRef } from 'react'
import { useActor } from '@xstate/react'
import { Wrapper, Status } from '@googlemaps/react-wrapper'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { createCustomEqual } from 'fast-equals'

import { GlobalStateContext } from '../pages/_app'
import { Vote } from './Vote'

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
      setMap(
        new window.google.maps.Map(ref.current, {
          mapId: process.env.NEXT_PUBLIC_GMAPS_MAP_ID,
        })
      )
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
  const [showPopup, setShowpopup] = useState(false)

  const globalServices = useContext(GlobalStateContext)
  const [state, send] = useActor(globalServices.drawService)

  const [overlappingLines, setOverlappingLines] = useState<
    google.maps.Polyline[]
  >([])

  const voteRef = useRef(null)

  class Popup extends google.maps.OverlayView {
    position: google.maps.LatLng
    containerDiv: HTMLDivElement

    constructor(position: google.maps.LatLng, content: HTMLElement) {
      super()
      this.position = position

      content.classList.add('popup-bubble')

      // This zero-height div is positioned at the bottom of the bubble.
      const bubbleAnchor = document.createElement('div')

      bubbleAnchor.classList.add('popup-bubble-anchor')
      bubbleAnchor.appendChild(content)

      // This zero-height div is positioned at the bottom of the tip.
      this.containerDiv = document.createElement('div')
      this.containerDiv.classList.add('popup-container')
      this.containerDiv.classList.add('absolute')
      this.containerDiv.appendChild(bubbleAnchor)

      // Optionally stop clicks, etc., from bubbling up to the map.
      Popup.preventMapHitsAndGesturesFrom(this.containerDiv)
    }

    /** Called when the popup is added to the map. */
    onAdd() {
      this.getPanes()!.floatPane.appendChild(this.containerDiv)
    }

    /** Called when the popup is removed from the map. */
    onRemove() {
      if (this.containerDiv.parentElement) {
        this.containerDiv.parentElement.removeChild(this.containerDiv)
      }
    }

    /** Called each frame when the popup needs to draw itself. */
    draw() {
      const divPosition = this.getProjection().fromLatLngToDivPixel(
        this.position
      )!

      // Hide the popup when it is far out of view.
      const display =
        Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000
          ? 'block'
          : 'none'

      if (display === 'block') {
        this.containerDiv.style.left = divPosition.x + 'px'
        this.containerDiv.style.top = divPosition.y + 'px'
      }

      if (this.containerDiv.style.display !== display) {
        this.containerDiv.style.display = display
      }
    }
  }

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

  const mouseoverListener = (
    e: google.maps.MapMouseEvent,
    polyline: google.maps.Polyline
  ) => {
    const { latLng } = e
    if (!latLng || !state.context.map) {
      return
    }
    if (google.maps.geometry.poly.isLocationOnEdge(latLng, polyline, 10e-1)) {
      const paths =
        globalServices.drawService.getSnapshot().context.existingPaths

      const lines = paths.filter((p) =>
        google.maps.geometry.poly.isLocationOnEdge(latLng, p)
      )
      setOverlappingLines(lines)
      const popup = new Popup(latLng, voteRef?.current!)

      if (lines.length > 1) {
        popup.setMap(mapProp)
        setShowpopup(true)
      } else {
        popup.setMap(null)
        setShowpopup(false)
      }
    }
  }

  // Create drawing manager instance
  useEffect(() => {
    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYLINE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
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
      <div
        ref={voteRef}
        className={`px-4 py-3 absolute bg-white shadow-md rounded ${
          showPopup ? '' : 'hidden'
        }`}
      >
        <Vote
          lines={overlappingLines}
          onVote={(line) => {
            // TODO: vote?
            setShowpopup(false)
          }}
        />
      </div>
    </div>
  )
}
