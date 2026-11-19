/* global indexedDB */

'use strict'

const { Volume, createFsFromVolume } = require('memfs')

const DB_NAME = 'pmui-singleplayer'
const STORE = 'worlds'
const ROOT = '/world'

const volume = new Volume()
const fs = createFsFromVolume(volume)

function openDb () {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readSavedWorld (name) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(name)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

async function writeSavedWorld (name, data) {
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

function snapshot (dir, files) {
  let entries
  try {
    entries = volume.readdirSync(dir)
  } catch (e) {
    return files
  }
  for (const entry of entries) {
    const full = `${dir === '/' ? '' : dir}/${entry}`
    const stat = volume.statSync(full)
    if (stat.isDirectory()) {
      snapshot(full, files)
    } else if (stat.isFile()) {
      files[full] = volume.readFileSync(full).toString('base64')
    }
  }
  return files
}

function restore (files) {
  for (const [file, base64] of Object.entries(files)) {
    const slash = file.lastIndexOf('/')
    if (slash > 0) volume.mkdirSync(file.slice(0, slash), { recursive: true })
    volume.writeFileSync(file, Buffer.from(base64, 'base64'))
  }
}

async function restoreWorld (name) {
  volume.reset()
  if (!name) return
  try {
    const saved = await readSavedWorld(name)
    if (saved) restore(saved)
  } catch (e) {
    console.warn('[singleplayer] could not restore the world:', e.message)
  }
}

async function persistWorld (name) {
  if (!name) return
  try {
    const files = snapshot('/', {})
    await writeSavedWorld(name, files)
  } catch (e) {
    console.warn('[singleplayer] could not save the world:', e.message)
  }
}

function reset () {
  volume.reset()
}

const exported = Object.assign(fs, {
  __volume: volume,
  __root: ROOT,
  __reset: reset,
  __restoreWorld: restoreWorld,
  __persistWorld: persistWorld
})

module.exports = exported
