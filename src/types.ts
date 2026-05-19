/** 课程数据结构 */
export interface Course {
  /** 唯一 ID */
  id: string
  /** 课程名 */
  name: string
  /** 教师 */
  teacher?: string
  /** 地点 */
  location?: string
  /** 星期 1-7 (周一到周日) */
  dayOfWeek: number
  /** 起始节次 1-12 */
  startPeriod: number
  /** 结束节次 (≥ startPeriod) */
  endPeriod: number
  /**
   * 周次类型
   * - 'all': 全周（每周都有）
   * - 'odd': 单周
   * - 'even': 双周
   * - 'range': 指定起止周（如 1-8 周、9-16 周），配合 weekStart / weekEnd 使用
   */
  weekType: 'all' | 'odd' | 'even' | 'range'
  /** 起止周：起始周（weekType='range' 时有效） */
  weekStart?: number
  /** 起止周：结束周（weekType='range' 时有效） */
  weekEnd?: number
  /** 所属学期 ID */
  semesterId: string
}

/** 学期数据结构 */
export interface Semester {
  /** 唯一 ID */
  id: string
  /** 学期名称 */
  name: string
  /** 学期第一天日期 YYYY-MM-DD */
  startDate: string
  /** 该学期的所有课程 */
  courses: Course[]
}

/** Excel 列映射配置，值为 Excel 列名，空字符串表示不映射 */
export interface ExcelColumnMapping {
  name: string
  teacher: string
  location: string
  dayOfWeek: string
  periods: string
  weekType: string
}

/** Excel 解析结果 */
export interface ExcelParseResult {
  /** 表头所在行之后的数据行 */
  rows: string[][]
  /** 用户选中的表头（列名数组） */
  headers: string[]
  /** 表头所在行号（0-based，在整个文件中的行号） */
  headerRowIndex: number
  /** 表头之前被跳过的行（可用于展示） */
  skippedRows: string[][]
}

/** 导入模式 */
export type ImportMode = 'replace' | 'new'
