/* global window */

// `net` adapter for the in-browser singleplayer server bundle.
// The actual loopback implementation lives in the main client bundle so that
// mineflayer and the embedded server share the same virtual sockets.

function getBridge () {
  const bridge = typeof window !== 'undefined' ? window.__PMUI_VIRTUAL_NET__ : null
  if (!bridge) throw new Error('The in-browser network bridge is not ready')
  return bridge
}

function createServer (...args) {
  return getBridge().createServer(...args)
}

function connect (...args) {
  return getBridge().connectVirtual(...args)
}

module.exports = {
  createServer,
  connect,
  createConnection: connect,
  isIP: () => 0
}
