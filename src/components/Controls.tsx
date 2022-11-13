import { useContext, useEffect, useState } from 'react'
import { useActor, useMachine } from '@xstate/react'

import { RoadCondition, RoadSurface, RoadType } from '../machines/draw'
import { GlobalStateContext } from '../pages/_app'
import { multiToggleMachine, toggleMachine } from '../machines/toggle'

type PickerType = {
  options: PickerOption<RoadType | RoadSurface | RoadCondition>[]
  onChange: (
    option: PickerOption<RoadType | RoadSurface | RoadCondition>
  ) => void
  defaultValue?: PickerOption<RoadType | RoadSurface | RoadCondition>
}

type PickerOption<T extends RoadType | RoadSurface | RoadCondition> = {
  label: T // TODO: get enum values
  image?: string
}

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never

const Picker = ({ options, onChange, defaultValue }: PickerType) => {
  const [value, setValue] = useState<ArrayElement<typeof options>>(
    defaultValue || options[0]!
  )

  const hasImages = options.every((option) => option.image)

  useEffect(() => {
    // Set correct value on (re-)render
    const v = defaultValue || options[0]
    if (v) {
      onChange(v)
    }
  }, [])

  return (
    <>
      <div className={`flex flex-wrap justify-center overflow-scroll ${hasImages ? 'flex-row' : 'flex-col'} `}>
        {options.map((option, i) => (
          <div className={`m-2`} key={i}>
            <label className="cursor-pointer" htmlFor={option.label}>
              {option.image ? (
                <img src={option.image} className="w-40 h-40 max-w-none" />
              ) : (
                <></>
              )}
            </label>
            <input
              className="appearance-none rounded-full h-4 w-4 border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer"
              type="radio"
              id={option.label}
              checked={value.label === option.label}
              onChange={() => {
                setValue(option)
                onChange(option)
              }}
            />
            <label
              className="form-check-label inline-block text-gray-800 cursor-pointer capitalize"
              htmlFor={option.label}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </>
  )
}

export const Controls = () => {
  const globalServices = useContext(GlobalStateContext)
  const [drawState, send] = useActor(globalServices.drawService)
  const [tutorialState] = useActor(globalServices.tutorialService)

  const [toggleState, sendToToggle] = useMachine(multiToggleMachine)
  const [typeToggleState] = useActor(toggleState.context.typeToggle)
  const [surfaceToggleState] = useActor(toggleState.context.surfaceToggle)
  const [conditionToggleState] = useActor(toggleState.context.conditionToggle)

  const [showState, sendToShow] = useMachine(toggleMachine)

  const typeOptions: PickerOption<RoadType>[] = [
    { label: 'separated', image: 'fietspad.webp' },
    { label: 'combined', image: 'fietsstrook.jpeg' },
    { label: 'none', image: 'straat.jpg' },
  ]
  const surfaceOptions: PickerOption<RoadSurface>[] = [
    { label: 'asphalt', image: 'asphalt.jpg' },
    { label: 'concrete', image: 'concrete.jpg' },
    { label: 'offroad', image: 'offroad.jpg' },
  ]
  const conditionOptions: PickerOption<RoadCondition>[] = [
    { label: 'very good' },
    { label: 'good' },
    { label: 'average' },
    { label: 'bad' },
  ]

  useEffect(() => {
    sendToToggle('TYPE.OPEN')
  }, [])

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 w-full pt-2 pb-2 px-4 bg-white drop-shadow-2xl overflow-auto transition-all ${
        tutorialState.matches('ui') ? 'border border-red-600' : ''
      } ${showState.matches('opened') ? 'h-80' : 'h-10'}`}
    >
      <div className="relative flex flex-col items-center">
        <div className="flex flex-row justify-center">
          <button className="px-4" onClick={() => sendToShow('TOGGLE')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`w-6 h-6 transition-transform transform ${
                showState.value === 'opened' ? '' : 'rotate-180'
              } stroke-slate-600 hover:stroke-black active:hover:stroke-black`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 pb-2 w-full flex flex-row justify-evenly max-w-md lg:max-w-lg ">
          <button
            className={`w-full border-b-2 mr-2 text-lg font-medium uppercase active:border-blue-500 hover:border-blue-300 ${
              toggleState.context.typeToggle.getSnapshot().value === 'opened'
                ? 'border-blue-500'
                : ''
            }`}
            onClick={() => sendToToggle('TYPE.OPEN')}
          >
            type
          </button>
          <button
            className={`w-full border-b-2 mr-2 text-lg font-medium uppercase active:border-blue-500 hover:border-blue-300 ${
              toggleState.context.surfaceToggle.getSnapshot().value === 'opened'
                ? 'border-blue-500'
                : ''
            }`}
            onClick={() => sendToToggle('SURFACE.OPEN')}
          >
            surface
          </button>
          <button
            className={`w-full border-b-2 mr-2 text-lg font-medium uppercase active:border-blue-500 hover:border-blue-300 ${
              toggleState.context.conditionToggle.getSnapshot().value ===
              'opened'
                ? 'border-blue-500'
                : ''
            }`}
            onClick={() => sendToToggle('CONDITION.OPEN')}
          >
            condition
          </button>
        </div>
        <>
          {typeToggleState.value === 'opened' ? (
            <Picker
              options={typeOptions}
              onChange={(value) => {
                send({
                  type: 'SET_ROADTYPE',
                  roadType: value.label as RoadType,
                })
              }}
              defaultValue={typeOptions.find(
                (o) => o.label === drawState.context.roadType
              )}
            />
          ) : (
            <></>
          )}

          {surfaceToggleState.value === 'opened' ? (
            <Picker
              options={surfaceOptions}
              onChange={(value) => {
                send({
                  type: 'SET_ROADSURFACE',
                  roadSurface: value.label as RoadSurface,
                })
              }}
              defaultValue={surfaceOptions.find(
                (o) => o.label === drawState.context.roadSurface
              )}
            />
          ) : (
            <></>
          )}

          {conditionToggleState.value === 'opened' ? (
            <Picker
              options={conditionOptions}
              onChange={(value) => {
                send({
                  type: 'SET_ROADCONDITION',
                  roadCondition: value.label as RoadCondition,
                })
              }}
              defaultValue={conditionOptions.find(
                (o) => o.label === drawState.context.roadCondition
              )}
            />
          ) : (
            <></>
          )}
        </>
      </div>
    </div>
  )
}
