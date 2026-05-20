import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekSelectorProps {
  week: number
  onChange: (week: number) => void
  maxWeek?: number
}

export function WeekSelector({ week, onChange, maxWeek = 20 }: WeekSelectorProps) {
  const handlePrev = () => {
    if (week > 1) onChange(week - 1)
  }

  const handleNext = () => {
    if (week < maxWeek) onChange(week + 1)
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2.5 px-4">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          disabled={week <= 1}
          className="p-1.5 rounded-full hover:bg-ink-light/40 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="上一周"
        >
          <ChevronLeft className="w-5 h-5 text-ink/60" />
        </button>

        <div className="flex items-center gap-1">
          <span className="text-[13px] text-ink-muted font-medium">第</span>
          <input
            type="number"
            min={1}
            max={maxWeek}
            value={week}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (v >= 1 && v <= maxWeek) onChange(v)
            }}
            className="w-12 text-center text-lg font-bold border border-ink-light/60 rounded-lg py-1 bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 transition-shadow text-ink"
          />
          <span className="text-[13px] text-ink-muted font-medium">周</span>
        </div>

        <button
          onClick={handleNext}
          disabled={week >= maxWeek}
          className="p-1.5 rounded-full hover:bg-ink-light/40 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          aria-label="下一周"
        >
          <ChevronRight className="w-5 h-5 text-ink/60" />
        </button>
      </div>

      <input
        type="range"
        min={1}
        max={maxWeek}
        value={week}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="week-slider w-full max-w-xs"
      />
    </div>
  )
}
