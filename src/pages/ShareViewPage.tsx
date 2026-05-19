import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { decompressSemester } from '../utils/shareUtils'
import { loadSchedules, saveSchedules, generateId } from '../utils/scheduleUtils'
import { CourseGrid } from '../components/CourseGrid'
import { WeekSelector } from '../components/WeekSelector'
import { OfflineBanner } from '../components/OfflineBanner'
import { getCurrentWeekNumber } from '../utils/scheduleUtils'
import type { Semester } from '../types'

/**
 * 分享课表查看页
 * 从 URL 参数中解压课表数据并展示为只读视图
 * 支持"保存到我的课表"功能
 */
export function ShareViewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [semester, setSemester] = useState<Semester | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const data = searchParams.get('data')
    if (!data) {
      setError('未找到课表数据。请检查链接是否完整。')
      return
    }

    try {
      // URL 解码后再解压
      const decoded = decodeURIComponent(data)
      const result = decompressSemester(decoded)
      if (!result) {
        setError('课表数据解析失败。链接可能已损坏或不完整。')
        return
      }
      setSemester(result)
    } catch {
      setError('课表数据解析失败。链接可能已损坏或不完整。')
    }
  }, [searchParams])

  const week = semester ? Math.max(1, getCurrentWeekNumber(semester.startDate)) : 1
  const [currentWeek, setCurrentWeek] = useState(week)

  /** 将查看的课表保存到本地 */
  const handleSave = () => {
    if (!semester) return

    const schedules = loadSchedules()
    // 生成新的 ID 避免冲突
    const newId = generateId()
    const savedSemester: Semester = {
      ...semester,
      id: newId,
      courses: semester.courses.map((c) => ({
        ...c,
        id: generateId(),
        semesterId: newId,
      })),
    }

    saveSchedules([...schedules, savedSemester])
    localStorage.setItem('lastSemesterId', newId)
    setSaved(true)

    // 延迟跳转
    setTimeout(() => {
      navigate('/schedule')
    }, 800)
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <OfflineBanner />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-gray-600 text-sm text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/schedule')}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // 加载中
  if (!semester) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">正在解析课表...</p>
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
            <button
              onClick={() => navigate('/schedule')}
              className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">{semester.name}</h1>
          </div>

          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-100 text-green-600'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存' : '保存到我的课表'}
          </button>
        </div>

        {/* 提示条 */}
        <div className="bg-blue-50 text-blue-700 text-xs text-center py-1.5 px-4">
          这是朋友分享的课表（只读模式）
        </div>

        {/* 周选择器 */}
        <WeekSelector week={currentWeek} onChange={setCurrentWeek} />
      </header>

      {/* 课表主体 */}
      <main className="flex-1 px-2 sm:px-4 py-3">
        <CourseGrid
          courses={semester.courses}
          currentWeek={currentWeek}
          semesterStartDate={semester.startDate}
          onEditCourse={() => {}}
          onDeleteCourse={() => {}}
          readOnly
        />
      </main>

      <footer className="text-center py-3 text-[11px] text-gray-300">
        Clean课表 · 极简课程表
      </footer>
    </div>
  )
}
