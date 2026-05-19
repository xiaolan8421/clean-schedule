import * as XLSX from 'xlsx'
import type { ExcelParseResult } from '../types'

/** 可识别的字段类型 */
export type FieldType = 'name' | 'teacher' | 'location' | 'dayOfWeek' | 'periods' | 'weekType'

/** 单列的智能分析结果 */
export interface ColumnAnalysis {
  index: number
  header: string
  samples: string[]
  scores: Record<FieldType, number>
  bestMatch: FieldType | null
  confidence: number
}

export const FIELD_LABELS: Record<FieldType, string> = {
  name: '课程名',
  teacher: '教师',
  location: '地点',
  dayOfWeek: '星期',
  periods: '节次',
  weekType: '周次',
}

/**
 * 解析 Excel 文件，返回包含所有行（含可能的标题行）的原始数据
 * 不假定第一行就是表头，由调用方配合 detectHeaderRow 使用
 */
export async function parseExcelFileRaw(
  file: File
): Promise<{ headers: string[]; rows: string[][] }> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Excel 文件中没有找到工作表')
  const sheet = workbook.Sheets[sheetName]
  const data: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(
    sheet,
    { header: 1, defval: '' }
  )
  if (data.length === 0) return { headers: [], rows: [] }
  const allRows = data.map((row) => row.map((cell) => String(cell ?? '')))
  // 返回时 headers 先留空，由外部指定
  return { headers: allRows[0] || [], rows: allRows }
}

/**
 * ─── 自动检测表头行 ───
 * 遍历前 N 行，根据每行的特征打分，找出最像表头的那一行。
 * 标题行（如"2024学年课表"）通常只有少数非空单元格、文字较长；
 * 表头行通常每列都有短文本、包含关键词；数据行内容更杂。
 *
 * @param rows - 原始所有行（包含标题、表头、数据）
 * @returns 最可能是表头的行索引（0-based），至少返回 0
 */
