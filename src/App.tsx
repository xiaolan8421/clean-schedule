import { Routes, Route, Navigate } from 'react-router-dom'
import { SchedulePage } from './pages/SchedulePage'
import { ImportPage } from './pages/ImportPage'
import { ShareViewPage } from './pages/ShareViewPage'

export default function App() {
  return (
    <Routes>
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/share-view" element={<ShareViewPage />} />
      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
  )
}
