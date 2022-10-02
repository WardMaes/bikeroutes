import { useContext, useEffect, useState } from 'react'
import { useActor } from '@xstate/react'

import { RoadCondition, RoadSurface, RoadType } from '../machines/draw'
import { GlobalStateContext } from '../pages/_app'

type PickerType = {
  title: string
  options: string[]
  onChange: (value: string) => void
}

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never

const Picker = ({ title, options, onChange }: PickerType) => {
  const [value, setValue] = useState<ArrayElement<typeof options>>(
    options[0] || ''
  )

  useEffect(() => {
    if (options[0]) {
      onChange(options[0])
    }
  }, [])

  return (
    <div className="flex flex-col">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div>
        {options.map((option, i) => (
          <div key={i}>
            <input
              className="appearance-none rounded-full h-4 w-4 border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer"
              type="radio"
              id={option}
              checked={value === option}
              onChange={() => {
                setValue(option)
                onChange(option)
              }}
            />
            <label
              className="form-check-label inline-block text-gray-800 cursor-pointer"
              htmlFor={option}
            >
              {option}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Controls = () => {
  const globalServices = useContext(GlobalStateContext)
  const [state, send] = useActor(globalServices.drawService)

  const typeOptions: RoadType[] = ['fietsstrook', 'none']
  const surfaceOptions: RoadSurface[] = ['asphalt', 'concrete', 'offroad']
  const conditionOptions: RoadCondition[] = [
    'very good',
    'good',
    'average',
    'bad',
  ]

  // TODO: fix casts for variable 'value'

  return (
    <div className="flex flex-col">
      <Picker
        title={'Type'}
        options={typeOptions}
        onChange={(value) => {
          send({ type: 'SET_ROADTYPE', roadType: value as RoadType })
        }}
      />

      <Divider />

      <Picker
        title={'Surface'}
        options={surfaceOptions}
        onChange={(value) => {
          send({ type: 'SET_ROADSURFACE', roadSurface: value as RoadSurface })
        }}
      />

      <Divider />

      <Picker
        title={'Condition'}
        options={conditionOptions}
        onChange={(value) => {
          send({
            type: 'SET_ROADCONDITION',
            roadCondition: value as RoadCondition,
          })
        }}
      />
    </div>
  )
}

const Divider = () => {
  return <div className="my-4 h-[1px] border border-gray-200 w-full"></div>
}
