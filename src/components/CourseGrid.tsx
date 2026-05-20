import { useState, useEffect, useRef, useCallback } from 'react'
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

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]
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

  /** 某天某节是否有在此开始的课程 */
  const coursesStartingAt = (day: number, period: number): Course[] => {
    return courses.filter(
      (c) =>
        c.dayOfWeek === day &&
        c.startPeriod === period &&
        shouldShowCourse(c.weekType, currentWeek, c.weekStart, c.weekEnd)
    )
  }

  /** 某天某节是否被更早开始的跨节课程覆盖 */
  const isCovered = (day: number, period: number): boolean => {
    return courses.some(
      (c) =>
        c.dayOfWeek === day &&
        c.startPeriod < period &&
        c.endPeriod >= period &&
        shouldShowCourse(c.weekType, currentWeek, c.weekStart, c.weekEnd)
    )
  }

  /** 当前时间是否落在某个格子里的课程范围内 */
  const isCurrentInCell = (day: number, period: number): boolean => {
    if (!currentHighlight || currentHighlight.dayOfWeek !== day) return false
    // 直接命中且未被覆盖
    if (currentHighlight.period === period && !isCovered(day, period)) return true
    // 当前节次落在某个从此格开始的课程跨度内
    const starting = coursesStartingAt(day, period)
    return starting.some(
      (c) =>
        c.startPeriod <= currentHighlight.period &&
        c.endPeriod >= currentHighlight.period
    )
  }

  const courseIndex = useRef(0)
  const getCourseIndex = () => courseIndex.current++
  courseIndex.current = 0

  return (
    <div className="relative">
      {/* 表格容器 */}
      <div
        className="overflow-x-auto scrollbar-hide custom-scrollbar rounded-2xl border border-ink-light bg-paper-dark/60 shadow-paper"
        id="course-grid"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: isMobile
              ? `24px repeat(7, 1fr)`
              : `minmax(36px, 48px) repeat(7, 1fr)`,
          }}
        >
          {/* ─── 表头行 ─── */}
          <div className="sticky top-0 left-0 z-20 bg-paper-dark border-b border-r border-ink-light px-0.5 py-2 text-center">
            <span className="text-[10px] sm:text-[11px] font-medium text-ink-muted tracking-wide">
              节
            </span>
          </div>
          {ALL_DAYS.map((day) => (
            <div
              key={day}
              className={`sticky top-0 z-10 border-b border-ink-light px-0.5 py-2 text-center transition-colors ${
                day === todayDay ? 'bg-accent-soft' : 'bg-paper-dark'
              }`}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-ink">
                {isMobile ? SHORT_DAY_NAMES[day] : getDayName(day)}
              </span>
              {day === todayDay && (
                <span className={`${isMobile ? 'block text-[8px] leading-none' : 'block text-[9px] mt-0.5'} text-accent font-medium`}>
                  {isMobile ? '今' : '今天'}
                </span>
              )}
            </div>
          ))}

          {/* ─── 课程区域 ─── */}
          {Array.from({ length: 12 }, (_, i) => i + 1).map((period) => {
            const time = getPeriodTime(period)
            const timeStr = `${String(time.startHour).padStart(2, '0')}:${String(time.startMin).padStart(2, '0')}`

            return (
              <div key={period} className="contents">
                {/* 节次标签 */}
                <div className="sticky left-0 z-10 bg-paper border-b border-r border-ink-light px-0.5 py-1 text-center">
                  <div className="text-[10px] sm:text-[11px] font-semibold text-ink/70 leading-none">
                    {period}
                  </div>
                  {!isMobile && (
                    <div className="text-[8px] sm:text-[9px] text-ink-muted/50 leading-none mt-0.5">
                      {timeStr}
                    </div>
                  )}
                </div>

                {/* 每天格子 */}
                {ALL_DAYS.map((day) => {
                  // 被跨节课程覆盖的格子跳过
                  if (isCovered(day, period)) {
                    return <div key={`${day}-${period}`} />
                  }

                  const startingCourses = coursesStartingAt(day, period)
                  const highlight = isCurrentInCell(day, period)
                  const isToday = day === todayDay

                  return (
                    <div
                      key={`${day}-${period}`}
                      className={`border-b border-r border-ink-light/50 p-px relative transition-colors ${
                        isToday ? 'bg-paper-dark/40' : ''
                      } ${highlight ? 'current-period-highlight' : ''}`}
                      style={{ minHeight: isMobile ? '38px' : '62px' }}
                    >
                      {startingCourses.map((course) => {
                        const idx = getCourseIndex()
                        const bg = getCourseColor(course.name)
                        const borderColor = getCourseBorderColor(course.name)
                        const span = course.endPeriod - course.startPeriod + 1

                        return (
                          <div
                            key={course.id}
                            className={`rounded-md px-1 py-0.5 sm:px-1.5 sm:py-1 cursor-pointer select-none
                              shadow-card hover:shadow-card-hover transition-all duration-200
                              hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
                              ${mounted ? 'course-card-enter' : ''}`}
                            style={{
                              backgroundColor: bg,
                              borderLeft: `2px solid ${borderColor}`,
                              gridRow: span > 1 ? `span ${span}` : undefined,
                              animationDelay: `${idx * 20}ms`,
                              height: span > 1 ? `${span * 100}%` : undefined,
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
                            {/* 课程名 */}
                            <div className="flex items-start justify-between gap-0.5">
                              <span
                                className={`font-semibold text-ink/90 truncate leading-tight ${
                                  isMobile ? 'text-[9px]' : 'text-[11px] sm:text-xs'
                                }`}
                              >
                                {course.name}
                              </span>
                              {course.startPeriod !== course.endPeriod && (
                                <span
                                  className={`text-ink-muted/50 flex-shrink-0 tabular-nums ${
                                    isMobile ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'
                                  }`}
                                >
                                  {course.startPeriod}-{course.endPeriod}
                                </span>
                              )}
                            </div>

                            {/* 详情：教师 + 地点 */}
                            {(course.location || course.teacher) && (
                              <div
                                className={`text-ink-muted/70 leading-tight truncate mt-px ${
                                  isMobile ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'
                                }`}
                              >
                                {[course.teacher, course.location].filter(Boolean).join(' · ')}
                              </div>
                            )}

                            {/* 周次标签（非全周时显示） */}
                            {course.weekType !== 'all' && (
                              <span
                                className={`inline-block mt-0.5 px-1 py-px rounded-full bg-white/60 text-ink-muted/70 font-medium ${
                                  isMobile ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'
                                }`}
                              >
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
