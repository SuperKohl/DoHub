import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useApp } from '../AppContext'
import { t } from '../i18n'
import { Panel, PanelHeader, StatusBadge, Btn, Badge, Toggle, PrinterIcon, Input, Spinner } from '../components/ui'
import AddPrinterModal from '../components/AddPrinterModal'
import { Plus, Trash2, Star, FileText, RefreshCw, Pencil, X, Check, Wifi, ArrowLeft } from 'lucide-react'

function Skeleton({ className = '' }) {
  return <div className={`bg-bg4 rounded animate-pulse ${className}`} />
}
function PrinterSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-2 w-52" /></div>
      <Skeleton className="h-5 w-16 rounded" />
    </div>
  )
}

function RenameModal({ printer, open, onClose, onSaved, lang }) {
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (open && printer) { setDisplayName(printer.airprint_display_name || printer.name || ''); setErr('') }
  }, [open, printer?.name])

  async function save() {
    setSaving(true); setErr('')
    try { await api.renamePrinter(printer.name, { airprint_display_name: displayName }); onSaved(); onClose() }
    catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  if (!open || !printer) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-end sm:items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg2 border border-border2 rounded-2xl w-full sm:w-[400px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-sm font-bold">{t(lang, 'renamePrinter')}</span>
          <button onClick={onClose} className="text-[#55556a] hover:text-[#e8e8f0]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#55556a] mb-1.5">{t(lang, 'printerName')}</div>
            <div className="px-3 py-2 bg-bg3 border border-border rounded-md text-sm font-mono text-[#55556a] select-all">{printer.name}</div>
          </div>
          <Input label={t(lang, 'airprintDisplayName')} value={displayName}
            onChange={e => setDisplayName(e.target.value)} placeholder={printer.name}
            hint={t(lang, 'airprintDisplayNameHint')} />
          {err && <div className="text-err text-xs bg-err/10 border border-err/20 rounded px-3 py-2">{err}</div>}
          <div className="flex gap-3">
            <Btn variant="ghost" className="flex-1 justify-center" onClick={onClose}>{t(lang, 'cancel')}</Btn>
            <Btn variant="primary" className="flex-1 justify-center" onClick={save} disabled={saving}>
              {saving ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />} {t(lang, 'save')}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrinterDetail({ printer, onRefresh, onBack, lang }) {
  const [airprintOn, setAirprintOn] = useState(false)
  const [airprintLoading, setAirprintLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [showRename, setShowRename] = useState(false)

  useEffect(() => {
    setAirprintOn(printer.airprint_registered ?? printer.shared ?? false)
  }, [printer.name, printer.airprint_registered])

  async function toggleAirPrint(val) {
    setAirprintLoading(true)
    const prev = airprintOn; setAirprintOn(val)
    try {
      if (val) {
        await api.registerAirPrint({ printer_name: printer.airprint_display_name || printer.name, cups_printer_name: printer.name, color: printer.color ?? true, duplex: printer.duplex ?? false })
      } else {
        try { await api.unregisterAirPrint(printer.airprint_display_name || printer.name) } catch {}
        try { await api.unregisterAirPrint(printer.name) } catch {}
      }
    } catch (e) { setAirprintOn(prev); alert('AirPrint: ' + e.message) }
    finally { setAirprintLoading(false) }
  }

  async function act(action) {
    setActionLoading(action)
    try {
      if (action === 'test') await api.testPage(printer.name)
      if (action === 'default') { await api.setDefault(printer.name); onRefresh() }
      if (action === 'delete') {
        if (!confirm(t(lang, 'confirmDelete').replace('{name}', printer.name))) { setActionLoading(''); return }
        await api.deletePrinter(printer.name); onRefresh(); onBack?.()
      }
    } catch (e) { alert(e.message) }
    finally { setActionLoading('') }
  }

  const rows = [
    [t(lang, 'connection'), printer.uri?.split(':')[0]?.toUpperCase() || '—'],
    ['URI', printer.uri],
    [t(lang, 'model'), printer.make_model || '—'],
    [t(lang, 'location'), printer.location || '—'],
    [t(lang, 'color'), printer.color ? t(lang, 'yes') : t(lang, 'no')],
    [t(lang, 'duplex'), printer.duplex ? t(lang, 'yes') : t(lang, 'no')],
    [t(lang, 'acceptingJobs'), printer.accepting ? t(lang, 'yes') : t(lang, 'no')],
  ]

  return (
    <>
      <Panel className="flex flex-col">
        <div className="px-4 py-3.5 border-b border-border">
          {/* Back button on mobile */}
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-[#55556a] text-xs mb-3 hover:text-accent">
              <ArrowLeft className="w-3.5 h-3.5" /> {t(lang, 'allPrinters')}
            </button>
          )}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base font-extrabold truncate">{printer.name}</span>
              <button onClick={() => setShowRename(true)} className="text-[#55556a] hover:text-accent flex-shrink-0 p-0.5 rounded">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <StatusBadge state={printer.state} lang={lang} />
          </div>
          {printer.airprint_display_name && printer.airprint_display_name !== printer.name && (
            <div className="text-[11px] text-info font-mono flex items-center gap-1 mb-1">
              <Wifi className="w-3 h-3" />{printer.airprint_display_name}
            </div>
          )}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {printer.is_default && <Badge variant="orange">{t(lang, 'standard')}</Badge>}
            {airprintOn && <Badge variant="blue">AirPrint</Badge>}
            {printer.duplex && <Badge variant="purple">Duplex</Badge>}
            {printer.color && <Badge variant="green">{t(lang, 'color')}</Badge>}
          </div>
        </div>

        <div className="divide-y divide-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 text-xs">
              <span className="text-[#55556a] flex-shrink-0">{k}</span>
              <span className="font-mono text-[#8888a0] text-right max-w-[55%] truncate ml-2">{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#55556a]">{t(lang, 'airprintActive')}</span>
              {airprintLoading && <Spinner className="w-3 h-3 text-accent" />}
            </div>
            <Toggle value={airprintOn} onChange={toggleAirPrint} disabled={airprintLoading} />
          </div>
        </div>

        <div className="px-4 py-3.5 border-t border-border flex gap-2 flex-wrap">
          <Btn variant="ghost" onClick={() => act('test')} disabled={!!actionLoading}>
            {actionLoading === 'test' ? <Spinner className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            {t(lang, 'testPage')}
          </Btn>
          {!printer.is_default && (
            <Btn variant="ghost" onClick={() => act('default')} disabled={!!actionLoading}>
              {actionLoading === 'default' ? <Spinner className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
              {t(lang, 'setAsDefault')}
            </Btn>
          )}
          <div className="flex-1" />
          <Btn variant="danger" onClick={() => act('delete')} disabled={!!actionLoading}>
            {actionLoading === 'delete' ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
            {t(lang, 'delete')}
          </Btn>
        </div>
      </Panel>

      <RenameModal printer={printer} open={showRename}
        onClose={() => setShowRename(false)} onSaved={onRefresh} lang={lang} />
    </>
  )
}

export default function Printers() {
  const { lang } = useApp()
  const [printers, setPrinters] = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileDetail, setMobileDetail] = useState(false) // mobile: show detail view

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getPrinters()
      setPrinters(data)
      setSelected(s => s ?? (data[0]?.name ?? null))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selectedPrinter = printers.find(p => p.name === selected)

  function selectPrinter(name) {
    setSelected(name)
    setMobileDetail(true)
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-extrabold">{t(lang, 'printersTitle')}</h1>
          <p className="text-[12px] text-[#55556a] mt-0.5">
            {t(lang, 'printersConfigured').replace('{n}', printers.length)}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t(lang, 'refresh')}</span>
          </Btn>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(lang, 'addPrinter')}</span>
            <span className="sm:hidden">{t(lang, 'add')}</span>
          </Btn>
        </div>
      </div>

      {/* Mobile: show either list OR detail */}
      <div className="lg:hidden">
        {mobileDetail && selectedPrinter ? (
          <PrinterDetail printer={selectedPrinter} onRefresh={load} lang={lang}
            onBack={() => setMobileDetail(false)} />
        ) : (
          <Panel>
            <PanelHeader title={t(lang, 'allPrinters')} />
            {loading ? (
              <><PrinterSkeleton /><PrinterSkeleton /></>
            ) : printers.length === 0 ? (
              <div className="p-8 text-center text-[#55556a] text-sm">{t(lang, 'noPrintersYet')}</div>
            ) : (
              <>
                {printers.map(p => (
                  <div key={p.name} onClick={() => selectPrinter(p.name)}
                    className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-bg3 active:bg-bg4 transition-colors">
                    <div className="w-9 h-9 bg-bg4 border border-border rounded-lg flex items-center justify-center flex-shrink-0">
                      <PrinterIcon className="w-4 h-4 text-[#8888a0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-[10px] font-mono text-[#55556a] truncate">{p.uri}</div>
                    </div>
                    <StatusBadge state={p.state} lang={lang} />
                  </div>
                ))}
                <div className="m-3">
                  <button onClick={() => setShowAdd(true)}
                    className="w-full py-3 border border-dashed border-border2 rounded-lg text-[12px] text-[#55556a] hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> {t(lang, 'addAnotherPrinter')}
                  </button>
                </div>
              </>
            )}
          </Panel>
        )}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_340px] gap-4">
        <Panel>
          <PanelHeader title={t(lang, 'allPrinters')} />
          {loading ? (
            <><PrinterSkeleton /><PrinterSkeleton /><PrinterSkeleton /></>
          ) : printers.length === 0 ? (
            <div className="p-8 text-center text-[#55556a] text-sm whitespace-pre-line">{t(lang, 'noPrintersYet')}</div>
          ) : (
            <>
              {printers.map(p => (
                <div key={p.name} onClick={() => setSelected(p.name)}
                  className={`relative flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0 cursor-pointer transition-colors ${selected === p.name ? 'bg-accent/5' : 'hover:bg-bg3'}`}>
                  {selected === p.name && <div className="absolute left-0 top-0 h-full w-0.5 bg-accent" />}
                  <div className="w-9 h-9 bg-bg4 border border-border rounded-lg flex items-center justify-center flex-shrink-0">
                    <PrinterIcon className="w-4 h-4 text-[#8888a0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}
                      {p.airprint_display_name && p.airprint_display_name !== p.name && (
                        <span className="ml-2 text-[10px] font-normal font-mono text-info/60">→ {p.airprint_display_name}</span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[#55556a] truncate">{p.uri}</div>
                  </div>
                  <div className="flex gap-1">
                    {p.airprint_registered && <Badge variant="blue">AirPrint</Badge>}
                    {p.is_default && <Badge variant="orange">{t(lang, 'standard')}</Badge>}
                  </div>
                  <StatusBadge state={p.state} lang={lang} />
                </div>
              ))}
              <div className="m-3">
                <button onClick={() => setShowAdd(true)}
                  className="w-full py-3 border border-dashed border-border2 rounded-lg text-[12px] text-[#55556a] hover:text-accent hover:border-accent transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> {t(lang, 'addAnotherPrinter')}
                </button>
              </div>
            </>
          )}
        </Panel>

        {selectedPrinter ? (
          <PrinterDetail printer={selectedPrinter} onRefresh={load} lang={lang} />
        ) : (
          <Panel>
            <div className="p-8 text-center text-[#55556a] text-sm">
              {loading ? t(lang, 'loading') : t(lang, 'selectPrinter')}
            </div>
          </Panel>
        )}
      </div>

      <AddPrinterModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={load} lang={lang} />
    </div>
  )
}
