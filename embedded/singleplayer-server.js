/* global window */

// Standalone bundle: runs flying-squid inside the page and exposes it to the
// client through the shared in-memory loopback network.
//
// Loaded on demand from the singleplayer screen (singleplayer-server.js), so
// its size does not affect the normal client startup.

'use strict'

process.versions = process.versions || {}
process.versions.node = process.versions.node || '20.0.0'

const fs = require('fs')
const squid = require('flying-squid')
const { installVanillaDrops, forceSelectedGameMode } = require('../server-lib/flying-squid-fixes')

const HOST = 'singleplayer.local'
const DEFAULT_VERSION = '1.20.1'
const AUTOSAVE_INTERVAL = 15000

let server = null
let info = null
let starting = null
let autosaveTimer = null

function sanitizeWorldName (name) {
  const cleaned = String(name === undefined || name === null ? '' : name)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return cleaned || 'world'
}

function parseGameMode (mode) {
  if (mode === 0 || mode === 1) return mode
  const value = String(mode === undefined || mode === null ? '' : mode).toLowerCase()
  return value === 'creative' || value === '1' ? 1 : 0
}

function defaultVersion () {
  return window.__PMUI_SINGLEPLAYER_VERSION__ || DEFAULT_VERSION
}

function status () {
  return {
    available: true,
    embedded: true,
    running: !!(server && info),
    host: info ? info.host : null,
    port: info ? info.port : null,
    version: info ? info.version : defaultVersion(),
    world: info ? info.world : null,
    gameMode: info ? info.gameMode : null
  }
}

function stopAutosave () {
  if (autosaveTimer) clearInterval(autosaveTimer)
  autosaveTimer = null
}

function startAutosave () {
  stopAutosave()
  autosaveTimer = setInterval(() => {
    if (info) fs.__persistWorld(info.world)
  }, AUTOSAVE_INTERVAL)
}

function start (options = {}) {
  if (starting) return starting
  starting = doStart(options).finally(() => {
    starting = null
  })
  return starting
}

async function doStart (options) {
  const world = sanitizeWorldName(options.world)
  const gameMode = parseGameMode(options.gameMode)
  const version = String(options.version || defaultVersion())

  if (server && info &&
    info.world === world &&
    info.gameMode === gameMode &&
    info.version === version) {
    return status()
  }

  await stop()

  const exists = await fs.__worldExists(world)
  if (!exists && options.create !== true) {
    throw new Error('That world does not exist yet. Create a new world first.')
  }

  await fs.__restoreWorld(world)
  fs.mkdirSync('/world', { recursive: true })

  forceSelectedGameMode()

  const generation = {
    name: 'diamond_square',
    options: { worldHeight: 80 }
  }
  const seed = Number(options.seed)
  if (Number.isFinite(seed) && seed !== 0) generation.options.seed = Math.trunc(seed)

  const mcServer = squid.createMCServer({
    host: HOST,
    port: 0,
    'online-mode': false,
    version,
    motd: 'Singleplayer',
    'max-players': 5,
    logging: false,
    noConsoleOutput: true,
    gameMode,
    difficulty: 1,
    worldFolder: '/world',
    generation,
    plugins: {},
    'view-distance': 4,
    'player-list-text': { header: 'Singleplayer', footer: '' },
    'everybody-op': true,
    'max-entities': 200
  })

  // Start new worlds in the daytime like the vanilla "day" default.
  if (typeof mcServer.setTime === 'function') mcServer.setTime(1000)

  let port
  try {
    port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('Timed out while generating the world'))
      }, 30000)

      const cleanup = () => {
        clearTimeout(timer)
        mcServer.removeListener('ready', onReady)
        mcServer.removeListener('error', onError)
      }
      const onReady = () => {
        cleanup()
        resolve(mcServer.listeningPort)
      }
      const onError = (err) => {
        cleanup()
        reject(err)
      }

      mcServer.once('ready', onReady)
      mcServer.once('error', onError)
    })
  } catch (e) {
    try { await mcServer.destroy() } catch (err) {}
    throw e
  }

  if (!port) {
    try { await mcServer.destroy() } catch (e) {}
    throw new Error('The world did not start listening')
  }

  server = mcServer
  info = { host: HOST, port, version, world, gameMode }
  installVanillaDrops(server)
  server.on('error', (err) => console.error('[singleplayer]', err))
  startAutosave()

  return status()
}

async function stop () {
  stopAutosave()
  const running = server
  const runningInfo = info
  server = null
  info = null
  if (running) {
    try {
      if (typeof running.quit === 'function') await running.quit('World closed')
      else await running.destroy()
    } catch (e) {
      console.warn('[singleplayer] failed to stop:', e.message)
      try { await running.destroy() } catch (err) {}
    }
  }
  if (runningInfo) {
    // flying-squid saves playerdata when the socket closes, slightly after
    // quit() resolves. Give it a moment so the snapshot includes it.
    await new Promise((resolve) => setTimeout(resolve, 300))
    await fs.__persistWorld(runningInfo.world)
  }
}

function persistNow () {
  if (info) fs.__persistWorld(info.world)
}

async function listWorlds () {
  return { worlds: await fs.__listWorlds() }
}

async function deleteWorld (name) {
  const world = sanitizeWorldName(name)
  if (info && info.world === world) await stop()
  await fs.__deleteWorld(world)
  return { worlds: await fs.__listWorlds() }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', persistNow)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistNow()
  })
  window.PMUIEmbeddedServer = {
    start,
    stop,
    status,
    persistNow,
    listWorlds,
    deleteWorld,
    version: defaultVersion()
  }
}
