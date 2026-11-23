'use strict'

const { Volume, createFsFromVolume } = require('memfs')
const worldStore = require('./world_store')

const ROOT = '/world'

const volume = new Volume()
const fs = createFsFromVolume(volume)

async function readSavedWorld (name) {
  return worldStore.get(name)
}

async function writeSavedWorld (name, data) {
  return worldStore.put(name, data)
}

async function worldExists (name) {
  const saved = await worldStore.get(name)
  return saved !== null
}

async function listWorlds () {
  const names = await worldStore.keys()
  return names.sort().map((name) => ({ name }))
}

async function deleteWorld (name) {
  await worldStore.remove(name)
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
  __persistWorld: persistWorld,
  __worldExists: worldExists,
  __listWorlds: listWorlds,
  __deleteWorld: deleteWorld
})

module.exports = exported
