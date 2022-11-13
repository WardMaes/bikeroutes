import { assign, createMachine } from 'xstate'
import { ROAD_COLORS } from '../components/MapWrapper'

export type RoadType = 'separated' | 'combined' | 'none'

export type RoadSurface = 'asphalt' | 'concrete' | 'offroad'

export type RoadCondition = 'very good' | 'good' | 'average' | 'bad'

export type RoadSelectorContext = {
  roadType: RoadType
  roadSurface: RoadSurface
  roadCondition: RoadCondition
}

type DrawContext = {
  drawnPath: any[] // this is what we get from the drawingmanager
  snappedPath: any[]
  existingPaths: google.maps.Polyline[]
  roadCondition: RoadCondition
  roadSurface: RoadSurface
  roadType: RoadType
  map: google.maps.Map | null
  error: any
}

type DrawEvents =
  | {
      type: 'SET_DRAWING'
    }
  | { type: 'CANCEL_DRAWING' }
  | {
      type: 'FINISH_DRAWING'
      path: string
    }
  | {
      type: 'SET_ROADCONDITION'
      roadCondition: RoadCondition
    }
  | {
      type: 'SET_ROADSURFACE'
      roadSurface: RoadSurface
    }
  | {
      type: 'SET_ROADTYPE'
      roadType: RoadType
    }
  | {
      type: 'SET_MAP'
      map: google.maps.Map
    }

const processDrawing = async (context: DrawContext, path: string) => {
  // Snap a user-created polyline to roads and return the snapped path
  const res = await fetch('/api/google/roads', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
  const data = await res.json()
  const snappedCoordinates = []

  for (let i = 0; i < data.snappedPoints.length; i++) {
    const latlng = new google.maps.LatLng(
      data.snappedPoints[i].location.latitude,
      data.snappedPoints[i].location.longitude
    )
    snappedCoordinates.push({ lat: latlng.lat(), lng: latlng.lng() })
  }
  const { roadCondition, roadSurface, roadType } = context
  await fetch('/api/routes', {
    method: 'PUT',
    body: JSON.stringify({
      snappedCoordinates,
      roadCondition,
      roadSurface,
      roadType,
    }),
  })

  return snappedCoordinates
}

const fetchRoutes = async () => {
  const res = await fetch('/api/routes')
  const data = await res.json()

  try {
    // Convert API data to google.maps.Polyline
    const polylines: google.maps.Polyline[] = data.map((path: any) => {
      return new google.maps.Polyline({
        path: path.latlngString.map((p: any) => ({
          ...p,
          lat: Number(p.lat),
          lng: Number(p.lng),
        })),
        strokeColor: ROAD_COLORS[path.condition as RoadCondition],
        strokeWeight: 10,
        strokeOpacity: 0.5,
        draggable: true,
        editable: true,
      })
    })

    return polylines
  } catch (e) {
    console.log('ERROR', e)
  }
}

export const drawMachine = createMachine<DrawContext, DrawEvents>(
  {
    id: 'draw',
    predictableActionArguments: true,
    schema: {
      context: {
        drawnPath: [], // this is what we get from the drawingmanager
        snappedPath: [],
        existingPaths: [],
        roadCondition: 'average',
        roadSurface: 'asphalt',
        roadType: 'combined',
        map: null,
        error: null,
      } as DrawContext,
      events: {} as DrawEvents,
      services: {} as {
        processDrawing: {
          data: []
        }
      },
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          SET_MAP: {
            actions: assign((_, event) => ({
              map: event.map,
            })),
            target: 'fetching',
          },
        },
      },
      fetching: {
        invoke: {
          src: async () => {
            const routes = await fetchRoutes()
            return routes
          },
          onDone: {
            target: 'drawing',
            actions: assign((_, event) => ({
              existingPaths: event.data,
            })),
          },
          onError: { target: 'error' },
        },
      },
      drawing: {
        on: {
          CANCEL_DRAWING: {
            target: 'idle',
          },
          FINISH_DRAWING: {
            target: 'processing',
          },
        },
      },
      processing: {
        invoke: {
          src: (context, event) => {
            if (event.type !== 'FINISH_DRAWING') {
              return Promise.resolve(context.snappedPath)
            }
            return processDrawing(context, event.path)
          },
          onDone: {
            target: 'drawing',
            actions: assign((context, event) => ({
              snappedPath: event.data,
              existingPaths: [
                ...(context.existingPaths || []),
                new google.maps.Polyline({
                  path: event.data.map((p: any) => ({
                    ...p,
                    lat: Number(p.lat),
                    lng: Number(p.lng),
                  })),
                }),
              ],
            })),
          },
          onError: {
            target: 'error',
            actions: assign((context, event) => ({
              error: event.data,
            })),
          },
        },
      },
      error: {},
    },
    on: {
      SET_ROADCONDITION: {
        actions: assign((_, event) => ({
          roadCondition: event.roadCondition,
        })),
      },
      SET_ROADSURFACE: {
        actions: assign((_, event) => ({
          roadSurface: event.roadSurface,
        })),
      },
      SET_ROADTYPE: {
        actions: assign((_, event) => ({
          roadType: event.roadType,
        })),
      },
    },
  },
  {
    services: {},
    actions: {},
  }
)
