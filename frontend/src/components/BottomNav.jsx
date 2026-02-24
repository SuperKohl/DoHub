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

export default function BottomNav() {
  const { lang } = useApp()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-bg2 border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-accent' : 'text-[#55556a]'
              }`
            }>
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-accent/10' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold tracking-wide">{t(lang, key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
