import { useState, useRef } from 'react'
import {
  Upload, Download, ArrowRight, ArrowLeft, Check, AlertCircle,
  Brain, Loader2, TableProperties,
} from 'lucide-react'
import type { Course, ImportMode } from '../types'
import { parseExcelFileRaw, downloadTemplate } from '../utils/excelParser'
import { parseIcsContent } from '../utils/icsParser'
import { getDayName, formatWeekLabel } from '../utils/scheduleUtils'
import { aiRecognizeSchedule } from '../utils/aiParser'
import { loadSettings } from '../utils/settings'

interface ImportStepsProps {
  onComplete: (courses: Course[], mode: ImportMode, semesterName: string, semesterStartDate: string) => void
}

type Step = 'upload' | 'recognize' | 'preview'

/**
 * 课表导入向导
 * 步骤：上传 → AI 识别 → 预览确认
 * 采用纯 AI 识别模式，不再依赖本地规则映射
 */
export function ImportSteps({ onComplete }: ImportStepsProps) {
  const [step, setStep] = useState<Step>('upload')
  const [fileType, setFileType] = useState<'excel' | 'ics' | null>(null)
  const [allRows, setAllRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  // AI 识别
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiCourses, setAiCourses] = useState<Course[]>([])
  // 预览/确认
  const [parsedCourses, setParsedCourses] = useState<Course[]>([])
  const [semesterName, setSemesterName] = useState('')
  const [semesterStartDate, setSemesterStartDate] = useState('')
  const [importMode, setImportMode] = useState<ImportMode>('new')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 处理文件上传 */
  const handleFile = async (file: File) => {
    setError('')
    setAiError('')
    setAiCourses([])
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const data = await parseExcelFileRaw(file)
        if (data.rows.length === 0) {
          setError('Excel 文件为空，请检查文件')
          return
        }
        setFileType('excel')
        setAllRows(data.rows)
        setFileName(file.name)
        setStep('recognize')
      } catch (e) {
        setError('Excel 文件解析失败，请检查文件格式')
      }
    } else if (ext === 'ics') {
      try {
        const text = await file.text()
        const courses = parseIcsContent(text, '')
        if (courses.length === 0) {
          setError('未在 ICS 文件中找到课程事件')
          return
        }
        setFileType('ics')
        setParsedCourses(courses)
        const nameFromFile = file.name.replace(/\.ics$/i, '')
        setSemesterName(nameFromFile || '导入的课表')
        setSemesterStartDate(new Date().toISOString().split('T')[0])
        setStep('preview')
      } catch (e) {
        setError('ICS 文件解析失败，请检查文件格式')
      }
    } else {
      setError('不支持的文件格式，请上传 .xlsx、.xls 或 .ics 文件')
    }
  }

  /** AI 智能识别 */
  const handleAiRecognize = async () => {
    const settings = loadSettings()
    if (!settings.deepseekApiKey) {
      setAiError('请先在首页右上角齿轮 → AI 设置中填写 DeepSeek API Key')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const courses = await aiRecognizeSchedule(allRows, settings.deepseekApiKey)
      setAiCourses(courses)
    } catch (e: any) {
      setAiError(e.message || 'AI 识别失败，请重试')
    } finally {
      setAiLoading(false)
    }
  }

  /** AI 识别完成后进入预览 */
  const handleToPreview = () => {
    setParsedCourses(aiCourses)
    setSemesterName(fileName.replace(/\.(xlsx|xls)$/i, '') || '导入的课表')
    setSemesterStartDate(new Date().toISOString().split('T')[0])
    setError('')
    setStep('preview')
  }

  /** 确认导入 */
  const handleImport = () => {
    if (!semesterName.trim()) { setError('请输入学期名称'); return }
    if (!semesterStartDate) { setError('请选择学期开始日期'); return }
    onComplete(parsedCourses, importMode, semesterName.trim(), semesterStartDate)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  /** ─── 步骤1：上传文件 ─── */
  const renderUpload = () => (
    <div className="flex flex-col items-center gap-6 py-8">
      <div
        className="w-full max-w-sm border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm mb-1">点击或拖拽文件到此处上传</p>
        <p className="text-gray-400 text-xs">支持 .xlsx / .xls / .ics 格式</p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.ics" className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = '' }} />
      </div>
      <button onClick={downloadTemplate}
        className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors">
        <Download className="w-4 h-4" />下载 Excel 模板
      </button>
      {error && <div className="flex items-center gap-1.5 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
    </div>
  )

  /** ─── 步骤2：AI 识别（仅 Excel） ─── */
  const renderRecognize = () => {
    const maxCols = Math.max(...allRows.map((r) => r.length), 1)

    return (
      <div>
        <div className="text-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">AI 智能识别</h3>
          <p className="text-xs text-gray-400">
            将原始数据发送给 DeepSeek AI 分析，自动识别课表结构并解析课程
          </p>
        </div>

        {/* 原始数据预览（折叠） */}
        <details className="mb-4">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-500 select-none">
            查看原始数据（共 {allRows.length} 行，{maxCols} 列）
          </summary>
          <div className="overflow-x-auto rounded-lg border border-gray-200 mt-1 max-h-64">
            <table className="text-[10px] w-full">
              <tbody>
                {allRows.map((row, ri) => (
                  <tr key={ri} className={ri === 0 ? 'bg-gray-50 font-medium' : ''}>
                    <td className="px-2 py-1 text-gray-400 text-center border-r border-gray-100 w-8">{ri + 1}</td>
                    {Array.from({ length: maxCols }, (_, ci) => (
                      <td key={ci} className="px-2 py-1 text-gray-600 whitespace-nowrap border-r border-gray-50">{row[ci] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* 错误提示 */}
        {error && <div className="flex items-center gap-1.5 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        {aiError && <div className="flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{aiError}</div>}

        {/* AI 识别按钮 */}
        {aiCourses.length === 0 && (
          <div className="text-center py-4">
            <button
              onClick={handleAiRecognize}
              disabled={aiLoading}
              className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium transition-all ${
                aiLoading
                  ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-200 active:scale-95'
              }`}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 正在分析中……
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  AI 智能识别
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              {aiLoading ? '请稍候，正在将数据发送至 DeepSeek 分析' : '点击后将原始课表数据发送至 DeepSeek AI 进行智能解析'}
            </p>
          </div>
        )}

        {/* 识别结果 */}
        {aiCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h4 className="text-sm font-medium text-gray-700">
                识别成功，共 {aiCourses.length} 门课程
              </h4>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-64 mb-4">
              <table className="text-xs w-full">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">课程名</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">教师</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">地点</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">星期</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">节次</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">周次</th>
                  </tr>
                </thead>
                <tbody>
                  {aiCourses.map((c, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-3 py-1.5 text-gray-800 font-medium">{c.name}</td>
                      <td className="px-3 py-1.5 text-gray-500">{c.teacher || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{c.location || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-500">{getDayName(c.dayOfWeek)}</td>
                      <td className="px-3 py-1.5 text-gray-500">
                        {c.startPeriod === c.endPeriod ? `第${c.startPeriod}节` : `${c.startPeriod}-${c.endPeriod}节`}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500">{formatWeekLabel(c.weekType, c.weekStart, c.weekEnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button onClick={() => { setStep('upload'); setFileType(null); setAllRows([]); setAiCourses([]); setError('') }}
                className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" />重新上传
              </button>
              <button onClick={handleToPreview}
                className="flex items-center gap-1 px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                确认，下一步 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /** ─── 步骤3：确认导入 ─── */
  const renderPreview = () => (
    <div>
      <h4 className="text-sm font-medium text-gray-600 mb-2">解析结果（{parsedCourses.length} 门课程），请核对</h4>
      <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-64">
        <table className="text-xs w-full">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">课程名</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">教师</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">地点</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">星期</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">节次</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">周次</th>
            </tr>
          </thead>
          <tbody>
            {parsedCourses.map((c, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-3 py-1.5 text-gray-800 font-medium">{c.name}</td>
                <td className="px-3 py-1.5 text-gray-500">{c.teacher || '-'}</td>
                <td className="px-3 py-1.5 text-gray-500">{c.location || '-'}</td>
                <td className="px-3 py-1.5 text-gray-500">{getDayName(c.dayOfWeek)}</td>
                <td className="px-3 py-1.5 text-gray-500">
                  {c.startPeriod === c.endPeriod ? `第${c.startPeriod}节` : `${c.startPeriod}-${c.endPeriod}节`}
                </td>
                <td className="px-3 py-1.5 text-gray-500">{formatWeekLabel(c.weekType, c.weekStart, c.weekEnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">学期名称</label>
          <input type="text" value={semesterName} onChange={(e) => setSemesterName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="例如：2024-2025学年第一学期" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">学期开始日期（用来计算教学周）</label>
          <input type="date" value={semesterStartDate} onChange={(e) => setSemesterStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">导入方式</label>
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
              importMode === 'new' ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
              <input type="radio" name="importMode" value="new" checked={importMode === 'new'} onChange={() => setImportMode('new')} className="sr-only" />
              新增为一个学期
            </label>
            <label className={`flex-1 flex items-center justify-center px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
              importMode === 'replace' ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
              <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="sr-only" />
              替换当前学期课表
            </label>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-1.5 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      <div className="flex justify-between mt-5">
        <button onClick={() => {
          if (fileType === 'excel') { setStep('recognize'); setError('') }
          else { setStep('upload'); setError('') }
        }} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />上一步
        </button>
        <button onClick={handleImport}
          className="flex items-center gap-1 px-5 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
          <Check className="w-4 h-4" />确认导入
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
        {(['upload', 'recognize', 'preview'] as const).map((s, i) => {
          const labels = ['上传', 'AI 识别', '确认']
          const icons = [<Upload className="w-3.5 h-3.5" />, <Brain className="w-3.5 h-3.5" />, <Check className="w-3.5 h-3.5" />]
          const active = step === s || (s === 'preview' && fileType === 'ics' && i === 2)
          const done = step === 'preview' && i < 2

          // ICS 跳过 AI 识别步骤
          if (fileType === 'ics' && s === 'recognize') return null

          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                active ? 'bg-purple-500 text-white' :
                done ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {icons[i]}
              </div>
              <span className={`text-[10px] ${active ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>{labels[i]}</span>
              {i < 2 && !(fileType === 'ics' && i >= 1) && <div className="w-4 h-px bg-gray-200" />}
            </div>
          )
        })}
      </div>

      {step === 'upload' && renderUpload()}
      {step === 'recognize' && fileType === 'excel' && renderRecognize()}
      {step === 'preview' && renderPreview()}
    </div>
  )
}
