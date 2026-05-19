import type { Course } from '../types'
import { generateId } from './scheduleUtils'

/**
 * 调用 DeepSeek Chat API 进行课表识别（纯 AI 模式）
 * 将原始 Excel 行全部发给 AI，由 AI 自行理解表结构并解析课程
 * @param allRows - Excel 所有行（含表头、标题等）
 * @param apiKey - DeepSeek API Key
 * @returns 解析后的 Course 数组，失败抛错
 */
export async function aiRecognizeSchedule(
  allRows: string[][],
  apiKey: string
): Promise<Course[]> {
  const prompt = buildPrompt(allRows)

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个精确的课表数据解析器。只返回 JSON，不说任何其他话。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 8192,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    if (response.status === 401) {
      throw new Error('API Key 无效，请在设置中检查')
    }
    if (response.status === 402) {
      throw new Error('DeepSeek 账户余额不足，请充值')
    }
    throw new Error(`API 请求失败 (${response.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content || ''

  const jsonStr = extractJson(content)
  if (!jsonStr) {
    throw new Error('AI 返回格式异常，无法提取 JSON，请重试')
  }

  let parsed: any
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('AI 返回的 JSON 解析失败，请重试')
  }

  const coursesRaw = parsed.courses || parsed
  if (!Array.isArray(coursesRaw) || coursesRaw.length === 0) {
    throw new Error('AI 未识别到任何课程，请检查课表格式')
  }

  const courses: Course[] = []
  for (const c of coursesRaw) {
    if (!c.name) continue

    const dayOfWeek = normalizeNumber(c.dayOfWeek, 1, 7, 1)
    const startPeriod = normalizeNumber(c.startPeriod, 1, 12, 1)
    const endPeriod = normalizeNumber(c.endPeriod || c.startPeriod, 1, 12, startPeriod)
    const weekType = normalizeWeekType(c.weekType)

    courses.push({
      id: generateId(),
      name: String(c.name).trim(),
      teacher: c.teacher ? String(c.teacher).trim() : undefined,
      location: c.location ? String(c.location).trim() : undefined,
      dayOfWeek,
      startPeriod,
      endPeriod,
      weekType: weekType as Course['weekType'],
      weekStart: weekType === 'range' ? normalizeNumber(c.weekStart, 1, 30, undefined) : undefined,
      weekEnd: weekType === 'range' ? normalizeNumber(c.weekEnd, 1, 30, undefined) : undefined,
      semesterId: '',
    })
  }

  if (courses.length === 0) {
    throw new Error('AI 识别结果中无有效课程')
  }

  return courses
}

/**
 * 构造发给 DeepSeek 的 prompt
 * 发送全部行数据（最多 200 行），让 AI 自行理解课表结构
 */
function buildPrompt(allRows: string[][]): string {
  const rows = allRows.slice(0, 200)
  const maxCols = Math.max(...rows.map((r) => r.length), 1)

  const lines = rows.map((row) => {
    const padded = Array.from({ length: maxCols }, (_, i) => row[i] || '')
    return padded.join('\t')
  })
  const tableText = lines.join('\n')

  return `你是一个课表数据识别助手。下面是从 Excel 读取的原始课表数据（TSV 格式，共 ${rows.length} 行，${maxCols} 列）。

\`\`\`
${tableText}
\`\`\`

请分析以上数据，完成以下任务：

## 1. 理解数据结构
- 判断哪些行是表头、标题或无用行，哪些行是数据行。
- 分析每列的含义（课程名、教师、地点/教室、星期、节次、周次等）。
- 注意：列名不一定叫"课程名""教师"，可能叫"名称""授课教师""上课地点"等，请根据列中的实际内容判断。
- 可能有多个表头行（如第1行是大标题、第2行是列名），也可能完全没有表头。
- 数据中可能存在合并单元格导致的空值，请根据上下文合理推断填充。

## 2. 解析所有课程
对于每一条课程记录，提取以下字段：

| 字段 | 说明 |
|------|------|
| name | 课程名称（必填） |
| teacher | 教师姓名（没有则为空字符串） |
| location | 上课地点/教室（没有则为空字符串） |
| dayOfWeek | 星期几：周一=1 周二=2 周三=3 周四=4 周五=5 周六=6 周日=7 |
| startPeriod | 开始节次，数字 |
| endPeriod | 结束节次，数字（与开始节次相同时即单节课） |
| weekType | "all"=全周上课 / "odd"=单周 / "even"=双周 / "range"=指定周范围 |
| weekStart | weekType为"range"时的起始周（数字），否则为null |
| weekEnd | weekType为"range"时的结束周（数字），否则为null |

## 3. 格式转换规则
- **节次**："3-4节" → startPeriod=3, endPeriod=4；"第5节"→ startPeriod=5, endPeriod=5；"1,2节" → startPeriod=1, endPeriod=2
- **星期**：支持中文（周一/星期一）、英文（Mon/Monday）、数字（1-7）
- **周次**："全周"→ weekType="all"；"单周/奇数周"→ "odd"；"双周/偶数周"→ "even"；"1-8周/第1-8周"→ weekType="range", weekStart=1, weekEnd=8

## 4. 输出格式
请**只返回**以下 JSON，不要包含任何解释文字或 markdown 代码块标记：

{
  "courses": [
    {
      "name": "高等数学",
      "teacher": "张三",
      "location": "教学楼101",
      "dayOfWeek": 1,
      "startPeriod": 1,
      "endPeriod": 2,
      "weekType": "range",
      "weekStart": 1,
      "weekEnd": 16
    }
  ]
}`
}

/** 从 AI 回复中提取 JSON */
function extractJson(text: string): string | null {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlock) {
    return codeBlock[1].trim()
  }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }
  return null
}

function normalizeNumber(value: any, min: number, max: number, fallback: any): number {
  if (value === null || value === undefined) return fallback
  const n = typeof value === 'string' ? parseInt(value, 10) : value
  if (typeof n !== 'number' || isNaN(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function normalizeWeekType(value: any): string {
  if (!value) return 'all'
  const v = String(value).trim()
  if (/全|每周|all/i.test(v)) return 'all'
  if (/单|奇|odd/i.test(v)) return 'odd'
  if (/双|偶|even/i.test(v)) return 'even'
  if (/range|范围/i.test(v)) return 'range'
  return 'all'
}
