import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { Course } from '../types'

interface CourseEditModalProps {
  course: Course | null
  semesterId: string
  onSave: (course: Course) => void
  onDelete: (courseId: string) => void
  onClose: () => void
}

/**
 * 课程编辑弹窗
 * 支持全周/单周/双周/起止周 四种周次模式
 */
export function CourseEditModal({
  course,
  semesterId,
  onSave,
  onDelete,
  onClose,
}: CourseEditModalProps) {
  const [name, setName] = useState('')
  const [teacher, setTeacher] = useState('')
  const [location, setLocation] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startPeriod, setStartPeriod] = useState(1)
  const [endPeriod, setEndPeriod] = useState(1)
  const [weekType, setWeekType] = useState<'all' | 'odd' | 'even' | 'range'>('all')
  const [weekStart, setWeekStart] = useState(1)
  const [weekEnd, setWeekEnd] = useState(16)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (course) {
      setName(course.name)
      setTeacher(course.teacher || '')
      setLocation(course.location || '')
      setDayOfWeek(course.dayOfWeek)
      setStartPeriod(course.startPeriod)
      setEndPeriod(course.endPeriod)
      setWeekType(course.weekType)
      setWeekStart(course.weekStart ?? 1)
      setWeekEnd(course.weekEnd ?? 16)
      setShowDeleteConfirm(false)
    }
  }, [course])

  if (!course) return null

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      ...course,
      name: name.trim(),
      teacher: teacher.trim() || undefined,
      location: location.trim() || undefined,
      dayOfWeek,
      startPeriod,
      endPeriod: Math.max(endPeriod, startPeriod),
      weekType,
      weekStart: weekType === 'range' ? weekStart : undefined,
      weekEnd: weekType === 'range' ? weekEnd : undefined,
    })
  }

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    onDelete(course.id)
  }

  const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">编辑课程</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">课程名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="课程名称" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">教师</label>
            <input type="text" value={teacher} onChange={(e) => setTeacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="教师（选填）" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">地点</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="上课地点（选填）" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">星期</label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              {dayNames.slice(1).map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">起始节次</label>
              <select value={startPeriod} onChange={(e) => {
                const v = parseInt(e.target.value, 10); setStartPeriod(v); if (v > endPeriod) setEndPeriod(v)
              }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>第{p}节</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">结束节次</label>
              <select value={endPeriod} onChange={(e) => setEndPeriod(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                {Array.from({ length: 12 }, (_, i) => i + 1).filter(p => p >= startPeriod).map((p) => (
                  <option key={p} value={p}>第{p}节</option>
                ))}
              </select>
            </div>
          </div>

          {/* 周次类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">周次类型</label>
            <select value={weekType} onChange={(e) => setWeekType(e.target.value as 'all' | 'odd' | 'even' | 'range')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
              <option value="all">全周（每周都有）</option>
              <option value="odd">单周</option>
              <option value="even">双周</option>
              <option value="range">指定周范围</option>
            </select>
          </div>

          {/* 周范围输入（仅在 range 模式下显示） */}
          {weekType === 'range' && (
            <div className="flex gap-3 bg-gray-50 rounded-lg p-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">从第几周</label>
                <input type="number" min={1} max={20} value={weekStart}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) || 1
                    setWeekStart(Math.max(1, Math.min(v, 20)))
                    if (v > weekEnd) setWeekEnd(v)
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
              </div>
              <div className="flex items-center pt-5 text-gray-400">—</div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">到第几周</label>
                <input type="number" min={1} max={20} value={weekEnd}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) || 1
                    setWeekEnd(Math.max(1, Math.min(v, 20)))
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-5 gap-3">
          <button onClick={handleDelete}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showDeleteConfirm ? 'bg-red-500 text-white hover:bg-red-600' : 'text-red-500 hover:bg-red-50'
            }`}>
            <Trash2 className="w-4 h-4" />
            {showDeleteConfirm ? '确认删除' : '删除'}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
            <button onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
