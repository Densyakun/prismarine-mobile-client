/* global WebSocket, location, window, queueMicrotask */

// A browser implementation of Node's `net` module that tunnels raw TCP through
// a net-browserify compatible WebSocket proxy (the same protocol used by the
// prismarine-web-client demo and community proxies).
//
//   POST <proxy>/api/vm/net/connect  { host, port } -> { token, remote }
//   WS   <proxy>/api/vm/net/socket?token=...        -> raw TCP bytes
//
// It also exposes an in-memory loopback (createServer / connect) so that an
// embedded singleplayer server running in the same page can be reached without
// any network or Node.js process.

const { Duplex } = require('stream')
const { EventEmitter } = require('events')

const SINGLEPLAYER_HOST = 'singleplayer.local'

const virtualServers = new Map()
let nextVirtualPort = 39000

function queueTask (fn) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn)
  else setTimeout(fn, 0)
}

function virtualKey (host, port) {
  return `${String(host).toLowerCase()}:${Number(port)}`
}

function findVirtualServer (host, port) {
  return virtualServers.get(virtualKey(host, port))
}

class VirtualSocket extends Duplex {
  constructor (local, remote) {
    super({ allowHalfOpen: false })
    this._peer = null
    this._closed = false
    this.remoteAddress = remote.address
    this.remoteFamily = 'IPv4'
    this.remotePort = remote.port
    this.localAddress = local.address
    this.localPort = local.port
    this.bytesRead = 0
    this.bytesWritten = 0
  }

  _read () {}

  _write (chunk, encoding, callback) {
    if (typeof chunk === 'string') chunk = Buffer.from(chunk, encoding === 'binary' ? 'binary' : 'utf8')
    this.bytesWritten += chunk.length
    if (this._peer && !this._peer._closed) this._peer.push(chunk)
    callback()
  }

  _final (callback) {
    if (this._peer && !this._peer._closed) this._peer.push(null)
    callback()
  }

  _destroy (err, callback) {
    this._closed = true
    const peer = this._peer
    this._peer = null
    if (peer && !peer._closed) peer.destroy()
    callback(err)
  }

  setNoDelay () {}
  setKeepAlive () {}
  setTimeout (msecs, callback) {
    if (callback) this.once('timeout', callback)
  }

  address () {
    return { address: this.localAddress, family: this.remoteFamily, port: this.localPort }
  }
}

class VirtualServer extends EventEmitter {
  constructor () {
    super()
    this.port = 0
    this.host = SINGLEPLAYER_HOST
    this._sockets = new Set()
    this._closed = false
  }

  listen (port, host, callback) {
    if (typeof port === 'function') {
      callback = port
      port = 0
    }
    if (typeof host === 'function') {
      callback = host
      host = SINGLEPLAYER_HOST
    }

    this.host = host || SINGLEPLAYER_HOST
    if (port) {
      this.port = Number(port)
    } else {
      do {
        nextVirtualPort++
        if (nextVirtualPort > 65000) nextVirtualPort = 39000
      } while (virtualServers.has(virtualKey(this.host, nextVirtualPort)))
      this.port = nextVirtualPort
    }
    virtualServers.set(virtualKey(this.host, this.port), this)

    queueTask(() => {
      if (this._closed) return
      this.emit('listening')
      if (callback) callback()
    })
    return this
  }

  address () {
    return { address: this.host, family: 'IPv4', port: this.port }
  }

  getConnections (callback) {
    if (callback) callback(null, this._sockets.size)
    return this._sockets.size
  }

  close (callback) {
    if (this._closed) {
      if (callback) queueTask(callback)
      return this
    }
    this._closed = true
    const key = virtualKey(this.host, this.port)
    if (virtualServers.get(key) === this) virtualServers.delete(key)
    for (const socket of this._sockets) {
      if (!socket._closed) socket.destroy()
    }
    this._sockets.clear()
    if (callback) this.once('close', callback)
    queueTask(() => this.emit('close'))
    return this
  }
}

function createServer (options, connectionListener) {
  if (typeof options === 'function') {
    connectionListener = options
    options = {}
  }
  const server = new VirtualServer()
  if (connectionListener) server.on('connection', connectionListener)
  return server
}

function connectVirtual (host, port, options, callback) {
  const server = findVirtualServer(host, port)
  if (!server) throw new Error(`No in-browser server listening on ${host}:${port}`)

  const clientSocket = new VirtualSocket(
    { address: host, port: 0 },
    { address: host, port }
  )
  const serverSocket = new VirtualSocket(
    { address: host, port },
    { address: '127.0.0.1', port: 0 }
  )
  clientSocket._peer = serverSocket
  serverSocket._peer = clientSocket

  if (callback) clientSocket.once('connect', callback)
  server._sockets.add(serverSocket)
  serverSocket.once('close', () => server._sockets.delete(serverSocket))

  queueTask(() => {
    if (clientSocket._closed) return
    server.emit('connection', serverSocket)
    clientSocket.emit('connect')
  })
  clientSocket.connected = true
  return clientSocket
}

