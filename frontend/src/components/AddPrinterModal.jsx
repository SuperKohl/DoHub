import React, { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { api } from '../api'
import { Btn, Input, Badge, PrinterIcon, Spinner } from './ui'
import { t } from '../i18n'

const TABS_KEYS = ['automatic', 'networkIp', 'usb']

export default function AddPrinterModal({ open, onClose, onAdded, lang = 'de' }) {
  const [tab, setTab] = useState(0)
  const [discovered, setDiscovered] = useState([])
  const [discovering, setDiscovering] = useState(false)
  const [form, setForm] = useState({ name: '', uri: '', ppd_name: 'drv:///sample.drv/generic.ppd', location: '', description: '', shared: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && tab === 0) runDiscover()
  }, [open, tab])

  async function runDiscover() {
    setDiscovering(true)
    try { setDiscovered(await api.discoverPrinters()) }
    catch { setDiscovered([]) }
    finally { setDiscovering(false) }
  }

  function selectDiscovered(d) {
    const name = d.make_model.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
    setForm(f => ({ ...f, name, uri: d.uri }))
    setTab(1)
  }

  async function submit() {
    setError('')
    if (!form.name || !form.uri) { setError(t(lang, 'nameAndUriRequired')); return }
    setLoading(true)
    try { await api.addPrinter(form); onAdded?.(); onClose() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg2 border border-border2 rounded-2xl w-[480px] overflow-hidden animate-fadeup">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <span className="text-sm font-bold">{t(lang, 'addPrinter')}</span>
          <button onClick={onClose} className="text-[#55556a] hover:text-[#e8e8f0] transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <div className="flex gap-0.5 bg-bg3 rounded-lg p-1">
            {TABS_KEYS.map((key, i) => (
              <button key={key} onClick={() => setTab(i)}
                className={`flex-1 py-1.5 px-3 rounded-md text-[11px] font-bold tracking-wide transition-all ${tab === i ? 'bg-bg4 text-[#e8e8f0] border border-border' : 'text-[#55556a] hover:text-[#8888a0]'}`}>
                {t(lang, key)}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a]">{t(lang, 'discoveredDevices')}</div>
                <button onClick={runDiscover} className="text-[10px] text-accent hover:underline">
                  {discovering ? t(lang, 'searching') : t(lang, 'searchAgain')}
                </button>
              </div>
              {discovering ? (
                <div className="flex items-center gap-2 p-4 justify-center text-[#55556a] text-sm">
                  <Spinner /> {t(lang, 'searching')}
                </div>
              ) : discovered.length === 0 ? (
                <div className="p-4 text-center text-[#55556a] text-sm">{t(lang, 'noDevicesFound')}</div>
              ) : discovered.map((d, i) => (
                <div key={i} onClick={() => selectDiscovered(d)}
                  className="flex items-center gap-3 p-3 bg-bg3 border border-border rounded-lg cursor-pointer hover:border-accent hover:bg-bg4 transition-all">
                  <div className="w-8 h-8 bg-bg4 border border-border rounded-lg flex items-center justify-center text-[#8888a0]">
                    <PrinterIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{d.make_model || t(lang, 'unknown')}</div>
                    <div className="text-[11px] font-mono text-[#55556a] truncate">{d.uri}</div>
                  </div>
                  <Badge variant="blue">{t(lang, 'new')}</Badge>
                </div>
              ))}
            </div>
          )}

          {(tab === 1 || tab === 2) && (
            <div className="flex flex-col gap-4">
              <Input label={t(lang, 'nameInCups')} placeholder="HP_LaserJet_Office"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input label={tab === 2 ? t(lang, 'usbUri') : t(lang, 'printerUri')}
                placeholder={tab === 2 ? 'usb://Vendor/Model' : 'ipp://192.168.1.42:631/ipp/print'}
                value={form.uri} onChange={e => setForm(f => ({ ...f, uri: e.target.value }))} />
              <Input label={t(lang, 'ppdDriver')} placeholder="drv:///sample.drv/generic.ppd"
                value={form.ppd_name} onChange={e => setForm(f => ({ ...f, ppd_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t(lang, 'locationOptional')} placeholder="Büro 2. OG"
                  value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                <Input label={t(lang, 'descriptionOptional')} placeholder="Schwarzweiß-Laser"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
          )}

          {error && <div className="text-err text-xs bg-err/10 border border-err/20 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3 pt-1">
            <Btn variant="ghost" className="flex-1 justify-center" onClick={onClose}>{t(lang, 'cancel')}</Btn>
            <Btn variant="primary" className="flex-1 justify-center" onClick={submit} disabled={loading}>
              {loading ? <><Spinner className="w-3.5 h-3.5" /> {t(lang, 'add')}…</> : <><Plus className="w-3.5 h-3.5" /> {t(lang, 'add')}</>}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
