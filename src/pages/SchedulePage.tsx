import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, Plus, Trash2, Settings, MoreHorizontal } from 'lucide-react'
import type { Semester, Course } from '../types'
import {
  loadSchedules, saveSchedules, getCurrentWeekNumber,
  generateId,
} from '../utils/scheduleUtils'
import { CourseGrid } from '../components/CourseGrid'
import { WeekSelector } from '../components/WeekSelector'
import { ShareMenu } from '../components/ShareMenu'
import { CourseEditModal } from '../components/CourseEditModal'
import { SemesterSwitcher } from '../components/SemesterSwitcher'
import { SettingsModal } from '../components/SettingsModal'
import { OfflineBanner } from '../components/OfflineBanner'
import { loadSettings as loadAppSettings, saveSettings as saveAppSettings } from '../utils/settings'
import type { AppSettings } from '../utils/settings'

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
        return s
      })
    )
    setEditingCourse(null)
  }, [])

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
      <div className="min-h-screen bg-paper flex flex-col">
        <OfflineBanner />
        <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-ink-light/60">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <h1 className="text-base font-bold text-ink tracking-wide">Clean课表</h1>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-full hover:bg-ink-light/40 transition-colors"
              aria-label="设置"
            >
              <Settings className="w-4 h-4 text-ink-muted" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 rounded-3xl bg-paper-dark flex items-center justify-center mb-5 shadow-paper-md">
            <Plus className="w-10 h-10 text-accent/60" />
          </div>
          <h1 className="text-xl font-bold text-ink mb-1.5 tracking-wide">欢迎使用 Clean课表</h1>
          <p className="text-sm text-ink-muted/80 text-center mb-8 leading-relaxed max-w-xs">
            上传 Excel 或 ICS 文件导入课表<br />
            或使用分享链接查看朋友的课表
          </p>
          <button
            onClick={() => navigate('/import')}
            className="px-8 py-3 bg-ink text-paper rounded-2xl text-sm font-semibold
              hover:bg-ink/90 active:scale-[0.97] transition-all shadow-paper-md hover:shadow-paper-lg"
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
    <div className="min-h-screen bg-paper flex flex-col">
      <OfflineBanner />

      {/* ─── 顶部栏 ─── */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-ink-light/60 page-enter-header">
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* 左侧：标题 */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            <h1 className="text-base font-bold text-ink tracking-wide">Clean课表</h1>
          </div>

          {/* 中间：学期切换 */}
          <SemesterSwitcher
            semesters={schedules}
            currentSemesterId={currentSemesterId}
            onChange={handleSemesterChange}
            onAdd={() => navigate('/import')}
            onRename={handleSemesterRename}
          />

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowShareMenu(true)}
              className="p-2 rounded-full hover:bg-ink-light/40 transition-colors"
              aria-label="分享课表"
            >
              <Share2 className="w-4 h-4 text-ink-muted" />
            </button>

            {/* 更多菜单 */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full hover:bg-ink-light/40 transition-colors"
                aria-label="更多"
              >
                <MoreHorizontal className="w-4 h-4 text-ink-muted" />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-paper border border-ink-light rounded-xl shadow-paper-lg z-50 py-1.5 overflow-hidden">
                    <button
                      onClick={() => {
                        navigate('/import')
                        setShowSettings(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-accent-soft transition-colors flex items-center gap-2.5"
                    >
                      <Plus className="w-4 h-4 text-ink-muted" />
                      导入课表
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true)
                        setShowSettings(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-accent-soft transition-colors flex items-center gap-2.5"
                    >
                      <Settings className="w-4 h-4 text-ink-muted" />
                      AI 设置
                    </button>
                    <div className="border-t border-ink-light/60 my-1" />
                    <button
                      onClick={() => {
                        handleDeleteSemester()
                      }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-red-500/90 hover:bg-red-50 transition-colors flex items-center gap-2.5"
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

        {/* 周选择器 */}
        <WeekSelector week={week} onChange={setWeek} />
      </header>

      {/* ─── 课表主体 ─── */}
      <main className="flex-1 px-3 sm:px-5 py-4 page-enter-grid">
        {currentSemester && (
          <CourseGrid
            courses={currentSemester.courses}
            currentWeek={week}
            semesterStartDate={currentSemester.startDate}
            onEditCourse={setEditingCourse}
            onDeleteCourse={handleDeleteCourse}
          />
        )}
      </main>

      {/* ─── 底部 ─── */}
      <footer className="text-center py-4 text-[11px] text-ink-muted/50 tracking-wide page-enter-footer">
        Clean课表 · 极简课程表
      </footer>

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
