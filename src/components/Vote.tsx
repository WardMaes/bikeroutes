import { ROAD_COLORS } from './MapWrapper'

type VoteProps = {
  lines: google.maps.Polyline[]
  onVote: (line: google.maps.Polyline) => void
}

export const Vote = ({ lines, onVote }: VoteProps) => {
  const vote = (line: google.maps.Polyline) => {
    // TODO: POST data
    onVote(line)
  }

  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        The condition of this route is:
      </h3>
      <div className="flex flex-row justify-between mt-2">
        {lines.map((line, i) => (
          <div key={i} className="mr-4 last:mr-0">
            <button
              onClick={() => vote(line)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap text-md"
            >
              {
                Object.keys(ROAD_COLORS)[
                  //@ts-ignore
                  Object.values(ROAD_COLORS).indexOf(line.strokeColor)
                ]
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
