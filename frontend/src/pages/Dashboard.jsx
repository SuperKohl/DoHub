import React, { useEffect, useState } from 'react'
import { api, createJobsSocket } from '../api'
import { useApp } from '../AppContext'
import { t } from '../i18n'
import { Panel, PanelHeader, StatusBadge, JobStateBadge, PrinterIcon } from '../components/ui'

function StatCard({ label, value, sub, color = 'accent', delay = 0 }) {
  const colors = { accent: '#ff6b2b', green: '#2ecc8a', blue: '#4488ff', purple: '#9966ff' }
  return (
    <div className="bg-bg2 border border-border rounded-[10px] px-4 py-3 relative overflow-hidden hover:border-border2 transition-colors"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute top-0 left-0 w-0.5 h-full rounded-full" style={{ background: colors[color] }} />
      <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">{label}</div>
      <div className="text-2xl md:text-3xl font-extrabold leading-none">{value}</div>
      <div className="text-[10px] font-mono text-[#55556a] mt-1">{sub}</div>
    </div>
  )
}

export default function Dashboard() {
  const { lang } = useApp()
  const [printers, setPrinters] = useState([])
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    api.getPrinters().then(setPrinters).catch(() => {})
    api.getJobs().then(setJobs).catch(() => {})
    const ws = createJobsSocket(({ type, data }) => { if (type === 'jobs') setJobs(data) })
    return () => ws.close()
  }, [])

  const online = printers.filter(p => p.state !== 'stopped').length
  const airprint = printers.filter(p => p.airprint_registered || p.shared).length
  const activeJobs = jobs.filter(j => ['pending', 'processing', 'pending_held'].includes(j.state))

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-extrabold">{t(lang, 'dashboardTitle')}</h1>
          <p className="text-[12px] text-[#55556a] mt-0.5">{t(lang, 'systemOverview')}</p>
        </div>
        <div className="flex items-center gap-2 bg-bg3 border border-border rounded-full px-3 py-1.5 text-[11px] font-mono text-[#8888a0]">
          <div className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
          <span className="hidden sm:inline">CUPS · avahi</span>
          <span className="sm:hidden">OK</span>
        </div>
      </div>

      {/* Stats: 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t(lang, 'printersOnline')} value={online}
          sub={t(lang, 'ofTotal').replace('{n}', printers.length)} color="green" delay={50} />
        <StatCard label={t(lang, 'activeJobs')} value={activeJobs.length}
          sub={t(lang, 'inQueue')} color="accent" delay={100} />
        <StatCard label={t(lang, 'jobsToday')} value={jobs.length}
          sub={t(lang, 'completedPlusActive')} color="blue" delay={150} />
        <StatCard label={t(lang, 'airprintDevices')} value={airprint}
          sub={t(lang, 'printersShared')} color="purple" delay={200} />
      </div>

      {/* Printers + Jobs: stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4">
        <Panel>
          <PanelHeader title={t(lang, 'printers')} />
          {printers.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#55556a] text-sm">{t(lang, 'noPrinters')}</div>
          ) : printers.map((p) => (
            <div key={p.name} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg3 transition-colors">
              <div className="w-8 h-8 bg-bg4 border border-border rounded-lg flex items-center justify-center text-[#8888a0] flex-shrink-0">
                <PrinterIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-[10px] font-mono text-[#55556a] truncate hidden sm:block">{p.uri}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {(p.airprint_registered || p.shared) && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-info/10 text-info border border-info/20">AirPrint</span>
                )}
              </div>
              <StatusBadge state={p.state} lang={lang} />
            </div>
          ))}
        </Panel>

        <Panel>
          <PanelHeader title={t(lang, 'activeJobs')}>
            <span className="text-[10px] font-mono text-[#55556a] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />{t(lang, 'liveLabel')}
            </span>
          </PanelHeader>
          {activeJobs.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#55556a] text-sm">{t(lang, 'noJobsActive')}</div>
          ) : activeJobs.slice(0, 5).map((j, i) => (
            <div key={j.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
              <span className="text-[11px] font-mono text-[#55556a] w-5">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{j.name}</div>
                <div className="text-[10px] font-mono text-[#55556a] truncate">{j.printer}</div>
              </div>
              <JobStateBadge state={j.state} lang={lang} />
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}