export function detectHeaderRow(rows: string[][]): number {
  const maxCheck = Math.min(rows.length, 10)
  let bestIdx = 0
  let bestScore = -1

  for (let i = 0; i < maxCheck; i++) {
    const row = rows[i]
    const score = scoreHeaderRow(row, i, maxCheck)
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestIdx
}

/** 给某一行打分，分数越高越像表头 */
function scoreHeaderRow(row: string[], rowIdx: number, totalRows: number): number {
  const nonEmpty = row.filter((c) => c.trim().length > 0)
  const fillRate = nonEmpty.length / Math.max(row.length, 1)

  // 几乎全空的行 → 不太可能是表头
  if (fillRate < 0.3) return 0

  // 统计每个单元格的特征
  let keywordHits = 0
  let shortTextCount = 0
  let numberCount = 0

  for (const cell of nonEmpty) {
    const v = cell.trim()
    if (v.length <= 10) shortTextCount++
    if (/^\d+$/.test(v)) numberCount++
    // 表头关键词
    if (/课程|名称|教师|老师|地点|教室|星期|节次|周次|时间|上课|任课|学分|学时|班级|专业|年级|学院|部门/.test(v)) {
      keywordHits++
    }
  }

  const shortTextRatio = shortTextCount / Math.max(nonEmpty.length, 1)
  const numberRatio = numberCount / Math.max(nonEmpty.length, 1)

  let score = 0
  // 列填充率高 → 更像表头
  score += fillRate * 30
  // 关键词命中
  score += keywordHits * 20
  // 大部分是短文本 → 像表头；大部分是数字 → 不太像表头
  score += shortTextRatio * 25
  score -= numberRatio * 20
  // 靠前的行更可能是表头（标题通常在更前面）
  if (rowIdx === 0) score += 10
  else if (rowIdx === 1) score += 15
  else if (rowIdx === 2) score += 5

  return score
}

/**
 * 从原始行中按用户选择的表头行号切分出 ExcelParseResult
 * @param allRows - 原始所有行
 * @param headerRowIndex - 用户选择的表头行号
 */
export function sliceByHeaderRow(
  allRows: string[][],
  headerRowIndex: number
): ExcelParseResult {
  const skippedRows = allRows.slice(0, headerRowIndex)
  const headers = allRows[headerRowIndex]?.map((h) => String(h)) || []
  const rows = allRows.slice(headerRowIndex + 1).filter((row) =>
    row.some((cell) => cell.trim() !== '')
  )
  return { headers, rows, headerRowIndex, skippedRows }
}

/**
 * ─── 基于单元格内容采样 + 表头关键词，智能识别列类型 ───
 */
export function analyzeColumns(
  headers: string[],
  rows: string[][],
  sampleSize = 30
): ColumnAnalysis[] {
  const effectiveRows = rows.slice(0, sampleSize)
  const nonEmptyRows = effectiveRows.filter((row) =>
    row.some((cell) => cell.trim() !== '')
  )

  return headers.map((header, colIdx) => {
    const samples = nonEmptyRows
      .map((row) => row[colIdx]?.trim() ?? '')
      .filter((v) => v.length > 0)
      .slice(0, 5)

    const scores = computeFieldScores(header, samples)

    let bestMatch: FieldType | null = null
    let bestScore = 0
    for (const [field, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score
        bestMatch = field as FieldType
      }
    }

    return {
      index: colIdx,
      header,
      samples,
      scores: scores as Record<FieldType, number>,
      bestMatch: bestScore >= 25 ? bestMatch : null,
      confidence: bestScore,
    }
  })
}

function computeFieldScores(
  header: string,
  samples: string[]
): Partial<Record<FieldType, number>> {
  const headerLower = header.toLowerCase().trim()

  const headerHits: Record<FieldType, number> = {
    name: matchHeader(headerLower, /课程|名称|课名|科目|课程名称|name|course|subject|title/),
    teacher: matchHeader(headerLower, /教师|老师|讲师|教授|任课|授课|teacher|instructor|prof|导师/),
    location: matchHeader(headerLower, /地点|教室|上课地点|位置|教学楼|location|room|place|address|where|上课教室/),
    dayOfWeek: matchHeader(headerLower, /星期|周几|周\s*$|^周$|day|weekday|^星期|上课星期|上课时间/),
    periods: matchHeader(headerLower, /节次|节数|时间|上课时间|period|^节$|节$/),
    weekType: matchHeader(headerLower, /周次|周型|单双|周类型|weektype|^周$|教学周|起止周|上课周次/),
  }

  const contentAvg = samples.length > 0 ? scoreSamples(samples) : {
    name: 0, teacher: 0, location: 0, dayOfWeek: 0, periods: 0, weekType: 0,
  }

  // 综合：表头权重 35%，内容权重 65%
  const result: Partial<Record<FieldType, number>> = {}
  for (const field of Object.keys(headerHits) as FieldType[]) {
    result[field] = Math.round(headerHits[field] * 35 + contentAvg[field] * 65)
  }
  return result
}

function matchHeader(header: string, pattern: RegExp): number {
  return pattern.test(header) ? 1 : 0
}

function scoreSamples(samples: string[]): Record<FieldType, number> {
  const totals: Record<FieldType, number> = {
    name: 0, teacher: 0, location: 0, dayOfWeek: 0, periods: 0, weekType: 0,
  }
  for (const s of samples) {
    const sv = scoreSingleValue(s)
    for (const field of Object.keys(totals) as FieldType[]) {
      totals[field] += sv[field]
    }
  }
  const n = samples.length
  const avg: Record<FieldType, number> = { name: 0, teacher: 0, location: 0, dayOfWeek: 0, periods: 0, weekType: 0 }
  for (const field of Object.keys(avg) as FieldType[]) {
    avg[field] = Math.round(totals[field] / n)
  }
  return avg
}

function scoreSingleValue(value: string): Record<FieldType, number> {
  const v = value.trim()
  if (!v) return { name: 0, teacher: 0, location: 0, dayOfWeek: 0, periods: 0, weekType: 0 }
  return {
    name: scoreAsName(v),
    teacher: scoreAsTeacher(v),
    location: scoreAsLocation(v),
    dayOfWeek: scoreAsDayOfWeek(v),
    periods: scoreAsPeriods(v),
    weekType: scoreAsWeekType(v),
  }
}

function scoreAsName(v: string): number {
  if (!/[一-鿿]/.test(v) && !/[a-zA-Z]/.test(v)) return 0
  if (v.length < 2 || v.length > 40) return 10
  const others = [scoreAsDayOfWeek(v), scoreAsPeriods(v), scoreAsWeekType(v), scoreAsTeacher(v), scoreAsLocation(v)]
  const maxOther = Math.max(...others)
  if (maxOther >= 80) return 5
  if (maxOther >= 50) return 20
  return 70
}

function scoreAsTeacher(v: string): number {
  if (/(老师|教授|讲师|助教|教师|导师|主任|辅导员)/.test(v)) return 95
  if (/^[一-鿿]{2,4}$/.test(v) && !/[课学程数语外英理化生政史地体美音计]/.test(v)) return 45
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(v)) return 60
  return 0
}

