import { assign, createMachine } from 'xstate'

export enum RoadType {
  fietsstrook = 'fietsstrook',
  none = 'none',
}

export enum RoadSurface {
  asphalt = 'asphalt',
  concrete = 'concrete',
  offroad = 'offroad',
}

export enum RoadCondition {
  'very good' = 'very good',
  good = 'good',
  average = 'average',
  bad = 'bad',
}

export type RoadSelectorContext = {
  roadType: RoadType
  roadSurface: RoadSurface
  roadCondition: RoadCondition
}

export type RoadSelectorEvents =
  | {
      type: 'SET_ROADTYPE'
      roadType: RoadType
    }
  | { type: 'SET_ROADSURFACE'; roadSurface: RoadSurface }
  | { type: 'SET_ROADCONDITION'; roadCondition: RoadCondition }

export const roadSelectorMachine = createMachine<
  RoadSelectorContext,
  RoadSelectorEvents
>(
  {
    id: 'roadSelector',
    predictableActionArguments: true,
    schema: {
      context: {
        roadType: RoadType.fietsstrook,
        roadSurface: RoadSurface.asphalt,
        roadCondition: RoadCondition['very good'],
      } as RoadSelectorContext,
      events: {} as RoadSelectorEvents,
    },
    initial: 'selected',
    states: {
      selected: {
        on: {
          SET_ROADTYPE: {
            actions: [
              assign({
                roadType: (_, event) => event.roadType,
              }),
            ],
          },
          SET_ROADSURFACE: {
            actions: [
              assign({
                roadSurface: (_, event) => event.roadSurface,
              }),
            ],
          },
          SET_ROADCONDITION: {
            actions: [
              assign({
                roadCondition: (_, event) => event.roadCondition,
              }),
            ],
          },
        },
      },
    },
  },
  {
    services: {},
    actions: {},
  }
)
