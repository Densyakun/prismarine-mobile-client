#!/usr/bin/env node

'use strict'

const express = require('express')
const compression = require('compression')
const path = require('path')
const { createProxy } = require('./server-lib/proxy')
const { requestDeviceCode, pollDeviceCode, refreshSession } = require('./server-lib/auth')

const app = express()

app.disable('x-powered-by')

function noStore (_, res, next) {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

app.get('/config.json', (_, res) => res.sendFile(path.join(__dirname, 'config.json')))

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

app.use(compression())

const proxy = createProxy({ urlRoot: '/api/vm/net' })
app.post('/api/vm/net/connect', express.json(), proxy.connect)
app.options('/api/vm/net/connect', proxy.connect)

if (process.argv[3] === 'dev') {
  // https://webpack.js.org/guides/development/#using-webpack-dev-middleware
  const webpackDevMiddleware = require('webpack-dev-middleware')
  const config = require('./webpack.dev.js')
  const webpack = require('webpack')
  const compiler = webpack(config)

  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath
    })
  )
} else {
  app.use(express.static(path.join(__dirname, './public')))
}

const server = app.listen(process.argv[2] === undefined ? 8080 : process.argv[2], function () {
  console.log('Server listening on port ' + server.address().port)
})
proxy.attach(server)
