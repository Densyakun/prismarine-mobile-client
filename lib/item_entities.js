/* global Image */

const invsprite = require('./invsprite.json')

function findItemStack (metadata) {
  if (!Array.isArray(metadata)) return null
  return metadata.find((entry) => entry && typeof entry === 'object' && entry.itemId !== undefined) || null
}

/**
 * prismarine-viewer has no model for dropped item entities, so it falls back to
 * a magenta box and logs "Unknown entity item". Draw a small billboard with the
 * item's inventory icon instead and keep the viewer away from those entities.
 */
function attachItemEntities ({ bot, viewer, mcData }) {
  const THREE = global.THREE
  const entityIds = new Set()
  const sprites = new Map()

  let image = null
  try {
    image = new Image()
    image.src = 'invsprite.png'
  } catch (e) {}

  function iconTexture (itemName) {
    const sprite = invsprite[itemName] || invsprite.air
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (image && image.complete && image.naturalWidth) {
      ctx.drawImage(image, sprite.x, sprite.y, 32, 32, 0, 0, 32, 32)
    } else {
      ctx.fillStyle = '#d8d8d8'
      ctx.fillRect(0, 0, 32, 32)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    return texture
  }

  function addSprite (entity) {
    if (!entity || sprites.has(entity.id)) return
    const stack = findItemStack(entity.metadata)
    const item = stack ? mcData.items[stack.itemId] : null
    const material = new THREE.SpriteMaterial({
      map: iconTexture(item ? item.name : 'air'),
      transparent: true,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(0.45, 0.45, 0.45)
    sprite.position.set(entity.position.x, entity.position.y + 0.25, entity.position.z)
    viewer.scene.add(sprite)
    sprites.set(entity.id, sprite)
    entityIds.add(entity.id)
  }

  function removeSprite (id) {
    const sprite = sprites.get(id)
    if (!sprite) return
    viewer.scene.remove(sprite)
    if (sprite.material.map) sprite.material.map.dispose()
    sprite.material.dispose()
    sprites.delete(id)
  }

  function onSpawn (entity) {
    if (!entity || entity.name !== 'item') return
    addSprite(entity)
  }

  function onMoved (entity) {
    if (!entity || !entityIds.has(entity.id)) return
    const sprite = sprites.get(entity.id)
    if (!sprite) return
    const current = bot.entities[entity.id]
    if (current && current.position) sprite.position.set(current.position.x, current.position.y + 0.25, current.position.z)
  }

  function onGone (entity) {
    if (!entity || !entityIds.has(entity.id)) return
    removeSprite(entity.id)
  }

  // Keep prismarine-viewer from creating its fallback box for item entities.
  const originalUpdateEntity = viewer.updateEntity.bind(viewer)
  viewer.updateEntity = (entity) => {
    if (!entity) return
    if (entity.name === 'item' || entityIds.has(entity.id)) return
    originalUpdateEntity(entity)
  }

  bot.on('entitySpawn', onSpawn)
  bot.on('entityMoved', onMoved)
  bot.on('entityGone', onGone)

  // Pick up item entities that already existed when the viewer started.
  for (const entity of Object.values(bot.entities)) {
    if (entity && entity.name === 'item') addSprite(entity)
  }

  return {
    remove () {
      bot.removeListener('entitySpawn', onSpawn)
      bot.removeListener('entityMoved', onMoved)
      bot.removeListener('entityGone', onGone)
      for (const id of sprites.keys()) removeSprite(id)
    }
  }
}

module.exports = { attachItemEntities }
