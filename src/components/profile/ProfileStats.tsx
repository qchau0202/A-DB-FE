import { Card, CardContent } from "@/components/ui/card"
import { profileStats } from "@/data/profile"

export function ProfileStats() {
  return (
    <Card className="border border-[#2a2a2a] bg-[#1a1a1a] rounded-xl">
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Impact</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Overview of your sessions, shared resources, and peer feedback.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {profileStats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-lg border border-[#2a2a2a] bg-[#252525] px-4 py-3 text-left"
            >
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-sm font-semibold text-gray-400 mt-1">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.helper}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


