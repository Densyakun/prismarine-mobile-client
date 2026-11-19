#!/usr/bin/env node

'use strict'

// Standalone net-browserify compatible proxy. Deploy this to any host that
// supports long lived connections (Render, Fly.io, Railway, a VPS, Docker, ...)
// when you do not want to rely on a public community proxy.
//
// Usage:
//   PORT=8080 node proxy-server.js
//   -> set "Proxy" in the client to wss://your-host.example.com

const express = require('express')
const { createProxy } = require('./server-lib/proxy')

const port = Number(process.env.PORT || 8080)
const app = express()

app.disable('x-powered-by')

const proxy = createProxy({ urlRoot: '/api/vm/net' })

app.get('/', (_, res) => res.json({ ok: true, service: 'minecraft-websocket-tcp-proxy' }))
app.post('/api/vm/net/connect', express.json(), proxy.connect)
app.options('/api/vm/net/connect', proxy.connect)

const server = app.listen(port, () => {
  console.log(`Proxy listening on port ${server.address().port}`)
})
proxy.attach(server)