function scoreAsLocation(v: string): number {
  if (/^[A-Za-z]+\d{2,4}$/.test(v)) return 95
  if (/(教学楼|实验楼|体育馆|图书馆|教室|实验室|机房|操场|楼|厅|堂|室|馆|区|层|栋|座)/.test(v)) return 90
  if (/[A-Za-z]+\d+/.test(v)) return 65
  if (/^\d{3,4}$/.test(v)) return 45
  return 0
}

function scoreAsDayOfWeek(v: string): number {
  if (/^周[一二三四五六日天]$/.test(v)) return 95
  if (/^星期[一二三四五六日天]$/.test(v)) return 95
  if (/^(Mon(day)?|Tue(sday)?|Wed(nesday)?|Thu(rsday)?|Fri(day)?|Sat(urday)?|Sun(day)?)$/i.test(v)) return 95
  if (/^[1-7]$/.test(v)) return 80
  if (/周一|周二|周三|周四|周五|周六|周日|周天/.test(v)) return 85
  return 0
}

function scoreAsPeriods(v: string): number {
  if (/^\d{1,2}\s*[-～~]\s*\d{1,2}$/.test(v)) return 95
  if (/^第\s*\d{1,2}(\s*[-～~,、]\s*\d{1,2})?\s*节\s*$/.test(v)) return 95
  if (/^\d{1,2}$/.test(v)) {
    const n = parseInt(v, 10)
    if (n >= 1 && n <= 12) return 75
    return 20
  }
  if (/^\d{1,2}\s*[,，、]\s*\d{1,2}$/.test(v)) return 90
  return 0
}

function scoreAsWeekType(v: string): number {
  // 数字范围（如 1-8周、9-16）→ 周次类型
  if (/^\d{1,2}\s*[-～~]\s*\d{1,2}\s*周?$/.test(v)) return 95
  if (/^(全周|每周|全部|所有周|all)$/i.test(v)) return 95
  if (/^(单周|奇数周?|odd)$/i.test(v)) return 95
  if (/^(双周|偶数周?|even)$/i.test(v)) return 95
  if (/单/.test(v)) return 80
  if (/双/.test(v)) return 80
  // 单个数字可能是第几周
  if (/^第?\d{1,2}周?$/.test(v)) return 55
  return 0
}

/**
 * 生成 Excel 模板文件并触发浏览器下载
 * 模板包含表头行和 4 条示例数据（含周范围示例）
 */
export function downloadTemplate(): void {
  const headers = ['课程名', '教师', '地点', '星期', '节次', '周次']
  const ws = XLSX.utils.aoa_to_sheet([headers])
  XLSX.utils.sheet_add_aoa(
    ws,
    [
      ['高等数学', '张教授', '教学楼A101', '周一', '1-2', '全周'],
      ['大学英语', '李老师', '教学楼B202', '周二', '3-4', '1-16周'],
      ['体育', '王老师', '操场', '周三', '5-6', '单周'],
      ['计算机基础', '赵教授', '实验楼C303', '周四', '1-2', '1-8周'],
    ],
    { origin: 'A2' }
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '课表模板')
  XLSX.writeFile(wb, 'Clean课表导入模板.xlsx')
}
