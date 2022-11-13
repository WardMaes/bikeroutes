import { assign, createMachine, InterpreterFrom, send, spawn } from 'xstate'

type ToggleContext = {}

type ToggleEvents =
  | {
      type: 'OPEN'
    }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }

export const toggleMachine = createMachine<ToggleContext, ToggleEvents>({
  id: 'toggle',
  predictableActionArguments: true,
  schema: {
    context: {} as ToggleContext,
    events: {} as ToggleEvents,
  },
  initial: 'closed',
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'opened',
        },
        TOGGLE: {
          target: 'opened',
        },
      },
    },
    opened: {
      on: {
        CLOSE: {
          target: 'closed',
        },
        TOGGLE: {
          target: 'closed',
        },
      },
    },
  },
})

type MultiToggleContext = {
  typeToggle: InterpreterFrom<typeof toggleMachine>
  surfaceToggle: InterpreterFrom<typeof toggleMachine>
  conditionToggle: InterpreterFrom<typeof toggleMachine>
}

type MultiToggleEvents =
  | {
      type: 'TYPE.OPEN'
    }
  | {
      type: 'SURFACE.OPEN'
    }
  | {
      type: 'CONDITION.OPEN'
    }

export const multiToggleMachine = createMachine<
  MultiToggleContext,
  MultiToggleEvents
>({
  id: 'multitoggle',
  predictableActionArguments: true,
  schema: {
    context: {} as MultiToggleContext,
    events: {} as MultiToggleEvents,
  },
  initial: 'initial',
  states: {
    initial: {
      entry: assign({
        typeToggle: () => spawn(toggleMachine),
        surfaceToggle: () => spawn(toggleMachine),
        conditionToggle: () => spawn(toggleMachine),
      }),
      on: {
        'TYPE.OPEN': {
          actions: [
            send({ type: 'CLOSE' }, { to: (context) => context.surfaceToggle }),
            send(
              { type: 'CLOSE' },
              { to: (context) => context.conditionToggle }
            ),
            send({ type: 'OPEN' }, { to: (context) => context.typeToggle }),
          ],
        },
        'SURFACE.OPEN': {
          actions: [
            send({ type: 'CLOSE' }, { to: (context) => context.typeToggle }),
            send(
              { type: 'CLOSE' },
              { to: (context) => context.conditionToggle }
            ),
            send({ type: 'OPEN' }, { to: (context) => context.surfaceToggle }),
          ],
        },
        'CONDITION.OPEN': {
          actions: [
            send({ type: 'CLOSE' }, { to: (context) => context.typeToggle }),
            send({ type: 'CLOSE' }, { to: (context) => context.surfaceToggle }),
            send(
              { type: 'OPEN' },
              { to: (context) => context.conditionToggle }
            ),
          ],
        },
      },
    },
  },
})
