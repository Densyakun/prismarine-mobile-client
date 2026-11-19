'use strict'

// crypto-browserify predates Node's KeyObject API. minecraft-protocol creates
// public keys unconditionally when a client connects, even in offline mode, so
// provide minimal KeyObject-compatible wrappers.

const crypto = require('crypto-browserify')

function toKeyObject (key) {
  let der = null
  let pem = null
  if (typeof key === 'string') {
    pem = key
  } else if (key && key.key !== undefined) {
    if (typeof key.key === 'string') pem = key.key
    else if (Buffer.isBuffer(key.key)) der = key.key
  } else if (Buffer.isBuffer(key)) {
    der = key
  }

  return {
    type: 'public',
    export (options) {
      if (pem) return options && options.format === 'der' ? Buffer.from(pem) : pem
      return der || Buffer.alloc(0)
    },
    toString () {
      return pem || der ? (pem || der.toString('base64')) : ''
    }
  }
}

if (typeof crypto.createPublicKey !== 'function') {
  crypto.createPublicKey = (key) => toKeyObject(key)
}

if (typeof crypto.createPrivateKey !== 'function') {
  crypto.createPrivateKey = (key) => {
    const object = toKeyObject(key)
    object.type = 'private'
    return object
  }
}

module.exports = crypto
