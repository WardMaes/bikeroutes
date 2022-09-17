import { assign, createMachine } from 'xstate'

type DrawContext = {
  drawnPath: any[] // this is what we get from the drawingmanager
  snappedPath: any[]
}

type DrawEvents =
  | {
      type: 'SET_DRAWING'
    }
  | { type: 'CANCEL_DRAWING' }
  | { type: 'FINISH_DRAWING'; path: string }
  | { type: '' }
  | { type: '' }

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
  for (var i = 0; i < data.snappedPoints.length; i++) {
    var latlng = new google.maps.LatLng(
      data.snappedPoints[i].location.latitude,
      data.snappedPoints[i].location.longitude
    )
    snappedCoordinates.push(latlng)
  }

  return snappedCoordinates
}

export const drawMachine = createMachine(
  {
    id: 'draw',
    tsTypes: {} as import('./draw.typegen').Typegen0,
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
        entry: assign(() => ({
          drawnPath: [],
        })),
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
          src: (_, event) => processDrawing(event.path),
          onDone: {
            target: 'idle',
            actions: assign((_, event) => ({
              snappedPath: event.data,
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
