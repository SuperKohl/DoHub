import React, { useEffect, useState } from 'react'
import { api, createJobsSocket } from '../api'
import { useApp } from '../AppContext'
import { t } from '../i18n'
import { Panel, PanelHeader, JobStateBadge, Btn } from '../components/ui'
import { Clock, History, X } from 'lucide-react'

function JobRow({ job, onCancel, lang }) {
  const canCancel = ['pending', 'processing', 'pending_held'].includes(job.state)
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0">
      <span className="text-[11px] font-mono text-[#55556a] w-8 flex-shrink-0">#{job.id}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{job.name}</div>
        <div className="text-[10px] font-mono text-[#55556a] truncate">
          {job.printer} · {job.user}
          <span className="hidden sm:inline"> · {job.copies > 1 ? t(lang, 'copies').replace('{n}', job.copies) : t(lang, 'oneCopy')}</span>
        </div>
      </div>
      <JobStateBadge state={job.state} lang={lang} />
      {canCancel && (
        <button onClick={() => onCancel(job.id)}
          className="text-[#55556a] hover:text-err transition-colors p-1 rounded hover:bg-err/10 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function Jobs() {
  const { lang } = useApp()
  const [jobs, setJobs] = useState([])
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getJobs().then(setJobs).catch(() => {}).finally(() => setLoading(false))
    api.getHistory().then(setHistory).catch(() => {})
    const ws = createJobsSocket(({ type, data }) => { if (type === 'jobs') setJobs(data) })
    return () => ws.close()
  }, [])

  const activeJobs = jobs.filter(j => ['pending', 'processing', 'pending_held'].includes(j.state))
  const displayJobs = tab === 'active' ? activeJobs : history

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-extrabold">{t(lang, 'jobsTitle')}</h1>
          <p className="text-[12px] text-[#55556a] mt-0.5">
            {t(lang, 'jobsActive').replace('{n}', activeJobs.length)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#55556a]">
          <div className="w-1.5 h-1.5 rounded-full bg-info animate-pulse" />
          <span className="hidden sm:inline">{t(lang, 'connected')}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t(lang, 'inQueueState'), value: jobs.filter(j => j.state === 'pending').length, color: '#f5c842' },
          { label: t(lang, 'beingPrinted'), value: jobs.filter(j => j.state === 'processing').length, color: '#4488ff' },
          { label: t(lang, 'completedToday'), value: history.filter(j => j.state === 'completed').length, color: '#2ecc8a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg2 border border-border rounded-[10px] px-3 md:px-5 py-3 md:py-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-0.5 h-full" style={{ background: color }} />
            <div className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5 leading-tight">{label}</div>
            <div className="text-2xl md:text-3xl font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHeader title={t(lang, 'jobs')}>
          <div className="flex gap-1 bg-bg3 rounded-md p-0.5">
            {[['active', Clock, 'active'], ['history', History, 'history']].map(([key, Icon, labelKey]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${tab === key ? 'bg-bg4 text-[#e8e8f0] border border-border' : 'text-[#55556a] hover:text-[#8888a0]'}`}>
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{t(lang, labelKey === 'active' ? 'active' : 'history')}</span>
              </button>
            ))}
          </div>
        </PanelHeader>
        {loading ? (
          <div className="p-8 text-center text-[#55556a] text-sm">{t(lang, 'loading')}</div>
        ) : displayJobs.length === 0 ? (
          <div className="p-8 text-center text-[#55556a] text-sm">
            {tab === 'active' ? t(lang, 'noActiveJobs') : t(lang, 'noHistory')}
          </div>
        ) : displayJobs.map(j => (
          <JobRow key={j.id} job={j} onCancel={id => api.cancelJob(id).catch(e => alert(e.message))} lang={lang} />
        ))}
      </Panel>
    </div>
  )
}
