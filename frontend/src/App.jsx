import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './AppContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Printers from './pages/Printers'
import Jobs from './pages/Jobs'
import Scan from './pages/Scan'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-bg">
          <Sidebar />
          {/* Desktop: margin-left for sidebar. Mobile: padding-bottom for tab bar */}
          <main className="w-full md:ml-16 p-4 md:p-6 pb-24 md:pb-6">
            <Routes>
              <Route path="/"         element={<Dashboard />} />
              <Route path="/printers" element={<Printers />} />
              <Route path="/jobs"     element={<Jobs />} />
              <Route path="/scan"     element={<Scan />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*"         element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
