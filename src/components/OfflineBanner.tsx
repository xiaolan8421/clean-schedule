import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * 离线状态提示条
 * 监听浏览器 online/offline 事件，离线时在页面顶部显示黄色提示
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-yellow-400 text-yellow-900 text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>当前处于离线模式，已缓存的数据仍可查看</span>
    </div>
  )
}
