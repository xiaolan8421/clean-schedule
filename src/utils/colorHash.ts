/**
 * 根据课程名称哈希生成柔和的 HSL 背景色
 * 色相由课程名决定，饱和度和亮度固定以确保柔和、可读
 * @param name - 课程名称
 * @returns CSS HSL 颜色字符串，如 "hsl(120, 65%, 88%)"
 */
export function getCourseColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 65%, 88%)`
}

/**
 * 计算课程名称哈希对应的稍深颜色（用于边框或强调）
 * @param name - 课程名称
 * @returns CSS HSL 颜色字符串
 */
export function getCourseBorderColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 50%, 75%)`
}
