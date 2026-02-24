import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api, paperless } from '../api'
import { useApp } from '../AppContext'
import { t } from '../i18n'
import { Panel, PanelHeader, Btn, Select, Spinner } from '../components/ui'
import { ScanLine, Download, Send, Check, AlertCircle, ExternalLink, X } from 'lucide-react'

const MODES = ['Color', 'Gray', 'Lineart']
const RESOLUTIONS = [75, 150, 300, 600, 1200]
const FORMATS = ['jpeg', 'png', 'pdf']

function PaperlessModal({ open, onClose, scanBlob, scanFormat, instances, lang }) {
  const [instanceId, setInstanceId] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [correspondent, setCorrespondent] = useState('')
  const [tags, setTags] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (open) { setResult(null); setErrMsg('') }
    if (instances.length > 0 && !instanceId) setInstanceId(instances[0].id)
  }, [open, instances])

  async function send() {
    const inst = instances.find(i => i.id === instanceId)
    if (!inst || !scanBlob) return
    setSending(true); setResult(null)
    try {
      const ext = scanFormat === 'jpeg' ? 'jpg' : scanFormat
      await paperless.uploadDocument(
        inst.url, inst.authType || 'apikey', inst.apiKey || '',
        inst.username || '', inst.password || '', inst.verifySsl !== false,
        scanBlob, `scan_${Date.now()}.${ext}`,
        docTitle, correspondent, tags,
      )
      setResult('ok')
    } catch (e) { setErrMsg(e.message); setResult('error') }
    finally { setSending(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg2 border border-border2 rounded-2xl w-full sm:w-[440px] overflow-hidden animate-fadeup">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-ok/20 flex items-center justify-center">
              <Send className="w-3 h-3 text-ok" />
            </div>
            <span className="text-sm font-bold">{t(lang, 'sendToPaperless')}</span>
          </div>
          <button onClick={onClose} className="text-[#55556a] hover:text-[#e8e8f0]"><X className="w-5 h-5" /></button>
        </div>

        {result === 'ok' ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-ok/15 flex items-center justify-center">
              <Check className="w-7 h-7 text-ok" />
            </div>
            <div className="text-sm font-semibold text-ok">{t(lang, 'sentToPaperless')}</div>
            <Btn variant="ghost" onClick={onClose}>{t(lang, 'close')}</Btn>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            {instances.length > 1 && (
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] block mb-1.5">
                  {t(lang, 'selectPaperlessInstance')}
                </label>
                <select value={instanceId} onChange={e => setInstanceId(e.target.value)}
                  className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent transition-colors">
                  {instances.map(i => <option key={i.id} value={i.id}>{i.name} — {i.url}</option>)}
                </select>
              </div>
            )}
            {[
              [t(lang, 'title'), docTitle, setDocTitle, `scan_${new Date().toLocaleDateString('de-DE')}`],
              [t(lang, 'correspondent'), correspondent, setCorrespondent, 'Max Mustermann'],
              [t(lang, 'tags'), tags, setTags, 'Rechnung, 2024'],
            ].map(([label, val, setter, ph]) => (
              <div key={label}>
                <label className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] block mb-1.5">{label}</label>
                <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                  className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-[13px] font-mono text-[#e8e8f0] outline-none focus:border-accent placeholder:text-[#55556a] transition-colors" />
              </div>
            ))}
            {result === 'error' && (
              <div className="flex items-start gap-2 text-err text-xs bg-err/10 border border-err/20 rounded px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{errMsg}
              </div>
            )}
            <div className="flex gap-3">
              <Btn variant="ghost" className="flex-1 justify-center" onClick={onClose}>{t(lang, 'cancel')}</Btn>
              <Btn variant="primary" className="flex-1 justify-center" onClick={send} disabled={sending}>
                {sending ? <><Spinner className="w-3.5 h-3.5" /> {t(lang, 'sendingToPaperless')}</> : <><Send className="w-3.5 h-3.5" /> {t(lang, 'sendToPaperless')}</>}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Scan() {
  const { lang, paperlessInstances } = useApp()
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const [mode, setMode] = useState('Color')
  const [resolution, setResolution] = useState(300)
  const [format, setFormat] = useState('jpeg')
  const [scanning, setScanning] = useState(false)
  const [scanBlob, setScanBlob] = useState(null)
  const [scanUrl, setScanUrl] = useState(null)
  const [scanMime, setScanMime] = useState('')
  const [error, setError] = useState('')
  const [showPaperless, setShowPaperless] = useState(false)

  useEffect(() => {
    api.getScanDevices().then(d => {
      setDevices(d)
      if (d.length > 0) setSelectedDevice(d[0].name)
    }).catch(() => {})
  }, [])

  async function doScan() {
    if (!selectedDevice) { setError(t(lang, 'noDeviceSelected')); return }
    setError(''); setScanning(true); setScanUrl(null); setScanBlob(null)
    try {
      const res = await api.scan({ device: selectedDevice, mode, resolution, format })
      if (!res.ok) throw new Error((await res.json()).detail || 'Scan failed')
      const blob = await res.blob()
      setScanBlob(blob); setScanUrl(URL.createObjectURL(blob)); setScanMime(blob.type)
    } catch (e) { setError(e.message) }
    finally { setScanning(false) }
  }

  function download() {
    if (!scanUrl) return
    const a = document.createElement('a')
    a.href = scanUrl; a.download = `scan_${Date.now()}.${format}`; a.click()
  }

  const deviceInfo = devices.find(d => d.name === selectedDevice)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-extrabold">{t(lang, 'scanTitle')}</h1>
        <p className="text-[12px] text-[#55556a] mt-0.5">{t(lang, 'scannersAvailable').replace('{n}', devices.length)}</p>
      </div>

      {/* Mobile: stacked, Desktop: side-by-side */}
      <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t(lang, 'scanner')} />
            <div className="p-4 flex flex-col gap-4">
              {devices.length === 0 ? (
                <div className="text-[12px] text-[#55556a]">{t(lang, 'noScannerFound')}</div>
              ) : (
                <Select label={t(lang, 'device')} value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                  {devices.map(d => <option key={d.name} value={d.name}>{d.vendor} {d.model}</option>)}
                </Select>
              )}
              {/* Mobile: 2-column grid for mode/res/format */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <Select label={t(lang, 'mode')} value={mode} onChange={e => setMode(e.target.value)}>
                  {MODES.map(m => <option key={m}>{m}</option>)}
                </Select>
                <Select label={t(lang, 'resolution')} value={resolution} onChange={e => setResolution(Number(e.target.value))}>
                  {RESOLUTIONS.map(r => <option key={r} value={r}>{r} DPI</option>)}
                </Select>
                <Select label={t(lang, 'format')} value={format} onChange={e => setFormat(e.target.value)}>
                  {FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </Select>
              </div>
              {error && <div className="text-err text-xs bg-err/10 border border-err/20 rounded px-3 py-2">{error}</div>}
              <Btn variant="primary" className="justify-center w-full py-3" onClick={doScan} disabled={scanning || !selectedDevice}>
                {scanning ? <><Spinner className="w-4 h-4" /> {t(lang, 'scanning')}</> : <><ScanLine className="w-4 h-4" /> {t(lang, 'startScan')}</>}
              </Btn>
            </div>
          </Panel>

          {deviceInfo && (
            <Panel className="hidden lg:block">
              <PanelHeader title={t(lang, 'deviceInfo')} />
              <div className="divide-y divide-border">
                {[['Name', deviceInfo.name], [t(lang, 'vendor'), deviceInfo.vendor], [t(lang, 'model'), deviceInfo.model], [t(lang, 'type'), deviceInfo.type]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <span className="text-[#55556a]">{k}</span>
                    <span className="font-mono text-[#8888a0] text-right max-w-[55%] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Preview */}
        <Panel className="flex flex-col">
          <PanelHeader title={t(lang, 'preview')}>
            {scanUrl && (
              <div className="flex gap-2 flex-wrap">
                {paperlessInstances.length > 0 ? (
                  <Btn variant="ghost" onClick={() => setShowPaperless(true)}>
                    <Send className="w-3.5 h-3.5 text-ok" /> {t(lang, 'sendToPaperless')}
                  </Btn>
                ) : (
                  <Link to="/settings" className="inline-flex items-center gap-1 text-[10px] text-[#55556a] hover:text-accent transition-colors py-1.5">
                    <ExternalLink className="w-3 h-3" /> {t(lang, 'configurePaperless')}
                  </Link>
                )}
                <Btn variant="ghost" onClick={download}>
                  <Download className="w-3.5 h-3.5" /> {t(lang, 'download')}
                </Btn>
              </div>
            )}
          </PanelHeader>

          <div className="flex-1 flex items-center justify-center p-6 min-h-[300px] lg:min-h-[400px]">
            {scanning ? (
              <div className="flex flex-col items-center gap-6 text-[#55556a]">
                <div className="relative w-20 h-24 border border-accent/30 rounded-lg overflow-hidden bg-bg3">
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent animate-bounce" style={{ top: '50%' }} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[#8888a0]">{t(lang, 'scanning')}</div>
                  <div className="text-[11px] font-mono text-[#55556a] mt-1">{resolution} DPI · {mode} · {format.toUpperCase()}</div>
                </div>
              </div>
            ) : scanUrl && scanMime !== 'application/pdf' ? (
              <img src={scanUrl} alt="Scan" className="max-w-full max-h-[500px] rounded-lg border border-border shadow-2xl object-contain" />
            ) : scanUrl ? (
              <div className="flex flex-col items-center gap-4 text-[#8888a0]">
                <div className="w-16 h-20 bg-bg4 border-2 border-border rounded-lg flex flex-col items-center justify-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-ok">PDF</span>
                </div>
                <span className="text-sm">{t(lang, 'pdfCreated')}</span>
                <div className="flex gap-2 flex-wrap justify-center">
                  {paperlessInstances.length > 0 && (
                    <Btn variant="ghost" onClick={() => setShowPaperless(true)}>
                      <Send className="w-3.5 h-3.5 text-ok" /> {t(lang, 'sendToPaperless')}
                    </Btn>
                  )}
                  <Btn variant="primary" onClick={download}>
                    <Download className="w-3.5 h-3.5" /> {t(lang, 'downloadPdf')}
                  </Btn>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-[#55556a]">
                <ScanLine className="w-12 h-12 opacity-30" />
                <span className="text-sm">{t(lang, 'previewPlaceholder')}</span>
                {paperlessInstances.length === 0 && (
                  <Link to="/settings" className="text-[11px] text-[#55556a] hover:text-accent flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> {t(lang, 'configurePaperless')}
                  </Link>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <PaperlessModal open={showPaperless} onClose={() => setShowPaperless(false)}
        scanBlob={scanBlob} scanFormat={format} instances={paperlessInstances} lang={lang} />
    </div>
  )
}
