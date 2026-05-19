import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2, Plus, Trash2, Settings } from 'lucide-react'
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

/**
 * 课表主页
 * 显示当前学期的周视图课表，支持周次切换、学期管理、课程编辑、分享等功能
 */
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

  // 学期切换时更新周数
  useEffect(() => {
    if (currentSemester) {
      setWeek(getCurrentWeekNumber(currentSemester.startDate))
    }
  }, [currentSemesterId])

  // 持久化
  useEffect(() => {
    saveSchedules(schedules)
  }, [schedules])

  useEffect(() => {
    if (currentSemesterId) {
      localStorage.setItem('lastSemesterId', currentSemesterId)
    }
  }, [currentSemesterId])

  /** 切换学期 */
  const handleSemesterChange = useCallback((semesterId: string) => {
    setCurrentSemesterId(semesterId)
  }, [])

  /** 重命名学期 */
  const handleSemesterRename = useCallback(
    (semesterId: string, newName: string) => {
      setSchedules((prev) =>
        prev.map((s) => (s.id === semesterId ? { ...s, name: newName } : s))
      )
    },
    []
  )

  /** 删除当前学期 */
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

  /** 保存课程编辑 */
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

  /** 保存应用设置 */
  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings)
    saveAppSettings(newSettings)
  }, [])

  /** 删除课程 */
  const handleDeleteCourse = useCallback((courseId: string) => {
    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        courses: s.courses.filter((c) => c.id !== courseId),
      }))
    )
    setEditingCourse(null)
  }, [])

  // 无学期时的空状态
  if (schedules.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <OfflineBanner />
        {/* 顶部栏 - 空状态也显示，让用户能访问设置 */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold text-gray-900">Clean课表</h1>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="设置"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Plus className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">欢迎使用 Clean课表</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            上传 Excel 或 ICS 文件导入课表，或使用分享链接查看朋友的课表
          </p>
          <button
            onClick={() => navigate('/import')}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors shadow-sm"
          >
            导入课表
          </button>
        </div>
        {/* 设置弹窗 */}
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
    <div className="min-h-screen bg-white flex flex-col">
      <OfflineBanner />

      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Clean课表</h1>
          </div>

          <div className="flex items-center gap-3">
            <SemesterSwitcher
              semesters={schedules}
              currentSemesterId={currentSemesterId}
              onChange={handleSemesterChange}
              onAdd={() => navigate('/import')}
              onRename={handleSemesterRename}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShareMenu(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="分享课表"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>

            {/* 设置菜单 */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="设置"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={() => {
                        navigate('/import')
                        setShowSettings(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      导入课表
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsModal(true)
                        setShowSettings(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      AI 设置
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteSemester()
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
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

      {/* 课表主体 */}
      <main className="flex-1 px-2 sm:px-4 py-3">
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

      {/* 底部提示 */}
      <footer className="text-center py-3 text-[11px] text-gray-300">
        Clean课表 · 极简课程表
      </footer>

      {/* 课程编辑弹窗 */}
      {currentSemester && (
        <CourseEditModal
          course={editingCourse}
          semesterId={currentSemester.id}
          onSave={handleSaveCourse}
          onDelete={handleDeleteCourse}
          onClose={() => setEditingCourse(null)}
        />
      )}

      {/* 分享菜单 */}
      {showShareMenu && currentSemester && (
        <ShareMenu
          semester={currentSemester}
          onClose={() => setShowShareMenu(false)}
        />
      )}

      {/* 设置弹窗 */}
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
