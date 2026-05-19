import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ImportSteps } from '../components/ImportSteps'
import { OfflineBanner } from '../components/OfflineBanner'
import { loadSchedules, saveSchedules, generateId } from '../utils/scheduleUtils'
import type { Course, Semester, ImportMode } from '../types'

/**
 * 课表导入页
 * 支持上传 Excel 或 ICS 文件，经列映射/预览后导入为学期课表
 */
export function ImportPage() {
  const navigate = useNavigate()

  const handleImportComplete = (
    courses: Course[],
    mode: ImportMode,
    semesterName: string,
    semesterStartDate: string
  ) => {
    const schedules = loadSchedules()

    if (mode === 'replace') {
      // 替换当前学期：使用最近使用的学期或第一个学期
      const lastId = localStorage.getItem('lastSemesterId')
      const targetSemester = lastId
        ? schedules.find((s) => s.id === lastId)
        : schedules[0]

      if (targetSemester) {
        // 替换课程
        const updatedSchedules = schedules.map((s) =>
          s.id === targetSemester.id
            ? {
                ...s,
                name: semesterName,
                startDate: semesterStartDate,
                courses: courses.map((c) => ({ ...c, semesterId: s.id })),
              }
            : s
        )
        saveSchedules(updatedSchedules)
        navigate('/schedule')
        return
      }
    }

    // 新增学期
    const newId = generateId()
    const newSemester: Semester = {
      id: newId,
      name: semesterName,
      startDate: semesterStartDate,
      courses: courses.map((c) => ({ ...c, semesterId: newId })),
    }
    saveSchedules([...schedules, newSemester])
    localStorage.setItem('lastSemesterId', newId)
    navigate('/schedule')
  }

  return (
    <div className="min-h-screen bg-white">
      <OfflineBanner />

      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/schedule')}
          className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="返回课表"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">导入课表</h1>
      </header>

      {/* 导入向导 */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <ImportSteps onComplete={handleImportComplete} />
      </div>
    </div>
  )
}
