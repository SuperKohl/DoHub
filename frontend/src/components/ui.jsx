import React from 'react'
import { t } from '../i18n'

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    green:  'bg-ok/10 text-ok border border-ok/20',
    yellow: 'bg-warn/10 text-warn border border-warn/20',
    red:    'bg-err/10 text-err border border-err/20',
    blue:   'bg-info/10 text-info border border-info/20',
    purple: 'bg-purple/10 text-purple border border-purple/20',
    orange: 'bg-accent/10 text-accent border border-accent/20',
    default:'bg-bg4 text-[#8888a0] border border-border',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ state, lang = 'de' }) {
  const map = {
    idle:     { key: 'online',     variant: 'green' },
    printing: { key: 'printing',   variant: 'blue' },
    stopped:  { key: 'stopped',    variant: 'yellow' },
    offline:  { key: 'offline',    variant: 'red' },
    unknown:  { key: 'unknown',    variant: 'default' },
  }
  const s = map[state] || map.unknown
  return <Badge variant={s.variant}>{t(lang, s.key)}</Badge>
}

export function JobStateBadge({ state, lang = 'de' }) {
  const map = {
    pending:    { key: 'pending',   variant: 'yellow' },
    pending_held: { key: 'pending', variant: 'yellow' },
    processing: { key: 'processing',variant: 'blue' },
    completed:  { key: 'completed', variant: 'green' },
    canceled:   { key: 'canceled',  variant: 'default' },
    aborted:    { key: 'aborted',   variant: 'red' },
  }
  const s = map[state] || { key: state, variant: 'default' }
  return <Badge variant={s.variant}>{t(lang, s.key)}</Badge>
}

export function Btn({ children, variant = 'ghost', className = '', disabled, ...props }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide cursor-pointer border transition-all duration-150 font-sans disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent text-white border-transparent hover:bg-accent2 disabled:hover:bg-accent',
    ghost:   'bg-transparent text-[#8888a0] border-border hover:bg-bg3 hover:text-[#e8e8f0] hover:border-border2',
    danger:  'bg-transparent text-err border-err/30 hover:bg-err/10',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  )
}

export function Panel({ children, className = '' }) {
  return (
    <div className={`bg-bg2 border border-border rounded-[10px] overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export function PanelHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <span className="text-[11px] font-bold tracking-widest uppercase text-[#8888a0]">{title}</span>
      {children && <div className="flex gap-2 items-center">{children}</div>}
    </div>
  )
}

export function Toggle({ value, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!value)}
      className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 border ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${value ? 'bg-accent border-accent' : 'bg-bg4 border-border2'}`}
    >
      <div className={`absolute w-3 h-3 bg-white rounded-full top-[2px] transition-transform duration-200 ${value ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
    </div>
  )
}

export function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin text-current ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  )
}

export function PrinterIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>
    </svg>
  )
}

export function Input({ label, hint, ...props }) {
  return (
    <div>
      {label && <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">{label}</div>}
      <input
        className="w-full bg-bg3 border border-border rounded-md px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors"
        {...props}
      />
      {hint && <div className="text-[10px] text-[#55556a] mt-1">{hint}</div>}
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">{label}</div>}
      <select
        className="w-full bg-bg3 border border-border rounded-md px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent transition-colors"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
