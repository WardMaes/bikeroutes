import { createMachine } from 'xstate'

type TutorialContext = {}

type TutorialEvent = { type: 'NEXT' } | { type: 'PREVIOUS' } | { type: 'SKIP' }

export const tutorialMachine = createMachine<TutorialContext, TutorialEvent>({
  id: 'draw',
  predictableActionArguments: true,
  schema: {
    context: {} as TutorialContext,
    events: {} as TutorialEvent,
    services: {} as {
      processDrawing: {
        data: []
      }
    },
  },
  initial: 'welcome',
  states: {
    welcome: {
      on: {
        NEXT: {
          target: 'what',
        },
      },
    },
    what: {
      on: {
        NEXT: {
          target: 'ui',
        },
        PREVIOUS: {
          target: 'welcome',
        },
      },
    },
    ui: {
      on: {
        NEXT: {
          target: 'drawing',
        },
        PREVIOUS: {
          target: 'what',
        },
      },
    },
    drawing: {
      on: {
        NEXT: {
          target: 'rating',
        },
        PREVIOUS: {
          target: 'ui',
        },
      },
    },
    rating: {
      on: {
        NEXT: {
          target: 'done',
        },
        PREVIOUS: {
          target: 'drawing',
        },
      },
    },
    done: {
      type: 'final',
    },
  },
  on: {
    SKIP: {
      target: 'done',
    },
  },
})
