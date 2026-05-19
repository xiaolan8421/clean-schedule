import { useState, useEffect } from 'react'
import { X, Key, ExternalLink } from 'lucide-react'
import type { AppSettings } from '../utils/settings'

interface SettingsModalProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
  onClose: () => void
}

/**
 * 设置弹窗
 * 目前用于配置 DeepSeek API Key
 */
export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(settings.deepseekApiKey)

  useEffect(() => {
    setApiKey(settings.deepseekApiKey)
  }, [settings])

  const handleSave = () => {
    onSave({ deepseekApiKey: apiKey.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">设置</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* DeepSeek API Key */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Key className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">DeepSeek API Key</span>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              用于 AI 智能识别课表。在{' '}
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-0.5"
              >
                platform.deepseek.com <ExternalLink className="w-3 h-3" />
              </a>
              {' '}注册获取。Key 仅存在你的浏览器本地，不会上传到任何服务器。
            </p>
          </div>

          {/* 说明 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p><strong>AI 识别模式：</strong>上传 Excel 后点击「AI 智能识别」，将表头+前15行数据发送给 DeepSeek 分析，返回结构化课表。</p>
            <p><strong>本地模式（兜底）：</strong>不填 Key 或 AI 出错时，自动使用本地规则匹配，无需联网。</p>
            <p><strong>离线查看：</strong>无论哪种方式导入，课表数据都存在本地，之后查看完全离线。</p>
            <p className="text-gray-400 mt-1">DeepSeek API 费用极低（百万 token 约 ¥1-2），单次识别约消耗 0.001 元。</p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
