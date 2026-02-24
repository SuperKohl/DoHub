import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, Printer, FileText, Scan, Settings } from 'lucide-react'
import { useApp } from '../AppContext'
import { t } from '../i18n'

export default function MobileNav() {
  const { lang } = useApp()
  const items = [
    { to: '/',         icon: LayoutGrid, key: 'dashboard' },
    { to: '/printers', icon: Printer,    key: 'printers' },
    { to: '/jobs',     icon: FileText,   key: 'jobs' },
    { to: '/scan',     icon: Scan,       key: 'scan' },
    { to: '/settings', icon: Settings,   key: 'settings' },
  ]
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg2 border-t border-border safe-area-bottom">
      <div className="flex items-stretch h-16">
        {items.map(({ to, icon: Icon, key }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-accent' : 'text-[#55556a]'
              }`}>
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide uppercase">{t(lang, key)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
