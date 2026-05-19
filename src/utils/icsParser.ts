import ICAL from 'ical.js'
import { getPeriodTime, generateId } from './scheduleUtils'
import type { Course } from '../types'

/**
 * 解析 .ics 文件内容，转换为 Course 数组
 * 根据 DTSTART 时间推算节次（每天 8:00 开始，每节 45 分钟，课间 5 分钟）
 * 从 DESCRIPTION 中提取教师信息（支持"教师：xxx"或"Teacher: xxx"格式）
 * @param icsContent - ICS 文件文本内容
 * @param semesterId - 所属学期 ID
 * @returns 解析出的 Course 数组
 */
export function parseIcsContent(
  icsContent: string,
  semesterId: string
): Course[] {
  const jcalData = ICAL.parse(icsContent)
  const comp = new ICAL.Component(jcalData)
  const vevents = comp.getAllSubcomponents('vevent')

  const courses: Course[] = []

  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent)
      const summary = event.summary || ''
      const location = event.location || ''
      const description = event.description || ''
      const startDate = event.startDate?.toJSDate() as Date | undefined

      if (!summary || !startDate) continue

      const dayOfWeek = startDate.getDay()
      if (dayOfWeek === 0) continue

      // 根据时间计算节次
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
      const endDate = event.endDate?.toJSDate() as Date | undefined
      const endMinutes = endDate
        ? endDate.getHours() * 60 + endDate.getMinutes()
        : startMinutes + 45

      let startPeriod = 1
      let endPeriodCalc = 1

      for (let p = 1; p <= 12; p++) {
        const time = getPeriodTime(p)
        const pStart = time.startHour * 60 + time.startMin
        const pEnd = time.endHour * 60 + time.endMin
        if (startMinutes >= pStart - 5 && startMinutes < pEnd + 5) {
          startPeriod = p
        }
        if (endMinutes > pStart && endMinutes <= pEnd + 5) {
          endPeriodCalc = p
        }
      }

      // 尝试从 description 提取教师信息
      let teacher = ''
      const teacherMatch = description.match(
        /(?:教师|老师|讲师|教授|Teacher|Instructor|Prof\.?)[：:]\s*(.+?)(?:\n|$)/i
      )
      if (teacherMatch) {
        teacher = teacherMatch[1].trim()
      }

      // 解析 RRULE 获取周次信息
      let weekType: 'all' | 'odd' | 'even' = 'all'
      const rruleStr = vevent.getFirstPropertyValue('rrule')
      if (rruleStr) {
        const intervalMatch = rruleStr.match(/INTERVAL=(\d+)/i)
        if (intervalMatch && parseInt(intervalMatch[1], 10) === 2) {
          // INTERVAL=2 表示单/双周，需要根据首次出现判断
          // 简化处理：标记为单周
          weekType = 'odd'
        }
      }

      // 也从描述中检测周次信息
      const weekDesc = description + ' ' + summary
      if (/单周|奇数/.test(weekDesc)) {
        weekType = 'odd'
      } else if (/双周|偶数/.test(weekDesc)) {
        weekType = 'even'
      }

      courses.push({
        id: generateId(),
        name: summary,
        teacher: teacher || undefined,
        location: location || undefined,
        dayOfWeek,
        startPeriod,
        endPeriod: Math.max(endPeriodCalc, startPeriod),
        weekType,
        semesterId,
      })
    } catch {
      continue
    }
  }

  return courses
}
