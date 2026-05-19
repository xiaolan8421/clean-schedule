import LZString from 'lz-string'
import type { Semester } from '../types'
import { getPeriodTime } from './scheduleUtils'

/**
 * 将学期数据压缩为 URL 安全的字符串
 * 使用 lz-string 压缩后编码，可直接拼接到 URL 参数中
 * @param semester - 学期数据
 * @returns 压缩编码后的字符串
 */
export function compressSemester(semester: Semester): string {
  const json = JSON.stringify(semester)
  return LZString.compressToEncodedURIComponent(json)
}

/**
 * 从压缩字符串解压学期数据
 * @param compressed - URL 参数中的压缩字符串
 * @returns 学期数据，解析失败返回 null
 */
export function decompressSemester(compressed: string): Semester | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    if (!json) return null
    const data = JSON.parse(json)
    if (!data.id || !data.name || !Array.isArray(data.courses)) {
      return null
    }
    return data as Semester
  } catch {
    return null
  }
}

/**
 * 将学期课程转换为 ICS (iCalendar) 格式字符串
 * 每门课程转换为一个带 RRULE 的 VEVENT，支持每周重复和单/双周间隔
 * @param semester - 学期数据
 * @returns ICS 格式文本
 */
export function semesterToIcs(semester: Semester): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clean课表//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${semester.name}`,
  ]

  // 计算学期第一天所在周的周一日期，作为周次参照
  const semStart = new Date(semester.startDate + 'T00:00:00')
  const semStartDay = semStart.getDay()
  const mondayOffset = semStartDay === 0 ? -6 : 1 - semStartDay
  const firstMonday = new Date(semStart)
  firstMonday.setDate(semStart.getDate() + mondayOffset)

  for (const course of semester.courses) {
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    const day = dayMap[course.dayOfWeek] || 'MO'

    const startTime = getPeriodTime(course.startPeriod)
    const endTime = getPeriodTime(course.endPeriod)

    const fmtTime = (h: number, m: number) =>
      `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`

    // 计算课程第一次发生的日期
    // 全周/单双周：从学期第一周开始
    // range：从 weekStart 指定周开始
    const startWeekOffset = course.weekType === 'range' ? (course.weekStart ?? 1) - 1 : 0
    const courseDate = new Date(firstMonday)
    courseDate.setDate(firstMonday.getDate() + course.dayOfWeek - 1 + startWeekOffset * 7)

    const dateStr = courseDate
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '')

    const dtStart = `${dateStr}T${fmtTime(startTime.startHour, startTime.startMin)}`
    const dtEnd = `${dateStr}T${fmtTime(endTime.endHour, endTime.endMin)}`

    // 构建 RRULE
    let rrule = `FREQ=WEEKLY;BYDAY=${day}`
    if (course.weekType === 'odd' || course.weekType === 'even') {
      rrule += ';INTERVAL=2'
    } else if (course.weekType === 'range') {
      // 指定周范围：用 COUNT 限制重复次数
      const count = (course.weekEnd ?? 16) - (course.weekStart ?? 1) + 1
      rrule += `;COUNT=${Math.max(1, count)}`
    }

    const descParts: string[] = []
    if (course.teacher) descParts.push(`教师: ${course.teacher}`)
    const description = descParts.join('\\n')

    lines.push('BEGIN:VEVENT')
    lines.push(`SUMMARY:${course.name}`)
    if (course.location) lines.push(`LOCATION:${course.location}`)
    if (description) lines.push(`DESCRIPTION:${description}`)
    lines.push(`DTSTART:${dtStart}`)
    lines.push(`DTEND:${dtEnd}`)
    lines.push(`RRULE:${rrule}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
