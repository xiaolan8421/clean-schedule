import { useState, useEffect, useRef, useCallback } from 'react'
import type { Course } from '../types'
import { shouldShowCourse, isOddWeek, getCurrentDayAndPeriod, getDayName, getPeriodTime, formatWeekLabel } from '../utils/scheduleUtils'
import { getCoursePalette } from '../utils/colorHash'

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
const TOTAL_PERIODS = 11

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

  const coursesStartingAt = (day: number, period: number): Course[] => {
    return courses.filter(
      (c) =>
        c.dayOfWeek === day &&
        c.startPeriod === period &&
        shouldShowCourse(c.weekType, currentWeek, c.weekStart, c.weekEnd)
    )
  }

  const isCovered = (day: number, period: number): boolean => {
    return courses.some(
      (c) =>
        c.dayOfWeek === day &&
        c.startPeriod < period &&
        c.endPeriod >= period &&
        shouldShowCourse(c.weekType, currentWeek, c.weekStart, c.weekEnd)
    )
  }

  const isCurrentInCell = (day: number, period: number): boolean => {
    if (!currentHighlight || currentHighlight.dayOfWeek !== day) return false
    if (currentHighlight.period === period && !isCovered(day, period)) return true
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

  // ─── 布局参数 ───
  const gap = isMobile ? 2 : 4
  const timeColW = isMobile ? '24px' : '44px'
  const dayCols = isMobile ? 'repeat(7, minmax(0, 1fr))' : 'repeat(7, 1fr)'
  const rowH = isMobile ? 54 : 58

  return (
    <div className="relative">
      <div
        className="overflow-x-auto scrollbar-hide custom-scrollbar rounded-2xl"
        id="course-grid"
        style={{ background: '#FAF9F6' }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${timeColW} ${dayCols}`,
            gap: `${gap}px`,
            padding: isMobile ? '2px' : '4px',
          }}
        >
          {/* ─── 表头行 ─── */}
          <div
            className="flex items-center justify-center"
            style={{
              height: isMobile ? '24px' : '34px',
              fontSize: '9px',
              color: '#8B8378',
              fontWeight: 500,
            }}
          >
            节
          </div>
          {ALL_DAYS.map((day) => (
            <div
              key={day}
              className="flex flex-col items-center justify-center"
              style={{
                height: isMobile ? '24px' : '34px',
                fontSize: isMobile ? '10px' : '12px',
                fontWeight: 600,
                color: day === todayDay ? '#C88D1A' : '#5C5548',
                background: day === todayDay ? 'rgba(200,141,26,0.08)' : 'transparent',
                borderRadius: '6px',
              }}
            >
              <span style={{ lineHeight: 1.2 }}>
                {isMobile ? SHORT_DAY_NAMES[day] : getDayName(day)}
              </span>
            </div>
          ))}

          {/* ─── 课程区域 ─── */}
          {Array.from({ length: TOTAL_PERIODS }, (_, i) => i + 1).map((period) => {
            const time = getPeriodTime(period)
            const timeStr = `${String(time.startHour).padStart(2, '0')}:${String(time.startMin).padStart(2, '0')}`

            return (
              <div key={period} className="contents">
                {/* 节次标签 */}
                <div
                  className="flex flex-col items-center justify-center select-none"
                  style={{
                    minHeight: `${rowH}px`,
                    color: '#8B8378',
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 600, lineHeight: 1 }}>
                    {period}
                  </span>
                  {!isMobile && (
                    <span style={{ fontSize: '8px', opacity: 0.5, marginTop: '1px', lineHeight: 1 }}>
                      {timeStr}
                    </span>
                  )}
                </div>

                {/* 每天格子 */}
                {ALL_DAYS.map((day) => {
                  if (isCovered(day, period)) {
                    return null
                  }

                  const startingCourses = coursesStartingAt(day, period)
                  const highlight = isCurrentInCell(day, period)
                  const isToday = day === todayDay

                  if (startingCourses.length === 0) {
                    return (
                      <div
                        key={`${day}-${period}`}
                        className={highlight ? 'current-period-highlight' : ''}
                        style={{
                          minHeight: `${rowH}px`,
                          borderRadius: '8px',
                          background: isToday ? 'rgba(200,141,26,0.03)' : 'rgba(0,0,0,0.01)',
                        }}
                      />
                    )
                  }

                  const maxSpan = Math.max(
                    ...startingCourses.map((c) => c.endPeriod - c.startPeriod + 1)
                  )

                  return (
                    <div
                      key={`${day}-${period}`}
                      style={{
                        gridRow: maxSpan > 1 ? `span ${maxSpan}` : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      {startingCourses.map((course) => {
                        const palette = getCoursePalette(course.name)
                        const idx = getCourseIndex()
                        const courseSpan = course.endPeriod - course.startPeriod + 1

                        return (
                          <div
                            key={course.id}
                            className={`course-card select-none transition-all duration-200
                              hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
                              ${mounted ? 'course-card-enter' : ''}
                              ${highlight ? 'course-card-current' : ''}`}
                            style={{
                              backgroundColor: palette.bg,
                              borderLeft: `3px solid ${palette.border}`,
                              borderRadius: isMobile ? '8px' : '12px',
                              padding: isMobile ? '5px 4px 5px 3px' : '8px 8px 8px 7px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                              animationDelay: `${idx * 15}ms`,
                              height: courseSpan > 1 ? '100%' : undefined,
                              minHeight: `${rowH - gap - 2}px`,
                              overflow: 'hidden',
                              cursor: readOnly ? 'default' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
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
                            {/* 课程名 — 允许多行 */}
                            <div
                              style={{
                                fontSize: isMobile ? '10px' : '13px',
                                fontWeight: 600,
                                color: palette.text,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                wordBreak: 'break-all',
                              }}
                            >
                              {course.name}
                            </div>

                            {/* 地点 */}
                            {course.location && (
                              <div
                                style={{
                                  fontSize: isMobile ? '9px' : '11px',
                                  lineHeight: 1.3,
                                  color: palette.text,
                                  opacity: 0.7,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: '1px',
                                }}
                              >
                                📍{course.location}
                              </div>
                            )}

                            {/* 教师 */}
                            {course.teacher && (
                              <div
                                style={{
                                  fontSize: isMobile ? '8px' : '10px',
                                  lineHeight: 1.3,
                                  color: palette.text,
                                  opacity: 0.55,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: '1px',
                                }}
                              >
                                👤{course.teacher}
                              </div>
                            )}

                            {/* 周次标签 */}
                            {course.weekType !== 'all' && (
                              <div style={{ marginTop: 'auto', paddingTop: '2px' }}>
                                <span
                                  style={{
                                    fontSize: isMobile ? '7px' : '10px',
                                    fontWeight: 500,
                                    color: palette.text,
                                    opacity: 0.45,
                                    background: 'rgba(255,255,255,0.5)',
                                    padding: '0 3px',
                                    borderRadius: '3px',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {formatWeekLabel(course.weekType, course.weekStart, course.weekEnd)}
                                </span>
                              </div>
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

      {/* 右键 / 长按菜单 */}
      {contextMenu && !readOnly && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[130px] overflow-hidden"
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
            className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            编辑课程
          </button>
          <button
            onClick={() => {
              if (confirm('确定删除此课程？')) onDeleteCourse(contextMenu.course.id)
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
          >
            删除课程
          </button>
        </div>
      )}
    </div>
  )
}
