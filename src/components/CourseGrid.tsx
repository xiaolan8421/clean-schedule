import { useState, useEffect, useRef, useCallback } from 'react'
import type { Course } from '../types'
import { shouldShowCourse, isOddWeek, getCurrentDayAndPeriod, getDayName, getPeriodTime, formatWeekLabel } from '../utils/scheduleUtils'
import { getCourseColor } from '../utils/colorHash'

interface CourseGridProps {
  /** 当前学期所有课程 */
  courses: Course[]
  /** 当前教学周 */
  currentWeek: number
  /** 学期开始日期 */
  semesterStartDate: string
  /** 编辑课程回调 */
  onEditCourse: (course: Course) => void
  /** 删除课程回调 */
  onDeleteCourse: (courseId: string) => void
  /** 是否为只读模式（分享查看） */
  readOnly?: boolean
}

interface ContextMenuState {
  x: number
  y: number
  course: Course
}

/**
 * 课程周视图表格
 * 横向为周一至周日，纵向为第1-12节
 * 根据 weekType 和当前教学周奇偶性过滤显示课程
 * 当前时间对应的格子高亮呼吸动画
 * 支持长按/右键弹出操作菜单
 */
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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTarget = useRef<Course | null>(null)

  // 每分钟更新当前时间高亮
  useEffect(() => {
    const update = () => setCurrentHighlight(getCurrentDayAndPeriod())
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    document.addEventListener('scroll', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', handleClick)
    }
  }, [])

  /** 处理长按（移动端） */
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

  /** 处理右键（桌面端） */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, course: Course) => {
      if (readOnly) return
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, course })
    },
    [readOnly]
  )

  const weekOdd = isOddWeek(currentWeek)
  const days = [1, 2, 3, 4, 5, 6, 7]

  /** 获取指定星期和节次处开始的课程列表 */
  const getStartingCourses = (day: number, period: number): Course[] => {
    return courses.filter(
      (c) =>
        c.dayOfWeek === day &&
        c.startPeriod === period &&
        shouldShowCourse(c.weekType, currentWeek, c.weekStart, c.weekEnd)
    )
  }

  return (
    <div className="relative">
      {/* 表格容器 - 移动端可横向滚动 */}
      <div className="overflow-x-auto scrollbar-hide rounded-lg border border-gray-200" id="course-grid">
        <div className="grid grid-cols-8 min-w-[700px] sm:min-w-0">
          {/* 表头行 */}
          <div className="sticky top-0 left-0 z-20 bg-gray-50 border-b border-r border-gray-200 px-2 py-2.5 text-center text-xs font-medium text-gray-500">
            节次
          </div>
          {days.map((day) => (
            <div
              key={day}
              className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-1 py-2.5 text-center text-xs font-medium text-gray-600"
            >
              <span className="hidden sm:inline">{getDayName(day)}</span>
              <span className="sm:hidden">{['', '一', '二', '三', '四', '五', '六', '日'][day]}</span>
            </div>
          ))}

          {/* 节次行 */}
          {Array.from({ length: 12 }, (_, i) => i + 1).map((period) => {
            const time = getPeriodTime(period)
            const timeStr = `${String(time.startHour).padStart(2, '0')}:${String(time.startMin).padStart(2, '0')}`

            return (
              <div key={period} className="contents">
                {/* 节次标签 - 固定首列 */}
                <div className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-2 py-1.5 text-center">
                  <div className="text-xs font-medium text-gray-500">{period}</div>
                  <div className="text-[10px] text-gray-400 leading-tight hidden sm:block">
                    {timeStr}
                  </div>
                </div>

                {/* 每天的课程格子 */}
                {days.map((day) => {
                  const startingCourses = getStartingCourses(day, period)
                  const isCurrentCell =
                    currentHighlight?.dayOfWeek === day &&
                    currentHighlight?.period === period

                  return (
                    <div
                      key={`${day}-${period}`}
                      className={`border-b border-r border-gray-100 px-1 py-1 min-h-[52px] sm:min-h-[60px] relative ${
                        isCurrentCell ? 'current-period-highlight' : ''
                      }`}
                    >
                      {startingCourses.map((course) => (
                        <div
                          key={course.id}
                          className="rounded-md px-1.5 py-1 mb-0.5 cursor-pointer select-none text-xs leading-tight"
                          style={{ backgroundColor: getCourseColor(course.name) }}
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
                          <div className="font-semibold text-gray-900 truncate">
                            {course.name}
                            {course.startPeriod !== course.endPeriod &&
                              ` ${course.startPeriod}-${course.endPeriod}节`}
                          </div>
                          {course.location && (
                            <div className="text-gray-500 truncate text-[10px]">
                              {course.location}
                            </div>
                          )}
                          {course.teacher && (
                            <div className="text-gray-400 truncate text-[10px]">
                              {course.teacher}
                            </div>
                          )}
                          {course.weekType !== 'all' && (
                            <span className="inline-block text-[9px] px-1 rounded bg-white/50 text-gray-500 mt-0.5">
                              {formatWeekLabel(course.weekType, course.weekStart, course.weekEnd)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 px-1">
        <span>当前周：<strong className="text-gray-600">{weekOdd ? '奇数周' : '偶数周'}（第{currentWeek}周）</strong></span>
      </div>

      {/* 右键 / 长按菜单 */}
      {contextMenu && !readOnly && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{
            left: contextMenu.x > window.innerWidth - 140 ? contextMenu.x - 130 : contextMenu.x,
            top: contextMenu.y > window.innerHeight - 100 ? contextMenu.y - 80 : contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              onEditCourse(contextMenu.course)
              setContextMenu(null)
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
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
            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            删除课程
          </button>
        </div>
      )}
    </div>
  )
}
