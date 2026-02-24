import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, Printer, FileText, Scan, Settings } from 'lucide-react'
import { useApp } from '../AppContext'
import { t } from '../i18n'

const navItems = [
  { to: '/',         icon: LayoutGrid, key: 'dashboard' },
  { to: '/printers', icon: Printer,    key: 'printers' },
  { to: '/jobs',     icon: FileText,   key: 'jobs' },
  { to: '/scan',     icon: Scan,       key: 'scan' },
  { to: '/settings', icon: Settings,   key: 'settings' },
]

export default function Sidebar() {
  const { lang } = useApp()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 bg-bg2 border-r border-border flex-col items-center py-5 gap-1.5 z-50">
        {/* Logo */}
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center mb-4 flex-shrink-0 relative overflow-hidden">
          <span className="text-white font-extrabold text-sm tracking-tight">DH</span>
        </div>
        {navItems.slice(0, 4).map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'} title={t(lang, key)}
            className={({ isActive }) =>
              `w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 border ${
                isActive ? 'bg-accent/10 text-accent border-accent/25' : 'text-[#55556a] border-transparent hover:bg-bg3 hover:text-[#8888a0]'
              }`}>
            <Icon className="w-[18px] h-[18px]" />
          </NavLink>
        ))}
        <div className="flex-1" />
        <NavLink to="/settings" title={t(lang, 'settings')}
          className={({ isActive }) =>
            `w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 border ${
              isActive ? 'bg-accent/10 text-accent border-accent/25' : 'text-[#55556a] border-transparent hover:bg-bg3 hover:text-[#8888a0]'
            }`}>
          <Settings className="w-[18px] h-[18px]" />
        </NavLink>
      </aside>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg2/95 backdrop-blur-md border-t border-border z-50 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                isActive ? 'text-accent' : 'text-[#55556a]'
              }`}>
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-accent/15' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-bold tracking-wide">{t(lang, key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
