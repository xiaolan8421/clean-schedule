/** 应用设置 */
export interface AppSettings {
  /** DeepSeek API Key（用户自填，存在本地） */
  deepseekApiKey: string
}

const SETTINGS_KEY = 'clean_schedule_settings'

/** 默认设置 */
const DEFAULT_SETTINGS: AppSettings = {
  deepseekApiKey: '',
}

/** 从 localStorage 加载设置 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** 保存设置到 localStorage */
export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