const defaultProxy = {
  protocol: location.protocol === 'https:' ? 'wss:' : 'ws:',
  hostname: location.hostname,
  port: location.port,
  path: '/api/vm/net'
}

let proxy = { ...defaultProxy }

function getProxy () {
  return proxy
}

function hostWithPort () {
  return proxy.port ? `${proxy.hostname}:${proxy.port}` : proxy.hostname
}

function getProxyWsOrigin () {
  return `${proxy.protocol}//${hostWithPort()}`
}

function getProxyHttpOrigin () {
  const protocol = proxy.protocol === 'wss:' ? 'https:' : 'http:'
  return `${protocol}//${hostWithPort()}`
}

function setProxy (options = {}) {
  proxy = { ...defaultProxy }
  proxy.protocol = null
  let hostname = options.hostname || ''
  if (hostname) {
    let requestProtocol
    if (hostname.startsWith('http://')) {
      requestProtocol = 'ws:'
      hostname = hostname.slice(7)
    } else if (hostname.startsWith('https://')) {
      requestProtocol = 'wss:'
      hostname = hostname.slice(8)
    } else if (hostname.startsWith('ws://')) {
      requestProtocol = 'ws:'
      hostname = hostname.slice(5)
    } else if (hostname.startsWith('wss://')) {
      requestProtocol = 'wss:'
      hostname = hostname.slice(6)
    }

    const slash = hostname.indexOf('/')
    if (slash !== -1) {
      proxy.path = hostname.slice(slash).replace(/\/+$/, '')
      hostname = hostname.slice(0, slash)
    }
    proxy.hostname = hostname
    if (requestProtocol) proxy.protocol = requestProtocol
  }
  if (options.port) proxy.port = String(options.port)
  if (options.path) proxy.path = options.path.replace(/\/+$/, '')
  if (options.protocol) proxy.protocol = options.protocol

  if (!proxy.protocol) {
    const isLoopback = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(proxy.hostname)
    proxy.protocol = location.protocol === 'https:' || (options.hostname && !isLoopback) ? 'wss:' : 'ws:'
  }
}

function toNumber (x) { return (x = Number(x)) >= 0 ? x : false }
function isPipeName (s) { return typeof s === 'string' && toNumber(s) === false }

function normalizeConnectArgs (args) {
  const options = {}
  if (args[0] && typeof args[0] === 'object') {
    Object.assign(options, args[0])
  } else if (isPipeName(args[0])) {
    options.path = args[0]
  } else {
    options.port = args[0]
    if (typeof args[1] === 'string') options.host = args[1]
  }
  const cb = args[args.length - 1]
  return typeof cb === 'function' ? [options, cb] : [options]
}

function errorMessage (status, data) {
  let message = `Cannot open TCP connection [${status}]: ${JSON.stringify(data.error || data)}`
  if (status === 0) message = 'Cannot reach the proxy server'
  else if (status === 404) message = 'Cannot find the proxy server (404). Check the proxy address.'
  const code = data.error && data.error.code
  if (code === 'ENOTFOUND') message = 'Cannot find the server. Check the server IP you entered.'
  return message
}

class Socket extends Duplex {
  constructor (options) {
    super({ ...(typeof options === 'object' ? options : {}), autoDestroy: false })
    this._connecting = false
    this._host = null
    this._ws = null
    this._queue = []
    this._closed = false
    this._timeoutMs = 0
    this._timeoutTimer = null
    this._keepAliveTimer = null
    this.readable = false
    this.writable = false
    this.destroyed = false
    this.remoteAddress = null
    this.remoteFamily = null
    this.remotePort = null
    this.localAddress = null
    this.localPort = null
    this.bytesRead = 0
    this.bytesWritten = 0
  }

  listen () {
    throw new Error('Cannot listen in the browser')
  }

  address () {
    return {
      address: this.remoteAddress,
      port: this.remotePort,
      family: this.remoteFamily
    }
  }

  setNoDelay () {}
  setKeepAlive () {}

  setTimeout (msecs, callback) {
    if (callback) this.once('timeout', callback)
    this._timeoutMs = msecs
    clearTimeout(this._timeoutTimer)
    if (msecs > 0 && isFinite(msecs)) this._resetTimeout()
  }

  _resetTimeout () {
    if (!this._timeoutMs) return
    clearTimeout(this._timeoutTimer)
    this._timeoutTimer = setTimeout(() => {
      this.emit('timeout')
      this.destroy()
    }, this._timeoutMs)
  }

  _read () {}

  _write (chunk, encoding, cb) {
    if (typeof chunk === 'string') chunk = Buffer.from(chunk, encoding === 'binary' ? 'binary' : 'utf8')
    this._resetTimeout()
    if (this._connecting || !this._ws || this._ws.readyState !== WebSocket.OPEN) {
      this._queue.push(chunk)
      cb()
      return
    }
    this._send(chunk)
    cb()
  }

