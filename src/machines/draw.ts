import { assign, createMachine } from 'xstate'

export type RoadType = 'fietsstrook' | 'none'

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
  existingPaths: any[]
  roadCondition: RoadCondition
  roadSurface: RoadSurface
  roadType: RoadType
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

const processDrawing = async (
  path: string,
  roadCondition: RoadCondition,
  roadSurface: RoadSurface,
  roadType: RoadType
) => {
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
  return data
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
        roadType: 'fietsstrook',
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
        on: {
          SET_DRAWING: {
            target: 'drawing',
          },
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
            return processDrawing(
              event.path,
              context.roadCondition,
              context.roadSurface,
              context.roadType
            )
          },
          onDone: {
            target: 'drawing',
            actions: assign((context, event) => ({
              snappedPath: event.data,
              existingPaths: [...(context.existingPaths || []), event.data],
            })),
          },
          onError: {
            target: 'error',
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
