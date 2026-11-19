'use strict'

const path = require('path')
const fs = require('fs')

const DEFAULT_VERSION = '1.18.2'
const START_TIMEOUT = 30000
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

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

/**
 * Runs an embedded flying-squid server so the browser client can play a
 * persisted world without an external Minecraft server.
 */
class SingleplayerManager {
  constructor (options = {}) {
    this.rootDir = options.rootDir || path.join(__dirname, '..', 'data', 'singleplayer')
    this.defaultVersion = options.defaultVersion || DEFAULT_VERSION
    this.server = null
    this.info = null
    this.starting = null
  }

  isAvailable () {
    try {
      require.resolve('flying-squid')
      return true
    } catch (e) {
      return false
    }
  }

  status () {
    return {
      available: this.isAvailable(),
      running: !!(this.server && this.info),
      host: this.info ? this.info.host : null,
      port: this.info ? this.info.port : null,
      version: this.info ? this.info.version : this.defaultVersion,
      world: this.info ? this.info.world : null,
      gameMode: this.info ? this.info.gameMode : null
    }
  }

  /** Only the currently running embedded server may be reached through the proxy. */
  isTrustedTarget (host, port) {
    if (!this.info) return false
    return LOOPBACK_HOSTS.has(String(host).toLowerCase()) && Number(port) === this.info.port
  }

  start (options = {}) {
    if (this.starting) return this.starting
    this.starting = this._start(options).finally(() => {
      this.starting = null
    })
    return this.starting
  }

  async _start (options) {
    if (!this.isAvailable()) {
      throw new Error('Singleplayer is not available on this server')
    }

    const world = sanitizeWorldName(options.world)
    const gameMode = parseGameMode(options.gameMode)
    const version = String(options.version || this.defaultVersion)

    if (this.server && this.info &&
      this.info.world === world &&
      this.info.gameMode === gameMode &&
      this.info.version === version) {
      return this.status()
    }

    await this.stop()

    const worldFolder = path.join(this.rootDir, world)
    fs.mkdirSync(worldFolder, { recursive: true })

    const generation = {
      name: 'diamond_square',
      options: { worldHeight: 80 }
    }
    const seed = Number(options.seed)
    if (Number.isFinite(seed) && seed !== 0) generation.options.seed = Math.trunc(seed)

    const squid = require('flying-squid')
    const server = squid.createMCServer({
      host: '127.0.0.1',
      port: 0,
      'online-mode': false,
      version,
      motd: 'Singleplayer',
      'max-players': 5,
      logging: false,
      gameMode,
      difficulty: 1,
      worldFolder,
      generation,
      plugins: {},
      'view-distance': 4,
      'player-list-text': { header: 'Singleplayer', footer: '' },
      'everybody-op': true,
      'max-entities': 200
    })

    if (typeof server.setTime === 'function') server.setTime(1000)

    let port
    try {
      port = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('Timed out while generating the world'))
        }, START_TIMEOUT)

        const cleanup = () => {
          clearTimeout(timer)
          server.removeListener('ready', onReady)
          server.removeListener('error', onError)
        }
        const onReady = () => {
          cleanup()
          resolve(server.listeningPort)
        }
        const onError = (err) => {
          cleanup()
          reject(err)
        }

        server.once('ready', onReady)
        server.once('error', onError)
      })
    } catch (e) {
      try { await server.destroy() } catch (err) {}
      throw e
    }

    if (!port) {
      try { await server.destroy() } catch (e) {}
      throw new Error('The world did not start listening')
    }

    this.server = server
    this.info = {
      host: '127.0.0.1',
      port,
      version,
      world,
      gameMode
    }

    server.on('error', (err) => {
      console.error('[singleplayer]', err)
    })

    return this.status()
  }

  async stop () {
    const server = this.server
    this.server = null
    this.info = null
    if (!server) return
    try {
      if (typeof server.quit === 'function') {
        await server.quit('World closed')
      } else {
        await server.destroy()
      }
    } catch (e) {
      console.error('[singleplayer] failed to stop:', e.message)
      try { await server.destroy() } catch (err) {}
    }
  }
}

function createSingleplayerManager (options) {
  return new SingleplayerManager(options)
}

module.exports = { createSingleplayerManager, sanitizeWorldName, parseGameMode }
