import React, { useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { createCustomEqual } from 'fast-equals'
import { isLatLngLiteral } from '@googlemaps/typescript-guards'
import { drawMachine } from '../machines/draw'

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
          return React.cloneElement(child, { map })
        }
      })}
    </>
  )
}

const deepCompareEqualsForMaps = createCustomEqual(
  //@ts-ignore
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
    //@ts-ignore
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

  const [polylines, setPolylines] = useState([])

  const [state, send] = useMachine(drawMachine)

  // // Snap a user-created polyline to roads and draw the snapped path
  // function runSnapToRoad(path) {
  //   var pathValues = []
  //   for (var i = 0; i < path.getLength(); i++) {
  //     pathValues.push(path.getAt(i).toUrlValue())
  //   }

  //   $.get(
  //     'https://roads.googleapis.com/v1/snapToRoads',
  //     {
  //       interpolate: true,
  //       key: apiKey,
  //       path: pathValues.join('|'),
  //     },
  //     function (data) {
  //       processSnapToRoadResponse(data)
  //       drawSnappedPolyline()
  //     }
  //   )
  // }

  // // Store snapped polyline returned by the snap-to-road service.
  // function processSnapToRoadResponse(data) {
  //   snappedCoordinates = []
  //   placeIdArray = []
  //   for (var i = 0; i < data.snappedPoints.length; i++) {
  //     var latlng = new google.maps.LatLng(
  //       data.snappedPoints[i].location.latitude,
  //       data.snappedPoints[i].location.longitude
  //     )
  //     snappedCoordinates.push(latlng)
  //     placeIdArray.push(data.snappedPoints[i].placeId)
  //   }
  // }

  // // Draws the snapped polyline (after processing snap-to-road response).
  // function drawSnappedPolyline() {
  //   var snappedPolyline = new google.maps.Polyline({
  //     path: snappedCoordinates,
  //     strokeColor: '#add8e6',
  //     strokeWeight: 4,
  //     strokeOpacity: 0.9,
  //   })

  //   snappedPolyline.setMap(map)
  //   polylines.push(snappedPolyline)
  // }

  useEffect(() => {
    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYLINE,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.BOTTOM_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYLINE],
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
      drawingManager.addListener('polylinecomplete', (poly) => {
        const path = poly.getPath()
        polylines.push(poly)
        console.log(polylines)
        console.log(path)
        console.log('pathgetlength', path.getLength())
        // runSnapToRoad(path)

        const pathValues = []
        for (let i = 0; i < path.getLength(); i++) {
          pathValues.push(path.getAt(i).toUrlValue())
        }

        send({ type: 'FINISH_DRAWING', path: pathValues.join('|') })
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
      strokeWeight: 4,
      strokeOpacity: 0.9,
    })

    snappedPolyline.setMap(map)
  }, [state.context.snappedPath])

  return <></>
}

export default Map
