/**
 * 莫兰迪色系课程配色 — 6组固定低饱和度色对
 * 每门课根据名称哈希固定选一组，颜色始终一致
 */
const PALETTE = [
  { bg: '#EBF4FF', text: '#2B6CB0', border: '#90C5F0' }, // 淡蓝
  { bg: '#F3E8FF', text: '#6B46C1', border: '#C4A5F0' }, // 淡紫
  { bg: '#E6FFFA', text: '#234E52', border: '#81C8C0' }, // 薄荷绿
  { bg: '#FEF9E7', text: '#744210', border: '#E8C876' }, // 暖黄
  { bg: '#FFE4E6', text: '#9B2C2C', border: '#F0A5A5' }, // 淡玫瑰
  { bg: '#F1F5F9', text: '#334155', border: '#C0CCDA' }, // 灰蓝
] as const

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export interface CoursePalette {
  bg: string
  text: string
  border: string
}

export function getCoursePalette(name: string): CoursePalette {
  return PALETTE[hashName(name) % PALETTE.length]
}

/** @deprecated 使用 getCoursePalette 代替 */
export function getCourseColor(name: string): string {
  return getCoursePalette(name).bg
}

/** @deprecated 使用 getCoursePalette 代替 */
export function getCourseBorderColor(name: string): string {
  return getCoursePalette(name).border
}
