const DEFAULT_VERSION = '1.18.2'

function isEmbeddedMode () {
  return !!window.__PMUI_EMBEDDED_SINGLEPLAYER__ || !!window.__PMUI_USE_EMBEDDED_SINGLEPLAYER__
}

function useEmbeddedMode () {
  window.__PMUI_USE_EMBEDDED_SINGLEPLAYER__ = true
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('singleplayer') && !/\/singleplayer\/?$/.test(url.pathname)) {
      url.searchParams.set('singleplayer', '1')
      window.history.replaceState(null, '', url)
    }
  } catch (e) {}
}

function embeddedVersion () {
  return window.__PMUI_SINGLEPLAYER_VERSION__ || DEFAULT_VERSION
}

function loadEmbeddedServer () {
  if (window.PMUIEmbeddedServer) return Promise.resolve(window.PMUIEmbeddedServer)
  if (window.__pmuiEmbeddedServerPromise) return window.__pmuiEmbeddedServerPromise

  window.__pmuiEmbeddedServerPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'singleplayer-server.js'
    script.async = true
    script.onload = () => {
      if (window.PMUIEmbeddedServer) resolve(window.PMUIEmbeddedServer)
      else reject(new Error('The singleplayer engine could not be initialized'))
    }
    script.onerror = () => reject(new Error('Failed to load the singleplayer engine'))
    document.head.appendChild(script)
  })
  window.__pmuiEmbeddedServerPromise.catch(() => {
    window.__pmuiEmbeddedServerPromise = null
  })
  return window.__pmuiEmbeddedServerPromise
}

async function readJson (res) {
  const text = await res.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = { error: text.slice(0, 200) }
    }
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

async function getSingleplayerStatus () {
  if (isEmbeddedMode()) {
    if (window.PMUIEmbeddedServer) return window.PMUIEmbeddedServer.status()
    return {
      available: true,
      embedded: true,
      running: false,
      version: embeddedVersion()
    }
  }
  try {
    const res = await window.fetch('/api/singleplayer/status', { cache: 'no-store' })
    const status = await readJson(res)
    if (status && status.embedded) useEmbeddedMode()
    if (status && status.available) return status
    throw new Error('Singleplayer is not available on this server')
  } catch (e) {
    // No self-hosted server (for example a purely static deployment): run the
    // whole world inside this page instead.
    useEmbeddedMode()
    return {
      available: true,
      embedded: true,
      running: false,
      version: embeddedVersion()
    }
  }
}

async function startSingleplayer (options) {
  if (isEmbeddedMode()) {
    const engine = await loadEmbeddedServer()
    return engine.start(options)
  }
  const res = await window.fetch('/api/singleplayer/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })
  return readJson(res)
}

async function stopSingleplayer () {
  if (isEmbeddedMode()) {
    if (window.PMUIEmbeddedServer) return window.PMUIEmbeddedServer.stop()
    return { running: false }
  }
  const res = await window.fetch('/api/singleplayer/stop', { method: 'POST' })
  return readJson(res)
}

module.exports = {
  isEmbeddedMode,
  useEmbeddedMode,
  embeddedVersion,
  getSingleplayerStatus,
  startSingleplayer,
  stopSingleplayer
}
