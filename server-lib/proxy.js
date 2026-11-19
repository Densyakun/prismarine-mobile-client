'use strict'

const net = require('net')
const crypto = require('crypto')
const dns = require('dns').promises
const { WebSocketServer } = require('ws')
const { readJson } = require('./http')

const DEFAULT_URL_ROOT = '/api/vm/net'
const MAX_CONNECTIONS = Number(process.env.PROXY_MAX_CONNECTIONS || 200)
const CONNECT_TIMEOUT = 15000
const TOKEN_TIMEOUT = 60000

function isPrivateIPv4 (ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
}

function isPrivateIp (ip) {
  const value = ip.toLowerCase()
  if (value.includes(':')) {
    if (value === '::1' || value === '::') return true
    if (value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return true
    if (value.startsWith('fc') || value.startsWith('fd')) return true
    const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIPv4(mapped[1])
    return false
  }
  return isPrivateIPv4(value)
}

function isHostAllowed (host) {
  const allow = process.env.PROXY_ALLOWED_HOSTS
  if (!allow) return true
  return allow.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean).some((entry) => {
    if (entry.startsWith('*.')) return host.toLowerCase().endsWith(entry.slice(1))
    return host.toLowerCase() === entry
  })
}

async function assertSafeTarget (host, port) {
  if (!host || typeof host !== 'string') throw new Error('Missing host')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port')
  if (!isHostAllowed(host)) throw new Error('This server is not allowed by the proxy policy')

  let addresses
  try {
    addresses = await dns.lookup(host, { all: true })
  } catch (e) {
    throw new Error(`Cannot resolve ${host}`)
  }
  if (!addresses.length) throw new Error(`Cannot resolve ${host}`)
  if (process.env.PROXY_ALLOW_PRIVATE !== '1' && addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Private or local network addresses are not allowed')
  }
}

function setCors (res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '1728000')
}

function send (res, status, data) {
  if (res.writableEnded) return
  setCors(res)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

function parseUrl (req) {
  return new URL(req.url || '/', 'http://localhost')
}

/**
 * net-browserify compatible proxy.
 * POST <urlRoot>/connect { host, port } -> { token, remote }
 * WS   <urlRoot>/socket?token=...        -> raw TCP bytes
 */
function createProxy (options = {}) {
  const urlRoot = (options.urlRoot || DEFAULT_URL_ROOT).replace(/\/+$/, '')
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 })
  const pending = new Map()
  let connectionCount = 0

  function release (token) {
    const entry = pending.get(token)
    if (!entry) return
    pending.delete(token)
    connectionCount = Math.max(0, connectionCount - 1)
    clearTimeout(entry.timer)
    entry.tcp.destroy()
  }

  async function connect (req, res) {
    if (req.method === 'OPTIONS') {
      setCors(res)
      res.statusCode = 204
      res.end()
      return
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'Method not allowed' })
      return
    }

    try {
      const body = req.body && typeof req.body === 'object' ? req.body : await readJson(req)
      const host = String(body.host || '')
      const port = Number(body.port || 25565)

      if (connectionCount >= MAX_CONNECTIONS) throw new Error('The proxy is busy. Please try again.')
      await assertSafeTarget(host, port)

      const tcp = net.connect({ host, port })
      tcp.setNoDelay(true)
      tcp.setTimeout(CONNECT_TIMEOUT)

      const token = crypto.randomBytes(32).toString('hex')
      const entry = { tcp, timer: null }
      pending.set(token, entry)
      connectionCount++

      let settled = false
      const finish = (status, data) => {
        if (settled) return
        settled = true
        send(res, status, data)
      }

      tcp.once('connect', () => {
        tcp.setTimeout(0)
        entry.timer = setTimeout(() => release(token), TOKEN_TIMEOUT)
        finish(200, {
          token,
          remote: {
            address: tcp.remoteAddress,
            family: tcp.remoteFamily,
            port: tcp.remotePort
          }
        })
      })

      tcp.once('timeout', () => {
        release(token)
        finish(504, { error: `Could not reach ${host}:${port} (timeout)` })
      })

      tcp.once('error', (err) => {
        release(token)
        finish(502, {
          error: err.code === 'ENOTFOUND' ? `Cannot find ${host}` : `Socket error: ${err.code || err.message}`
        })
      })

      tcp.once('close', () => {
        if (!settled) {
          release(token)
          finish(502, { error: 'Connection closed before it was established' })
        }
      })
    } catch (e) {
      send(res, 400, { error: e.message })
    }
  }

  function attach (server) {
    server.on('upgrade', (req, socket, head) => {
      const url = parseUrl(req)
      if (url.pathname !== `${urlRoot}/socket`) {
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
    })
  }

  wss.on('connection', (ws, req) => {
    const url = parseUrl(req)
    const token = url.searchParams.get('token')
    const entry = token && pending.get(token)

    if (!entry) {
      ws.close()
      return
    }

    pending.delete(token)
    clearTimeout(entry.timer)
    const tcp = entry.tcp
    let closed = false

    const cleanup = () => {
      if (closed) return
      closed = true
      connectionCount = Math.max(0, connectionCount - 1)
      tcp.destroy()
      if (ws.readyState === ws.OPEN) ws.close()
    }

    tcp.on('data', (chunk) => {
      if (ws.readyState === ws.OPEN) ws.send(chunk, { binary: true })
    })

    tcp.on('close', cleanup)
    tcp.on('error', cleanup)

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        const text = data.toString()
        if (text.startsWith('ping:')) {
          if (ws.readyState === ws.OPEN) ws.send(`pong:${text.slice(5)}`)
          return
        }
        return
      }
      tcp.write(Buffer.isBuffer(data) ? data : Buffer.from(data))
    })

    ws.on('close', cleanup)
    ws.on('error', cleanup)
  })

  return { connect, attach, urlRoot }
}

module.exports = { createProxy, isPrivateIp, assertSafeTarget }
