import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('dohub_lang') || 'de')
  const [paperlessInstances, setPaperlessInstances] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dohub_paperless') || '[]') }
    catch { return [] }
  })

  function changeLang(l) {
    setLang(l)
    localStorage.setItem('dohub_lang', l)
  }

  function _save(instances) {
    setPaperlessInstances(instances)
    localStorage.setItem('dohub_paperless', JSON.stringify(instances))
  }

  function addPaperlessInstance(inst) {
    _save([...paperlessInstances, { ...inst, id: Date.now().toString() }])
  }

  function removePaperlessInstance(id) {
    _save(paperlessInstances.filter(i => i.id !== id))
  }

  function updatePaperlessInstance(id, data) {
    _save(paperlessInstances.map(i => i.id === id ? { ...i, ...data } : i))
  }

  return (
    <AppContext.Provider value={{
      lang, changeLang,
      paperlessInstances, addPaperlessInstance, removePaperlessInstance, updatePaperlessInstance,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
