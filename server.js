#!/usr/bin/env node

'use strict'

const express = require('express')
const compression = require('compression')
const path = require('path')
const { createProxy } = require('./server-lib/proxy')
const { requestDeviceCode, pollDeviceCode, refreshSession } = require('./server-lib/auth')
const { createSingleplayerManager } = require('./server-lib/singleplayer')
const config = require('./config.json')

const app = express()

const singleplayer = createSingleplayerManager({ defaultVersion: config.defaultSingleplayerVersion })

app.disable('x-powered-by')

function noStore (_, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

app.get('/config.json', (_, res) => res.sendFile(path.join(__dirname, 'config.json')))

app.get('/singleplayer', (_, res) => res.redirect('/?singleplayer=1'))

app.post('/api/auth/device', noStore, async (_, res) => {
  try {
    res.json(await requestDeviceCode())
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

app.post('/api/auth/poll', noStore, express.json(), async (req, res) => {
  try {
    res.json(await pollDeviceCode(req.body?.deviceCode))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/auth/refresh', noStore, express.json(), async (req, res) => {
  try {
    res.json({ session: await refreshSession(req.body?.refreshToken) })
  } catch (e) {
    res.status(401).json({ error: e.message, code: e.code })
  }
})

app.post('/api/sessionserver/session/minecraft/join', express.json(), async (req, res) => {
  try {
    const upstream = await fetch('https://sessionserver.mojang.com/session/minecraft/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    if (upstream.status === 204) {
      res.status(204).end()
      return
    }
    res.status(upstream.status).json({ error: (await upstream.text()).slice(0, 500) })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

app.get('/api/singleplayer/status', noStore, (_, res) => {
  res.json(singleplayer.status())
})

app.get('/api/singleplayer/worlds', noStore, (_, res) => {
  res.json({ worlds: singleplayer.listWorlds() })
})

app.post('/api/singleplayer/delete', noStore, express.json(), async (req, res) => {
  try {
    const deleted = await singleplayer.deleteWorld(req.body?.world)
    res.json({ deleted, worlds: singleplayer.listWorlds() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/singleplayer/start', noStore, express.json(), async (req, res) => {
  try {
    res.json(await singleplayer.start(req.body || {}))
  } catch (e) {
    res.status(503).json({ error: e.message })
  }
})

app.post('/api/singleplayer/stop', noStore, async (_, res) => {
  await singleplayer.stop()
  res.json({ running: false })
})

app.use(compression())

const proxy = createProxy({
  urlRoot: '/api/vm/net',
  isTrustedTarget: (host, port) => singleplayer.isTrustedTarget(host, port)
})
app.post('/api/vm/net/connect', express.json(), proxy.connect)
app.options('/api/vm/net/connect', proxy.connect)

if (process.argv[3] === 'dev') {
  // https://webpack.js.org/guides/development/#using-webpack-dev-middleware
  const webpackDevMiddleware = require('webpack-dev-middleware')
  const config = require('./webpack.dev.js')
  const embedded = require('./webpack.embedded.js')
  const embeddedConfig = {
    ...embedded,
    mode: 'development',
    devtool: false,
    optimization: { minimize: false },
    output: {
      ...embedded.output,
      publicPath: '/'
    }
  }
  const webpack = require('webpack')
  const compiler = webpack([config, embeddedConfig])

  app.use(webpackDevMiddleware(compiler))
} else {
  app.use(express.static(path.join(__dirname, './public')))
}

const server = app.listen(process.argv[2] === undefined ? 8080 : process.argv[2], function () {
  console.log('Server listening on port ' + server.address().port)
})
proxy.attach(server)

async function shutdown () {
  await singleplayer.stop()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
