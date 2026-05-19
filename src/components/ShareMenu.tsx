import { useState } from 'react'
import { Link, Copy, Image, FileDown, X, Check } from 'lucide-react'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'
import type { Semester } from '../types'
import { compressSemester, semesterToIcs } from '../utils/shareUtils'

interface ShareMenuProps {
  /** 当前学期数据 */
  semester: Semester
  /** 关闭菜单回调 */
  onClose: () => void
}

/**
 * 分享菜单弹窗
 * 提供三种分享方式：导出 ICS 日历文件、生成分享链接（可复制）、导出为图片
 */
export function ShareMenu({ semester, onClose }: ShareMenuProps) {
  const [copied, setCopied] = useState(false)
  const [exportingImage, setExportingImage] = useState(false)

  /** 导出 ICS 日历文件 */
  const handleExportIcs = () => {
    const icsContent = semesterToIcs(semester)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    saveAs(blob, `${semester.name}.ics`)
  }

  /** 生成并复制分享链接 */
  const handleCopyLink = async () => {
    const compressed = compressSemester(semester)
    const url = `${window.location.origin}/share-view?data=${encodeURIComponent(compressed)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案：显示链接让用户手动复制
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /** 导出为图片 */
  const handleExportImage = async () => {
    setExportingImage(true)
    try {
      const gridEl = document.getElementById('course-grid')
      if (!gridEl) {
        alert('未找到课表表格')
        return
      }
      const canvas = await html2canvas(gridEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `Clean课表-${semester.name}.png`)
        }
      })
    } catch {
      alert('导出图片失败，请重试')
    } finally {
      setExportingImage(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 菜单 */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">分享课表</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          {/* 导出 ICS */}
          <button
            onClick={handleExportIcs}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileDown className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">导出 ICS 日历文件</div>
              <div className="text-xs text-gray-400">可导入系统日历或 Google Calendar</div>
            </div>
          </button>

          {/* 复制分享链接 */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Link className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {copied ? '已复制链接！' : '复制分享链接'}
              </div>
              <div className="text-xs text-gray-400">对方打开即可查看课表，无需下载</div>
            </div>
          </button>

          {/* 导出图片 */}
          <button
            onClick={handleExportImage}
            disabled={exportingImage}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Image className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">
                {exportingImage ? '正在生成图片...' : '导出为图片'}
              </div>
              <div className="text-xs text-gray-400">将当前周视图保存为 PNG 图片</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
