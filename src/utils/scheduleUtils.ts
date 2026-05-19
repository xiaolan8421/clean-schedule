import type { Semester } from '../types'

/**
 * 根据节次计算上课时间范围
 * 每天 8:00 开始，每节 45 分钟，课间 5 分钟
 * @param period - 节次编号 (1-12)
 * @returns 包含起止小时和分钟的对象
 */
export function getPeriodTime(period: number): {
  startHour: number
  startMin: number
  endHour: number
  endMin: number
} {
  const startMinutes = 8 * 60 + (period - 1) * 50
  const endMinutes = startMinutes + 45
  return {
    startHour: Math.floor(startMinutes / 60),
    startMin: startMinutes % 60,
    endHour: Math.floor(endMinutes / 60),
    endMin: endMinutes % 60,
  }
}

/**
 * 计算给定日期属于学期的第几教学周
 * 包含学期开始日期的周为第 1 周，周一到周日为完整周
 * @param date - 目标日期
 * @param semesterStartDate - 学期第一天 (YYYY-MM-DD)
 * @returns 教学周编号 (从 1 开始)
 */
export function getTeachingWeek(date: Date, semesterStartDate: string): number {
  const start = new Date(semesterStartDate + 'T00:00:00')
  const startDay = start.getDay()
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay
  const firstMonday = new Date(start)
  firstMonday.setDate(start.getDate() + mondayOffset)
  firstMonday.setHours(0, 0, 0, 0)

  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffMs = target.getTime() - firstMonday.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

/**
 * 获取当前日期所属的教学周
 * @param semesterStartDate - 学期第一天
 * @returns 教学周编号，至少为 1
 */
export function getCurrentWeekNumber(semesterStartDate: string): number {
  const week = getTeachingWeek(new Date(), semesterStartDate)
  return Math.max(1, week)
}

/**
 * 判断教学周是否为奇数周
 * @param weekNumber - 教学周编号
 */
export function isOddWeek(weekNumber: number): boolean {
  return weekNumber % 2 === 1
}

/**
 * 根据教学周和课程周类型判断课程是否应显示
 * 支持 all / odd / even / range 四种类型
 * @param courseWeekType - 课程的周类型
 * @param currentWeek - 当前教学周
 * @param weekStart - 起止周起始（range 时有效）
 * @param weekEnd - 起止周结束（range 时有效）
 * @returns 是否显示
 */
export function shouldShowCourse(
  courseWeekType: 'all' | 'odd' | 'even' | 'range',
  currentWeek: number,
  weekStart?: number,
  weekEnd?: number
): boolean {
  if (courseWeekType === 'all') return true
  if (courseWeekType === 'odd') return isOddWeek(currentWeek)
  if (courseWeekType === 'even') return !isOddWeek(currentWeek)
  // range: 在指定起止周范围内显示
  if (courseWeekType === 'range') {
    const start = weekStart ?? 1
    const end = weekEnd ?? 20
    return currentWeek >= start && currentWeek <= end
  }
  return true
}

/**
 * 格式化课程的周次显示文本
 * @param weekType - 周类型
 * @param weekStart - 起止周起始
 * @param weekEnd - 起止周结束
 * @returns 显示文本，如 "全周" / "单周" / "双周" / "1-8周"
 */
export function formatWeekLabel(
  weekType: 'all' | 'odd' | 'even' | 'range',
  weekStart?: number,
  weekEnd?: number
): string {
  switch (weekType) {
    case 'all': return '全周'
    case 'odd': return '单周'
    case 'even': return '双周'
    case 'range': return `${weekStart ?? '?'}-${weekEnd ?? '?'}周`
  }
}

/**
 * 获取当前时间对应的上课信息
 * 如果当前不在上课时间或不在周一到周六，返回 null
 * @returns 星期和节次，或 null
 */
export function getCurrentDayAndPeriod(): {
  dayOfWeek: number
  period: number
} | null {
  const now = new Date()
  const dayOfWeek = now.getDay()
  if (dayOfWeek === 0) return null

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (let period = 1; period <= 12; period++) {
    const time = getPeriodTime(period)
    const startMin = time.startHour * 60 + time.startMin
    const endMin = time.endHour * 60 + time.endMin

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      return { dayOfWeek, period }
    }
  }

  return null
}

/**
 * 格式化节次时间范围为字符串
 * @param startPeriod - 起始节次
 * @param endPeriod - 结束节次
 * @returns 格式化的时间字符串，如 "08:00-10:25"
 */
export function formatPeriodTimeRange(
  startPeriod: number,
  endPeriod: number
): string {
  const start = getPeriodTime(startPeriod)
  const end = getPeriodTime(endPeriod)
  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return `${fmt(start.startHour, start.startMin)}-${fmt(end.endHour, end.endMin)}`
}

