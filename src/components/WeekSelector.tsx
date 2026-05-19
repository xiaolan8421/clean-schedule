import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekSelectorProps {
  /** 当前周数 */
  week: number
  /** 周数变化回调 */
  onChange: (week: number) => void
  /** 最大可选周数，默认 20 */
  maxWeek?: number
}

/**
 * 教学周选择器
 * 支持左右箭头切换、直接输入周数和滑块拖动
 */
export function WeekSelector({ week, onChange, maxWeek = 20 }: WeekSelectorProps) {
  const handlePrev = () => {
    if (week > 1) onChange(week - 1)
  }

  const handleNext = () => {
    if (week < maxWeek) onChange(week + 1)
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2 px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handlePrev}
          disabled={week <= 1}
          className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="上一周"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">第</span>
          <input
            type="number"
            min={1}
            max={maxWeek}
            value={week}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (v >= 1 && v <= maxWeek) onChange(v)
            }}
            className="w-14 text-center text-lg font-semibold border border-gray-200 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-sm text-gray-500">周</span>
        </div>

        <button
          onClick={handleNext}
          disabled={week >= maxWeek}
          className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="下一周"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <input
        type="range"
        min={1}
        max={maxWeek}
        value={week}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full max-w-xs h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  )
}