  _send (chunk) {
    try {
      this._ws.send(chunk)
      this.bytesWritten += chunk.length
    } catch (e) {
      this.destroy()
    }
  }

  write (chunk, encoding, cb) {
    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
      throw new TypeError('invalid data')
    }
    return super.write(chunk, encoding, cb)
  }

  end (data, encoding) {
    if (data) this.write(data, encoding)
    this.writable = false
    if (this._ws && this._ws.readyState === WebSocket.OPEN) this._ws.close()
    if (!this.readable) this.destroy()
    return this
  }

  destroy (err) {
    if (this.destroyed) return this
    this.destroyed = true
    this.readable = this.writable = false
    this._connecting = false
    clearTimeout(this._timeoutTimer)
    clearInterval(this._keepAliveTimer)
    if (err) this.emit('error', err)
    if (this._ws) {
      this._ws.onclose = null
      try { this._ws.close() } catch (e) {}
      this._ws = null
    }
    this.push(null)
    process.nextTick(() => this.emit('close', !!err))
    return this
  }

  connect (options, cb) {
    if (!options || typeof options !== 'object') {
      return this.connect(...normalizeConnectArgs(arguments))
    }
    if (options.path) throw new Error('options.path not supported in the browser')

    this._connecting = true
    this.readable = true
    this.writable = true
    this._host = options.host
    if (cb) this.once('connect', cb)

    const host = options.host || 'localhost'
    const port = options.port || 25565
    this._connectProxy(host, port)
    return this
  }

  async _connectProxy (host, port) {
    const controller = new AbortController()
    const abortTimer = setTimeout(() => controller.abort(), 20000)

    let res
    let data
    try {
      res = await fetch(`${getProxyHttpOrigin()}${proxy.path}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port }),
        signal: controller.signal
      })
      const text = await res.text()
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      this.emit('error', e.name === 'AbortError' ? 'The proxy server timed out' : 'Cannot reach the proxy server')
      this.destroy()
      return
    } finally {
      clearTimeout(abortTimer)
    }
    if (this.destroyed) return

    if (!res.ok || data.error !== undefined || !data.token) {
      this.emit('error', errorMessage(res.status, data))
      this.destroy()
      return
    }

    if (data.remote) {
      this.remoteAddress = data.remote.address
      this.remoteFamily = data.remote.family
      this.remotePort = data.remote.port
    }

    const url = `${getProxyWsOrigin()}${proxy.path}/socket?token=${encodeURIComponent(data.token)}`
    this._openWebSocket(url)
  }

  _openWebSocket (url) {
    let ws
    try {
      ws = new WebSocket(url)
    } catch (e) {
      this.emit('error', `Cannot connect to the proxy server: ${e.message}`)
      this.destroy()
      return
    }
    ws.binaryType = 'arraybuffer'
    this._ws = ws
    this._resetTimeout()

    ws.onopen = () => {
      this._connecting = false
      this.emit('connect')
      this.read(0)
      for (const chunk of this._queue) this._send(chunk)
      this._queue = []
      clearInterval(this._keepAliveTimer)
      this._keepAliveTimer = setInterval(() => {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) this._ws.send(`ping:${Date.now()}`)
      }, 30000)
    }

    ws.onmessage = async (event) => {
      const data = event.data
      if (typeof data === 'string') {
        if (data.startsWith('pong:')) this.emit('pong', data.slice(5))
        return
      }

      this._resetTimeout()
      let buffer
      if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(data))
      } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
        buffer = Buffer.from(new Uint8Array(await data.arrayBuffer()))
      } else {
        return
      }
      this.bytesRead += buffer.length
      this.push(buffer)
    }

    ws.onerror = () => {
      if (this.destroyed) return
      this.emit('error', 'Cannot connect to the proxy server')
      this.destroy()
    }

    ws.onclose = () => {
      if (this.destroyed) return
      this.readable = false
      this.writable = false
      this.push(null)
      this.destroy()
    }
  }
}

function connect (...args) {
  const [options, cb] = normalizeConnectArgs(args)
  const host = options.host || 'localhost'
  const port = Number(options.port || 25565)
  if (findVirtualServer(host, port)) {
    return connectVirtual(host, port, options, cb)
  }
  const socket = new Socket(options)
  return socket.connect(options, cb)
}

const isIPv4 = (input) => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(input)
const isIPv6 = (input) => /^((?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|::|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?::[0-9A-Fa-f]{1,4}){1,6}|:(?::[0-9A-Fa-f]{1,4}){1,7})$/.test(input)

const netModule = {
  Socket,
  Stream: Socket,
  connect,
  createConnection: connect,
  createServer,
  setProxy,
  getProxy,
  isIP: (input) => isIPv4(input) ? 4 : isIPv6(input) ? 6 : 0,
  isIPv4,
  isIPv6,
  _normalizeConnectArgs: normalizeConnectArgs
}

if (typeof window !== 'undefined') {
  window.__PMUI_VIRTUAL_NET__ = { createServer, connectVirtual, SINGLEPLAYER_HOST }
}

module.exports = netModule