/**
 * 将星期编号转换为中文名称
 * @param day - 星期编号 (1-7)
 * @returns 中文星期名
 */
export function getDayName(day: number): string {
  const names = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return names[day] || ''
}

/**
 * 智能解析节次字符串
 * 支持格式: "3-4", "3,4", "第3-4节", "3～4", "3、4"
 * @param input - 节次字符串
 * @returns 包含 startPeriod 和 endPeriod 的对象
 */
export function parsePeriods(input: string): {
  startPeriod: number
  endPeriod: number
} {
  const cleaned = input.replace(/第|节/g, '').trim()
  const match = cleaned.match(/(\d+)\s*[-～~,、]\s*(\d+)/)
  if (match) {
    const a = parseInt(match[1], 10)
    const b = parseInt(match[2], 10)
    return {
      startPeriod: Math.min(a, b),
      endPeriod: Math.max(a, b),
    }
  }
  const singleMatch = cleaned.match(/(\d+)/)
  if (singleMatch) {
    const period = parseInt(singleMatch[1], 10)
    return { startPeriod: period, endPeriod: period }
  }
  return { startPeriod: 1, endPeriod: 1 }
}

/**
 * 智能解析星期字符串
 * 支持格式: "周一", "Monday", "Mon", "1", "星期1"
 * @param input - 星期字符串
 * @returns 星期编号 (1-7)
 */
export function parseDayOfWeek(input: string): number {
  const cleaned = input.trim()

  const cnMap: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7,
  }
  const cnMatch = cleaned.match(/周\s*([一二三四五六日天])/)
  if (cnMatch) return cnMap[cnMatch[1]]
  const cnMatch2 = cleaned.match(/星期\s*([一二三四五六日天])/)
  if (cnMatch2) return cnMap[cnMatch2[1]]

  const enMap: Record<string, number> = {
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
    sunday: 7, sun: 7,
  }
  const lower = cleaned.toLowerCase()
  if (enMap[lower]) return enMap[lower]

  const num = parseInt(cleaned, 10)
  if (num >= 1 && num <= 7) return num

  return 1
}

/**
 * 智能解析周次字符串
 * 支持格式: "单周", "双周", "全周", "每周", "1-16周", "1-8周", "9-16周", "奇数周", "偶数周"
 * 数字范围会自动识别为 'range' 类型
 * @param input - 周次字符串
 * @returns weekType（'range' 表示有具体起止周）
 */
export function parseWeekType(input: string): 'all' | 'odd' | 'even' | 'range' {
  const cleaned = input.trim()
  // 先检测数字范围（如 "1-8周", "9-16周", "1~16"）
  if (/^\d{1,2}\s*[-～~]\s*\d{1,2}\s*周?$/.test(cleaned)) return 'range'
  if (/单|odd|奇数/i.test(cleaned)) return 'odd'
  if (/双|even|偶数/i.test(cleaned)) return 'even'
  return 'all'
}

/**
 * 从周次字符串中解析起止周数字
 * 支持 "1-8周", "9-16", "1~16周" 等格式
 * @param input - 周次字符串
 * @returns { weekStart, weekEnd }，解析失败返回 null
 */
export function parseWeekRange(input: string): { weekStart: number; weekEnd: number } | null {
  const cleaned = input.trim().replace(/周/g, '')
  const match = cleaned.match(/(\d{1,2})\s*[-～~]\s*(\d{1,2})/)
  if (match) {
    const a = parseInt(match[1], 10)
    const b = parseInt(match[2], 10)
    return {
      weekStart: Math.min(a, b),
      weekEnd: Math.max(a, b),
    }
  }
  return null
}

/**
 * 聚合解析周次信息：一次调用同时返回 weekType 和可选的起止周
 * 这是导入时推荐使用的函数
 * @param input - 周次字符串
 */
export function parseWeekInfo(input: string): {
  weekType: 'all' | 'odd' | 'even' | 'range'
  weekStart?: number
  weekEnd?: number
} {
  const weekType = parseWeekType(input)
  if (weekType === 'range') {
    const range = parseWeekRange(input)
    return {
      weekType: 'range',
      weekStart: range?.weekStart,
      weekEnd: range?.weekEnd,
    }
  }
  return { weekType }
}

/**
 * 生成唯一 ID
 * @returns 唯一标识字符串
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

/**
 * 从 localStorage 加载所有学期数据
 * @returns 学期数组
 */
export function loadSchedules(): Semester[] {
  try {
    const raw = localStorage.getItem('schedules')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * 保存学期数据到 localStorage
 * @param schedules - 学期数组
 */
export function saveSchedules(schedules: Semester[]): void {
  localStorage.setItem('schedules', JSON.stringify(schedules))
}
