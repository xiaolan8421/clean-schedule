import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, Plus, Trash2, Settings, MoreHorizontal, Check } from 'lucide-react'
import type { Semester, Course } from '../types'
import {
  loadSchedules, saveSchedules, getCurrentWeekNumber,
  generateId, getDayName,
} from '../utils/scheduleUtils'
import { CourseGrid } from '../components/CourseGrid'
import { ShareMenu } from '../components/ShareMenu'
import { CourseEditModal } from '../components/CourseEditModal'
import { SettingsModal } from '../components/SettingsModal'
import { OfflineBanner } from '../components/OfflineBanner'
import { loadSettings as loadAppSettings, saveSettings as saveAppSettings } from '../utils/settings'
import type { AppSettings } from '../utils/settings'

function formatToday(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const dayName = getDayName(now.getDay() || 7)
  return `${y}/${m}/${d} ${dayName}`
}

export function SchedulePage() {
  const navigate = useNavigate()

  const [schedules, setSchedules] = useState<Semester[]>(() => loadSchedules())
  const [currentSemesterId, setCurrentSemesterId] = useState<string>(() => {
    const saved = localStorage.getItem('lastSemesterId')
    const all = loadSchedules()
    if (saved && all.find((s) => s.id === saved)) return saved
    return all[0]?.id || ''
  })

  const currentSemester = schedules.find((s) => s.id === currentSemesterId)

  const [week, setWeek] = useState(() =>
    currentSemester ? getCurrentWeekNumber(currentSemester.startDate) : 1
  )

  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings())
  const [todayStr] = useState(() => formatToday())

  useEffect(() => {
    if (currentSemester) {
      setWeek(getCurrentWeekNumber(currentSemester.startDate))
    }
  }, [currentSemesterId])

  useEffect(() => {
    saveSchedules(schedules)
  }, [schedules])

  useEffect(() => {
    if (currentSemesterId) {
      localStorage.setItem('lastSemesterId', currentSemesterId)
    }
  }, [currentSemesterId])

  const handleSemesterChange = useCallback((semesterId: string) => {
    setCurrentSemesterId(semesterId)
    setShowSettings(false)
  }, [])

  const handleSemesterRename = useCallback(
    (semesterId: string, newName: string) => {
      setSchedules((prev) =>
        prev.map((s) => (s.id === semesterId ? { ...s, name: newName } : s))
      )
    },
    []
  )

  const handleDeleteSemester = useCallback(() => {
    if (!currentSemester) return
    if (!confirm(`确定删除学期"${currentSemester.name}"及其所有课程？此操作不可恢复。`)) return
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== currentSemester.id)
      return updated
    })
    setCurrentSemesterId((prev) => {
      const remaining = schedules.filter((s) => s.id !== prev)
      const newId = remaining[0]?.id || ''
      if (newId) localStorage.setItem('lastSemesterId', newId)
      return newId
    })
    setShowSettings(false)
  }, [currentSemester, schedules])

  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings)
    saveAppSettings(newSettings)
  }, [])

  // ─── 滑动切周 ───
  const touchStartX = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const delta = e.changedTouches[0].clientX - touchStartX.current
      if (Math.abs(delta) < 50) return
      if (delta < 0 && week < 20) setWeek(week + 1)
      if (delta > 0 && week > 1) setWeek(week - 1)
    },
    [week]
  )

  const handleSaveCourse = useCallback((course: Course) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== course.semesterId) return s
        const idx = s.courses.findIndex((c) => c.id === course.id)
        if (idx >= 0) {
          const newCourses = [...s.courses]
          newCourses[idx] = course
          return { ...s, courses: newCourses }
        }
        // 新课程
        return { ...s, courses: [...s.courses, course] }
      })
    )
    setEditingCourse(null)
  }, [])

  const handleAddCourse = useCallback(
    (day: number, period: number) => {
      if (!currentSemester) return
      setEditingCourse({
        id: generateId(),
        name: '',
        dayOfWeek: day,
        startPeriod: period,
        endPeriod: Math.min(period + 1, 11),
        weekType: 'all',
        semesterId: currentSemester.id,
      })
    },
    [currentSemester]
  )

  const handleDeleteCourse = useCallback((courseId: string) => {
    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        courses: s.courses.filter((c) => c.id !== courseId),
      }))
    )
    setEditingCourse(null)
  }, [])

  // ─── 空状态 ───
  if (schedules.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#FAF9F6' }}>
        <OfflineBanner />
        <header className="sticky top-0 z-40 border-b border-gray-200/60" style={{ background: 'rgba(250,249,246,0.9)', backdropFilter: 'blur-sm' }}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#C88D1A' }} />
              <h1 className="text-base font-bold tracking-wide" style={{ color: '#2C2416' }}>Clean课表</h1>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="设置"
            >
              <Settings className="w-4 h-4" style={{ color: '#8B8378' }} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5 shadow-md" style={{ background: '#F3F1EC' }}>
            <Plus className="w-10 h-10" style={{ color: 'rgba(200,141,26,0.6)' }} />
          </div>
          <h1 className="text-xl font-bold mb-1.5 tracking-wide" style={{ color: '#2C2416' }}>欢迎使用 Clean课表</h1>
          <p className="text-sm text-center mb-8 leading-relaxed max-w-xs" style={{ color: 'rgba(139,131,120,0.8)' }}>
            上传 Excel 或 ICS 文件导入课表<br />
            或使用分享链接查看朋友的课表
          </p>
          <button
            onClick={() => navigate('/import')}
            className="px-8 py-3 rounded-2xl text-sm font-semibold
              hover:opacity-90 active:scale-[0.97] transition-all shadow-md hover:shadow-lg"
            style={{ background: '#2C2416', color: '#FAF9F6' }}
          >
            导入课表
          </button>
        </div>

        {showSettingsModal && (
          <SettingsModal
            settings={appSettings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF9F6' }}>
      <OfflineBanner />

      {/* ─── 顶部栏 ─── */}
      <header
        className="sticky top-0 z-40 border-b border-gray-200/60 page-enter-header"
        style={{ background: 'rgba(250,249,246,0.9)', backdropFilter: 'blur-sm' }}
      >
        <div className="flex items-center justify-between px-4 py-2">
          {/* 左侧：周次切换（箭头+数字+日期） */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => week > 1 && setWeek(week - 1)}
              disabled={week <= 1}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-20 transition-colors"
              aria-label="上一周"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B8378" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight" style={{ color: '#2C2416' }}>
                第 {week} 周
              </span>
              <span className="text-xs" style={{ color: '#8B8378' }}>
                {todayStr}
              </span>
            </div>
            <button
              onClick={() => week < 20 && setWeek(week + 1)}
              disabled={week >= 20}
              className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-20 transition-colors"
              aria-label="下一周"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B8378" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowShareMenu(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="分享课表"
            >
              <Share2 className="w-4 h-4" style={{ color: '#8B8378' }} />
            </button>

            {/* 更多菜单 */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="更多"
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: '#8B8378' }} />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
                    {/* 学期切换 */}
                    <div className="px-3 py-1">
                      <div className="text-[10px] text-gray-400 font-medium px-1 mb-0.5">当前学期</div>
                      {schedules.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleSemesterChange(s.id)}
                          className="w-full text-left px-1 py-1.5 text-[12px] rounded-md transition-colors flex items-center justify-between"
                          style={{
                            color: s.id === currentSemesterId ? '#2C2416' : '#8B8378',
                            fontWeight: s.id === currentSemesterId ? 600 : 400,
                            background: s.id === currentSemesterId ? 'rgba(200,141,26,0.06)' : 'transparent',
                          }}
                        >
                          <span className="truncate">{s.name}</span>
                          {s.id === currentSemesterId && (
                            <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C88D1A' }} />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={() => {
                        navigate('/import')
                        setShowSettings(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2.5"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                      导入课表
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true)
                        setShowSettings(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2.5"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      AI 设置
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={() => {
                        handleDeleteSemester()
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除当前学期
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── 课表主体 ─── */}
      <main
        className="flex-1 px-2 sm:px-5 py-3 page-enter-grid select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentSemester && (
          <CourseGrid
            courses={currentSemester.courses}
            currentWeek={week}
            semesterStartDate={currentSemester.startDate}
            onEditCourse={setEditingCourse}
            onDeleteCourse={handleDeleteCourse}
            onAddCourse={handleAddCourse}
          />
        )}
      </main>

      {/* ─── 弹窗 ─── */}
      {currentSemester && (
        <CourseEditModal
          course={editingCourse}
          semesterId={currentSemester.id}
          onSave={handleSaveCourse}
          onDelete={handleDeleteCourse}
          onClose={() => setEditingCourse(null)}
        />
      )}

      {showShareMenu && currentSemester && (
        <ShareMenu
          semester={currentSemester}
          onClose={() => setShowShareMenu(false)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={appSettings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  )
}
