/* global indexedDB */

'use strict'

// Minimal IndexedDB wrapper for saved singleplayer worlds. It is shared by the
// in-browser filesystem (embedded/browser_fs.js) and the client so the world
// list can be shown without loading the whole singleplayer engine.
//
// Each entry maps a world name to an object of { [filePath]: base64Contents }.

const DB_NAME = 'pmui-singleplayer'
const STORE = 'worlds'
const DB_VERSION = 1

function openDb () {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function keys () {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).getAllKeys()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function get (name) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(name)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function put (name, data) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(data, name)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

async function remove (name) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(name)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

module.exports = {
  DB_NAME,
  STORE,
  openDb,
  keys,
  get,
  put,
  remove
}
