import { assign, createMachine } from 'xstate'

type DrawContext = {
  drawnPath: any[] // this is what we get from the drawingmanager
  snappedPath: any[]
  existingPaths: any[]
}

type DrawEvents =
  | {
      type: 'SET_DRAWING'
    }
  | { type: 'CANCEL_DRAWING' }
  | { type: 'FINISH_DRAWING'; path: string }

const processDrawing = async (path: string) => {
  // Snap a user-created polyline to roads and return the snapped path
  const res = await fetch('/api/google/roads', {
    method: 'POST',
    body: JSON.stringify({
      path,
    }),
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
    body: JSON.stringify({ snappedCoordinates }),
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
      context: {} as DrawContext,
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
              existingPaths: event.data.map((d: any) => d.latlngString),
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
            return processDrawing(event.path)
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
  },
  {
    services: {},
    actions: {},
  }
)
