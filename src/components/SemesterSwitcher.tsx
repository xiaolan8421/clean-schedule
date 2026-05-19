import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Edit3 } from 'lucide-react'
import type { Semester } from '../types'

interface SemesterSwitcherProps {
  /** 所有学期列表 */
  semesters: Semester[]
  /** 当前选中学期 ID */
  currentSemesterId: string
  /** 切换学期回调 */
  onChange: (semesterId: string) => void
  /** 新增学期回调（跳转导入页） */
  onAdd: () => void
  /** 编辑学期名称回调 */
  onRename: (semesterId: string, newName: string) => void
}

/**
 * 学期切换下拉菜单
 * 显示当前学期名称，下拉可切换学期、新增学期或重命名
 */
export function SemesterSwitcher({
  semesters,
  currentSemesterId,
  onChange,
  onAdd,
  onRename,
}: SemesterSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const currentSemester = semesters.find((s) => s.id === currentSemesterId)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setRenamingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleRenameStart = (semester: Semester) => {
    setRenamingId(semester.id)
    setRenameValue(semester.name)
  }

  const handleRenameConfirm = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors max-w-[160px]"
      >
        <span className="truncate">{currentSemester?.name || '无学期'}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {semesters.map((sem) => (
            <div key={sem.id} className="flex items-center">
              {renamingId === sem.id ? (
                <div className="flex-1 px-3 py-2 flex items-center gap-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm()
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="flex-1 text-sm border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    autoFocus
                    onBlur={handleRenameConfirm}
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    onChange(sem.id)
                    setOpen(false)
                  }}
                  className={`flex-1 text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                    sem.id === currentSemesterId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {sem.name}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRenameStart(sem)
                }}
                className="px-2 py-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={`重命名 ${sem.name}`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <hr className="my-1 border-gray-100" />
          <button
            onClick={() => {
              onAdd()
              setOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            新增学期
          </button>
        </div>
      )}
    </div>
  )
}
