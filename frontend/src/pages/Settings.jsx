import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, paperless as paperlessApi } from '../api'
import { useApp } from '../AppContext'
import { t } from '../i18n'
import { Panel, PanelHeader, Btn, Toggle, Spinner } from '../components/ui'
import {
  Globe, Check, Plus, Trash2, Wifi, Radio,
  RefreshCw, ArrowUpCircle, AlertCircle,
  Eye, EyeOff, ShieldCheck, ShieldOff,
  ChevronDown, ChevronUp, Server, Printer
} from 'lucide-react'

// ── Language ──────────────────────────────────────────────────
function LanguageSection({ lang, changeLang }) {
  return (
    <Panel>
      <PanelHeader title={t(lang, 'language')}>
        <Globe className="w-3.5 h-3.5 text-[#55556a]" />
      </PanelHeader>
      <div className="p-4 flex gap-3">
        {[{ code: 'de', label: 'Deutsch', flag: '🇩🇪' }, { code: 'en', label: 'English', flag: '🇬🇧' }].map(l => (
          <button key={l.code} onClick={() => changeLang(l.code)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1 justify-center ${
              lang === l.code
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-bg3 border-border text-[#8888a0] hover:border-border2 hover:text-[#e8e8f0]'
            }`}>
            <span className="text-lg">{l.flag}</span>{l.label}
            {lang === l.code && <Check className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>
    </Panel>
  )
}

// ── System Status ─────────────────────────────────────────────
function SystemSection({ lang }) {
  const [status, setStatus] = useState(null)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateLog, setUpdateLog] = useState('')

  useEffect(() => { api.status().then(setStatus).catch(() => {}) }, [])

  async function checkUpdate() {
    setChecking(true); setUpdateInfo(null)
    try {
      const res = await fetch('/api/system/update-check')
      setUpdateInfo(await res.json())
    } catch (e) { setUpdateInfo({ error: e.message }) }
    finally { setChecking(false) }
  }

  async function doUpdate() {
    if (!confirm(lang === 'de' ? 'DoHub jetzt aktualisieren?' : 'Update DoHub now?')) return
    setUpdating(true); setUpdateLog('')
    try {
      const res = await fetch('/api/system/update', { method: 'POST' })
      const d = await res.json()
      setUpdateLog(d.log || d.message || 'OK')
    } catch (e) { setUpdateLog('Fehler: ' + e.message) }
    finally { setUpdating(false) }
  }

  const statusRows = [
    { label: 'CUPS', value: status ? (status.cups ? t(lang, 'cupsRunning') : t(lang, 'cupsStopped')) : '…', ok: status?.cups },
    { label: 'Avahi / mDNS', value: t(lang, 'active'), ok: true },
    { label: 'DoHub', value: status?.version || '1.0.0', ok: null },
  ]

  return (
    <Panel>
      <PanelHeader title={t(lang, 'systemStatus')} />
      <div className="divide-y divide-border">
        {statusRows.map(({ label, value, ok }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-[#8888a0]">{label}</span>
            <span className={`text-xs font-mono flex items-center gap-1.5 ${ok === true ? 'text-ok' : ok === false ? 'text-err' : 'text-[#8888a0]'}`}>
              {ok !== null && <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-ok' : 'bg-err'}`} />}
              {value}
            </span>
          </div>
        ))}

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Btn variant="ghost" onClick={checkUpdate} disabled={checking}>
              {checking ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {lang === 'de' ? 'Auf Updates prüfen' : 'Check for Updates'}
            </Btn>
            {updateInfo?.update_available && (
              <Btn variant="primary" onClick={doUpdate} disabled={updating}>
                {updating ? <Spinner className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                {lang === 'de' ? `Update auf v${updateInfo.latest}` : `Update to v${updateInfo.latest}`}
              </Btn>
            )}
          </div>
          {updateInfo && !updateInfo.error && (
            <div className={`text-xs rounded-lg px-3 py-2.5 flex items-start gap-2 ${
              updateInfo.update_available ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-ok/10 border border-ok/20 text-ok'
            }`}>
              {updateInfo.update_available ? <ArrowUpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <div>
                <div className="font-bold">
                  {updateInfo.update_available
                    ? (lang === 'de' ? `Update verfügbar: v${updateInfo.latest}` : `Update available: v${updateInfo.latest}`)
                    : (lang === 'de' ? 'DoHub ist aktuell' : 'DoHub is up to date')}
                </div>
                {updateInfo.notes && <div className="opacity-70 mt-1">{updateInfo.notes}</div>}
              </div>
            </div>
          )}
          {updateInfo?.error && (
            <div className="text-xs bg-err/10 border border-err/20 text-err rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {updateInfo.error}
            </div>
          )}
          {updateLog && (
            <pre className="text-[10px] font-mono bg-bg4 border border-border rounded-lg p-3 overflow-x-auto max-h-40 text-[#8888a0] whitespace-pre-wrap">
              {updateLog}
            </pre>
          )}
        </div>
      </div>
    </Panel>
  )
}

// ── AirPrint ──────────────────────────────────────────────────
function AirPrintSection({ lang }) {
  const [printers, setPrinters] = useState([])
  const [registered, setRegistered] = useState([])
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})

  const reload = useCallback(async () => {
    const [p, r] = await Promise.all([
      api.getPrinters().catch(() => []),
      api.getAirPrintRegistered().then(r => r.registered).catch(() => []),
    ])
    setPrinters(p); setRegistered(r)
  }, [])

  useEffect(() => { reload() }, [reload])

  const isReg = (p) =>
    registered.includes(p.airprint_display_name || p.name) ||
    registered.includes(p.name)

  async function toggle(p) {
    setLoading(l => ({ ...l, [p.name]: true }))
    setErrors(e => ({ ...e, [p.name]: '' }))
    try {
      if (isReg(p)) {
        try { await api.unregisterAirPrint(p.airprint_display_name || p.name) } catch {}
        try { await api.unregisterAirPrint(p.name) } catch {}
      } else {
        await api.registerAirPrint({
          printer_name: p.airprint_display_name || p.name,
          cups_printer_name: p.name,
          color: p.color ?? true,
          duplex: p.duplex ?? false,
        })
      }
      await reload()
    } catch (e) {
      setErrors(err => ({ ...err, [p.name]: e.message }))
    } finally {
      setLoading(l => ({ ...l, [p.name]: false }))
    }
  }

  return (
    <Panel>
      <PanelHeader title={t(lang, 'airprintManagement')}>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#55556a]">
          <Radio className="w-3.5 h-3.5 text-info" />
          {t(lang, 'registered').replace('{n}', registered.length)}
        </div>
      </PanelHeader>
      {printers.length === 0 ? (
        <div className="px-5 py-6 text-sm text-[#55556a] flex items-center gap-2">
          <Printer className="w-4 h-4" />
          {t(lang, 'noPrintersConfigured')} — <Link to="/printers" className="text-accent hover:underline">{t(lang, 'addPrinter')}</Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {printers.map(p => (
            <div key={p.name} className="px-5 py-3.5">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  {p.airprint_display_name && p.airprint_display_name !== p.name && (
                    <div className="text-[10px] text-info font-mono flex items-center gap-1">
                      <Wifi className="w-3 h-3 flex-shrink-0" />{p.airprint_display_name}
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-[#55556a] truncate">{p.make_model || p.uri}</div>
                </div>
                {loading[p.name]
                  ? <Spinner className="w-4 h-4 text-accent" />
                  : <Toggle value={isReg(p)} onChange={() => toggle(p)} />}
              </div>
              {errors[p.name] && (
                <div className="mt-2 text-[11px] text-err bg-err/10 border border-err/20 rounded px-3 py-1.5 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {errors[p.name]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

// ── Paperless Form ────────────────────────────────────────────
function PaperlessForm({ lang, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [authType, setAuthType] = useState('apikey')
  const [apiKey, setApiKey] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [verifySsl, setVerifySsl] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  async function testConn() {
    setTesting(true); setTestResult(null)
    try {
      const r = await paperlessApi.testConnection(url, authType, apiKey, username, password, verifySsl)
      setTestResult({ ok: true, version: r.version })
    } catch (e) { setTestResult({ error: e.message }) }
    finally { setTesting(false) }
  }

  const canAdd = name && url && (authType === 'apikey' ? apiKey : (username && password))
  const canTest = url && (authType === 'apikey' ? apiKey : (username && password))

  return (
    <div className="border border-accent/20 rounded-xl overflow-hidden bg-bg3">
      <div className="px-5 py-3 bg-accent/5 border-b border-accent/20 flex items-center justify-between">
        <span className="text-sm font-bold text-accent">
          {lang === 'de' ? '+ Neue Instanz' : '+ New Instance'}
        </span>
        <button onClick={onClose} className="text-[#55556a] hover:text-[#e8e8f0] w-6 h-6 flex items-center justify-center">✕</button>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">
              {lang === 'de' ? 'Bezeichnung' : 'Label'}
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Heimserver"
              className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors" />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">URL</div>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://paperless.example.com"
              className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors" />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">
            {lang === 'de' ? 'Authentifizierung' : 'Authentication'}
          </div>
          <div className="flex gap-1 bg-bg2 rounded-lg p-1 mb-3">
            {[['apikey', 'API-Key/Token'], ['basic', lang === 'de' ? 'Benutzer & Passwort' : 'Username & Password']].map(([val, label]) => (
              <button key={val} onClick={() => setAuthType(val)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${authType === val ? 'bg-bg4 text-[#e8e8f0] border border-border' : 'text-[#55556a] hover:text-[#8888a0]'}`}>
                {label}
              </button>
            ))}
          </div>

          {authType === 'apikey' ? (
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder={lang === 'de' ? 'Token aus Paperless → Einstellungen → API-Token' : 'Token from Paperless → Settings → API Token'}
                className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 pr-10 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-[#55556a] hover:text-[#8888a0]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder={lang === 'de' ? 'Benutzername' : 'Username'}
                className="bg-bg2 border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors" />
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'de' ? 'Passwort' : 'Password'}
                  className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 pr-10 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-[#55556a] hover:text-[#8888a0]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {verifySsl ? <ShieldCheck className="w-4 h-4 text-ok" /> : <ShieldOff className="w-4 h-4 text-warn" />}
            <div>
              <div className="text-sm">{lang === 'de' ? 'SSL-Zertifikat prüfen' : 'Verify SSL certificate'}</div>
              {!verifySsl && <div className="text-[10px] text-warn">{lang === 'de' ? 'Deaktivieren für self-signed Zertifikate' : 'Disable for self-signed certificates'}</div>}
            </div>
          </div>
          <Toggle value={verifySsl} onChange={setVerifySsl} />
        </div>

        {testResult?.ok && (
          <div className="text-xs bg-ok/10 border border-ok/20 text-ok rounded-lg px-3 py-2 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {t(lang, 'connectionOk')}{testResult.version !== '?' ? ` — Paperless v${testResult.version}` : ''}
          </div>
        )}
        {testResult?.error && (
          <div className="text-xs bg-err/10 border border-err/20 text-err rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{testResult.error}
          </div>
        )}

        <div className="flex gap-3">
          <Btn variant="ghost" onClick={testConn} disabled={testing || !canTest}>
            {testing ? <Spinner className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
            {t(lang, 'testConnection')}
          </Btn>
          <div className="flex-1" />
          <Btn variant="ghost" onClick={onClose}>{t(lang, 'cancel')}</Btn>
          <Btn variant="primary" onClick={() => {
            if (!canAdd) return
            onAdd({ name, url: url.replace(/\/$/, ''), authType, apiKey, username, password, verifySsl })
          }} disabled={!canAdd}>
            <Plus className="w-3.5 h-3.5" /> {t(lang, 'add')}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Paperless Section ─────────────────────────────────────────
function PaperlessSection({ lang, instances, onAdd, onRemove }) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [testingId, setTestingId] = useState(null)
  const [testResults, setTestResults] = useState({})

  async function testInst(inst) {
    setTestingId(inst.id)
    try {
      await paperlessApi.testConnection(inst.url, inst.authType || 'apikey', inst.apiKey || '', inst.username || '', inst.password || '', inst.verifySsl !== false)
      setTestResults(r => ({ ...r, [inst.id]: 'ok' }))
    } catch (e) {
      setTestResults(r => ({ ...r, [inst.id]: e.message }))
    } finally { setTestingId(null) }
  }

  return (
    <Panel>
      <PanelHeader title={t(lang, 'paperlessIntegration')}>
        {!showForm && (
          <Btn variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> {t(lang, 'addPaperlessInstance')}
          </Btn>
        )}
      </PanelHeader>

      <div className="p-4 flex flex-col gap-3">
        {showForm && (
          <PaperlessForm lang={lang}
            onAdd={inst => { onAdd(inst); setShowForm(false) }}
            onClose={() => setShowForm(false)} />
        )}

        {!showForm && instances.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-3 text-[#55556a]">
            <Server className="w-10 h-10 opacity-30" />
            <div className="text-sm">{t(lang, 'noPaperlessInstances')}</div>
            <Btn variant="ghost" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> {t(lang, 'addPaperlessInstance')}
            </Btn>
          </div>
        )}

        {instances.map(inst => (
          <div key={inst.id} className="border border-border rounded-xl overflow-hidden">
            <div onClick={() => setExpanded(expanded === inst.id ? null : inst.id)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg3 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-ok/10 border border-ok/20 flex items-center justify-center text-lg flex-shrink-0">📄</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{inst.name}</div>
                <div className="text-[10px] font-mono text-[#55556a] truncate">{inst.url}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-[#55556a] hidden sm:block">
                  {inst.authType === 'basic' ? '👤 User/PW' : '🔑 Token'}
                </span>
                {testResults[inst.id] === 'ok' && <Check className="w-4 h-4 text-ok" />}
                {testResults[inst.id] && testResults[inst.id] !== 'ok' && <AlertCircle className="w-4 h-4 text-err" />}
                {expanded === inst.id ? <ChevronUp className="w-4 h-4 text-[#55556a]" /> : <ChevronDown className="w-4 h-4 text-[#55556a]" />}
              </div>
            </div>

            {expanded === inst.id && (
              <div className="px-4 py-3 border-t border-border bg-bg3 flex flex-col gap-3">
                <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-xs">
                  <span className="text-[#55556a]">URL</span><span className="font-mono text-[#8888a0] truncate">{inst.url}</span>
                  <span className="text-[#55556a]">Auth</span><span className="font-mono text-[#8888a0]">{inst.authType === 'basic' ? (lang === 'de' ? 'Benutzername/PW' : 'Username/PW') : 'API-Key/Token'}</span>
                  <span className="text-[#55556a]">SSL</span>
                  <span className={`font-mono ${inst.verifySsl === false ? 'text-warn' : 'text-ok'}`}>
                    {inst.verifySsl === false ? (lang === 'de' ? 'Ignoriert' : 'Ignored') : (lang === 'de' ? 'Verifiziert' : 'Verified')}
                  </span>
                </div>
                {testResults[inst.id] && testResults[inst.id] !== 'ok' && (
                  <div className="text-err text-xs bg-err/10 border border-err/20 rounded px-3 py-2 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{testResults[inst.id]}
                  </div>
                )}
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => testInst(inst)} disabled={testingId === inst.id}>
                    {testingId === inst.id ? <Spinner className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
                    {t(lang, 'testConnection')}
                  </Btn>
                  <div className="flex-1" />
                  <Btn variant="danger" onClick={() => {
                    if (confirm(t(lang, 'confirmDeleteInstance').replace('{name}', inst.name))) {
                      onRemove(inst.id)
                      setExpanded(null)
                    }
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t(lang, 'deleteInstance')}</span>
                  </Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function Settings() {
  const { lang, changeLang, paperlessInstances, addPaperlessInstance, removePaperlessInstance } = useApp()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg md:text-xl font-extrabold">{t(lang, 'settingsTitle')}</h1>
        <p className="text-[12px] text-[#55556a] mt-0.5">{t(lang, 'cupsAndSystem')}</p>
      </div>

      {/* Desktop: 2-column grid. Mobile: single column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <LanguageSection lang={lang} changeLang={changeLang} />
          <SystemSection lang={lang} />
          <AirPrintSection lang={lang} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <PaperlessSection
            lang={lang}
            instances={paperlessInstances}
            onAdd={addPaperlessInstance}
            onRemove={removePaperlessInstance}
          />
        </div>
      </div>
    </div>
  )
}
