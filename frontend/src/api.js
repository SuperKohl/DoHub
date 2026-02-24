const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  status: () => req('GET', '/status'),
  getPrinters: () => req('GET', '/printers/'),
  addPrinter: (data) => req('POST', '/printers/', data),
  deletePrinter: (name) => req('DELETE', `/printers/${encodeURIComponent(name)}`),
  renamePrinter: (name, data) => req('PATCH', `/printers/${encodeURIComponent(name)}/rename`, data),
  setDefault: (name) => req('POST', `/printers/${encodeURIComponent(name)}/default`),
  testPage: (name) => req('POST', `/printers/${encodeURIComponent(name)}/test`),
  discoverPrinters: () => req('GET', '/printers/discover/network'),
  getJobs: (printer, which) => req('GET', `/jobs/?${printer ? `printer=${printer}&` : ''}${which ? `which=${which}` : ''}`),
  getHistory: () => req('GET', '/jobs/history'),
  cancelJob: (id) => req('DELETE', `/jobs/${id}`),
  getScanDevices: () => req('GET', '/scan/devices'),
  scan: (data) => fetch(BASE + '/scan/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getAirPrintRegistered: () => req('GET', '/airprint/registered'),
  registerAirPrint: (data) => req('POST', '/airprint/register', data),
  unregisterAirPrint: (name) => req('DELETE', `/airprint/register/${encodeURIComponent(name)}`),
  setAirprintDisplayName: (name, data) => req('PATCH', `/airprint/name/${encodeURIComponent(name)}`, data),
}

export function createJobsSocket(onMessage) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/api/jobs/ws`)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  ws.onerror = () => {}
  return ws
}

// All Paperless calls proxied through backend to avoid CORS/SSL issues
export const paperless = {
  async testConnection(url, authType = 'apikey', apiKey = '', username = '', password = '', verifySsl = true) {
    const res = await fetch(BASE + '/paperless/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, auth_type: authType, api_key: apiKey, username, password, verify_ssl: verifySsl }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
    return data
  },

  async uploadDocument(url, authType, apiKey, username, password, verifySsl, blob, filename, title, correspondent, tags) {
    const form = new FormData()
    form.append('url', url)
    form.append('auth_type', authType || 'apikey')
    form.append('api_key', apiKey || '')
    form.append('username', username || '')
    form.append('password', password || '')
    form.append('verify_ssl', String(verifySsl !== false))
    form.append('document', blob, filename)
    if (title)         form.append('title', title)
    if (correspondent) form.append('correspondent', correspondent)
    if (tags)          form.append('tags', tags)

    const res = await fetch(BASE + '/paperless/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
    return data
  },
}
