const STORAGE_KEY = 'pmc.msa.session'

function loadSession () {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.accessToken || !session?.profile?.name) return null
    return session
  } catch (e) {
    return null
  }
}

function saveSession (session) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch (e) {}
  return session
}

function clearSession () {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (e) {}
}

async function api (path, body) {
  let res
  try {
    res = await window.fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch (e) {
    throw new Error('Cannot reach the sign-in service. Check your connection.')
  }
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch (e) {
    throw new Error('The sign-in service returned an unexpected response. Is /api deployed?')
  }
  if (!res.ok) {
    const err = new Error(data.error || `Sign-in failed (HTTP ${res.status})`)
    err.code = data.code
    throw err
  }
  return data
}

function startDeviceLogin () {
  return api('/api/auth/device', {})
}

async function pollDeviceLogin (deviceCode) {
  const result = await api('/api/auth/poll', { deviceCode })
  if (result.session) saveSession(result.session)
  return result
}

async function ensureFreshSession () {
  const session = loadSession()
  if (!session) return null
  const remaining = (session.expiresAt || 0) - Date.now()
  if (remaining > 5 * 60 * 1000) return session
  if (!session.refreshToken) return session

  try {
    const result = await api('/api/auth/refresh', { refreshToken: session.refreshToken })
    return saveSession(result.session)
  } catch (e) {
    if (e.code === 'invalid_grant' || /expired|invalid/i.test(e.message)) {
      clearSession()
      return null
    }
    return session
  }
}

async function logout () {
  clearSession()
}

module.exports = {
  loadSession,
  saveSession,
  clearSession,
  startDeviceLogin,
  pollDeviceLogin,
  ensureFreshSession,
  logout
}
