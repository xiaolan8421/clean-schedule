import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Course } from '../types'
import { shouldShowCourse, isOddWeek, getCurrentDayAndPeriod, getDayName, getPeriodTime, formatWeekLabel } from '../utils/scheduleUtils'
import { getCourseColor, getCourseBorderColor } from '../utils/colorHash'

interface CourseGridProps {
  courses: Course[]
  currentWeek: number
  semesterStartDate: string
  onEditCourse: (course: Course) => void
  onDeleteCourse: (courseId: string) => void
  readOnly?: boolean
}

interface ContextMenuState {
  x: number
  y: number
  course: Course
}

const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1)
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
const WEEKDAY_DAYS = [1, 2, 3, 4, 5]
const SHORT_DAY_NAMES = ['', '一', '二', '三', '四', '五', '六', '日']

export function CourseGrid({
  courses,
  currentWeek,
  semesterStartDate,
  onEditCourse,
  onDeleteCourse,
  readOnly = false,
}: CourseGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [currentHighlight, setCurrentHighlight] = useState<{
    dayOfWeek: number
    period: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showWeekend, setShowWeekend] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTarget = useRef<Course | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const update = () => setCurrentHighlight(getCurrentDayAndPeriod())
    update()
    const interval = setInterval(update, 60000)
    setMounted(true)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    document.addEventListener('scroll', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', handleClick)
    }
  }, [])

  const handleTouchStart = useCallback(
    (course: Course) => {
      if (readOnly) return
      longPressTarget.current = course
      longPressTimer.current = setTimeout(() => {
        setContextMenu({ x: 0, y: 0, course })
        longPressTarget.current = null
      }, 600)
    },
    [readOnly]
  )

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressTarget.current = null
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, course: Course) => {
      if (readOnly) return
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, course })
    },
    [readOnly]
  )

  const weekOdd = isOddWeek(currentWeek)
  const todayDay = new Date().getDay() || 7

  // Mobile: show 5 weekdays by default, 7 on toggle. Desktop: always 7.
  const visibleDays = isMobile ? (showWeekend ? ALL_DAYS : WEEKDAY_DAYS) : ALL_DAYS
  const hasWeekendCourses = courses.some((c) => c.dayOfWeek === 6 || c.dayOfWeek === 7)

  const getStartingCourses = (day: number, period: number): Course[] => {
    return courses.filter(
      (c) =>
        c.dayOfWeek === day &&
        c.startPeriod === period &&
        shouldShowCourse(c.weekType, currentWeek, c.weekStart, c.weekEnd)
    )
  }

  const courseIndex = useRef(0)
  const getCourseIndex = () => courseIndex.current++
  courseIndex.current = 0

  const gridCols = visibleDays.length + 1 // +1 for period label column

  return (
    <div className="relative">
      {/* 周末切换按钮（仅移动端且周末有课时显示） */}
      {isMobile && hasWeekendCourses && (
        <button
          onClick={() => setShowWeekend(!showWeekend)}
          className={`mb-2 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all mx-auto ${
            showWeekend
              ? 'bg-accent-soft text-accent'
              : 'bg-paper-dark text-ink-muted hover:text-ink'
          }`}
        >
          {showWeekend ? '收起周末' : '显示周末'}
          <ChevronDown className={`w-3 h-3 transition-transform ${showWeekend ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* 表格容器 */}
      <div
        className="overflow-x-auto scrollbar-hide custom-scrollbar rounded-2xl border border-ink-light bg-paper-dark/60 shadow-paper"
        id="course-grid"
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `minmax(28px, 48px) repeat(${visibleDays.length}, 1fr)` }}
        >
          {/* ─── 表头行 ─── */}
          <div className="sticky top-0 left-0 z-20 bg-paper-dark border-b border-r border-ink-light px-1 py-2.5 text-center">
            <span className="text-[10px] sm:text-[11px] font-medium text-ink-muted tracking-wide">节</span>
          </div>
          {visibleDays.map((day) => (
            <div
              key={day}
              className={`sticky top-0 z-10 border-b border-ink-light px-0.5 py-2.5 text-center transition-colors ${
                day === todayDay ? 'bg-accent-soft' : 'bg-paper-dark'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-ink">
                {SHORT_DAY_NAMES[day]}
              </span>
              {day === todayDay && isMobile && (
                <span className="block text-[8px] text-accent font-medium leading-none">今</span>
              )}
              {day === todayDay && !isMobile && (
                <span className="block text-[9px] text-accent font-medium mt-0.5">今天</span>
              )}
            </div>
          ))}

          {/* ─── 课程区域 ─── */}
          {PERIODS.map((period) => {
            const time = getPeriodTime(period)
            const timeStr = `${String(time.startHour).padStart(2, '0')}:${String(time.startMin).padStart(2, '0')}`

            return (
              <div key={period} className="contents">
                {/* 节次标签 */}
                <div className="sticky left-0 z-10 bg-paper border-b border-r border-ink-light px-1 py-1.5 text-center">
                  <div className="text-[10px] sm:text-[11px] font-semibold text-ink/70 leading-none">
                    {period}
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-ink-muted/50 leading-none mt-0.5 hidden sm:block">
                    {timeStr}
                  </div>
                </div>

                {/* 每天格子 */}
                {visibleDays.map((day) => {
                  const startingCourses = getStartingCourses(day, period)
                  const isCurrentCell =
                    currentHighlight?.dayOfWeek === day &&
                    currentHighlight?.period === period
                  const isToday = day === todayDay

                  return (
                    <div
                      key={`${day}-${period}`}
                      className={`border-b border-r border-ink-light/50 p-px relative transition-colors ${
                        isToday ? 'bg-paper-dark/40' : ''
                      } ${isCurrentCell ? 'current-period-highlight' : ''}`}
                      style={{ minHeight: isMobile ? '42px' : '60px' }}
                    >
                      {startingCourses.map((course) => {
                        const idx = getCourseIndex()
                        const bg = getCourseColor(course.name)
                        const borderColor = getCourseBorderColor(course.name)
                        const showMultiPeriod = course.startPeriod !== course.endPeriod

                        return (
                          <div
                            key={course.id}
                            className={`rounded-md px-1 sm:px-1.5 py-0.5 sm:py-1 mb-px cursor-pointer select-none
                              shadow-card hover:shadow-card-hover transition-all duration-200
                              hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
                              ${mounted ? 'course-card-enter' : ''}`}
                            style={{
                              backgroundColor: bg,
                              borderLeft: `2px solid ${borderColor}`,
                              animationDelay: `${idx * 20}ms`,
                            }}
                            onContextMenu={(e) => handleContextMenu(e, course)}
                            onTouchStart={() => handleTouchStart(course)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchEnd}
                            onClick={() => {
                              if (!readOnly && longPressTarget.current === null) {
                                onEditCourse(course)
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-0.5">
                              <span className="text-[10px] sm:text-xs font-semibold text-ink/90 truncate leading-tight">
                                {course.name}
                              </span>
                              {showMultiPeriod && (
                                <span className="text-[8px] sm:text-[9px] text-ink-muted/50 flex-shrink-0 tabular-nums hidden sm:inline">
                                  {course.startPeriod}-{course.endPeriod}
                                </span>
                              )}
                            </div>
                            {(course.location || course.teacher) && (
                              <div className="text-[8px] sm:text-[10px] text-ink-muted/70 leading-tight truncate mt-px">
                                {[course.location, course.teacher].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {course.weekType !== 'all' && (
                              <span className="inline-block text-[7px] sm:text-[8px] mt-0.5 px-1 py-px rounded-full bg-white/60 text-ink-muted/70 font-medium">
                                {formatWeekLabel(course.weekType, course.weekStart, course.weekEnd)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-3 flex items-center gap-5 text-xs text-ink-muted/70 px-1">
        <span>
          第 <strong className="text-ink/80 font-semibold">{currentWeek}</strong> 周
          <span className="mx-1.5 text-ink-light">·</span>
          <span className="text-ink-muted/60">{weekOdd ? '奇数周' : '偶数周'}</span>
        </span>
        {todayDay <= 7 && (
          <span className="hidden sm:inline text-ink-muted/50">
            今天 <strong className="text-ink/70">{getDayName(todayDay)}</strong>
          </span>
        )}
      </div>

      {/* 右键 / 长按菜单 */}
      {contextMenu && !readOnly && (
        <div
          className="fixed z-50 bg-paper border border-ink-light rounded-xl shadow-paper-lg py-1.5 min-w-[130px] overflow-hidden"
          style={{
            left: contextMenu.x > window.innerWidth - 150 ? contextMenu.x - 140 : contextMenu.x,
            top: contextMenu.y > window.innerHeight - 110 ? contextMenu.y - 90 : contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              onEditCourse(contextMenu.course)
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-accent-soft transition-colors"
          >
            编辑课程
          </button>
          <button
            onClick={() => {
              if (confirm('确定删除此课程？')) {
                onDeleteCourse(contextMenu.course.id)
              }
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-red-500/90 hover:bg-red-50 transition-colors"
          >
            删除课程
          </button>
        </div>
      )}
    </div>
  )
}
