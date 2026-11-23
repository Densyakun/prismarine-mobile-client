/* global THREE performance */

const { Vec3 } = require('vec3')
const { RaycastIterator } = require('prismarine-world').iterators

const NON_TARGETABLE = new Set([
  'air',
  'cave_air',
  'void_air',
  'water',
  'lava',
  'flowing_water',
  'flowing_lava',
  'bubble_column',
  'light'
])

function getViewDirection (pitch, yaw) {
  const csPitch = Math.cos(pitch)
  const snPitch = Math.sin(pitch)
  const csYaw = Math.cos(yaw)
  const snYaw = Math.sin(yaw)
  return new Vec3(-snYaw * csPitch, snPitch, -csYaw * csPitch)
}

function isTargetable (block) {
  if (!block) return false
  if (NON_TARGETABLE.has(block.name)) return false
  if (block.name.includes('air')) return false
  return true
}

/**
 * prismarine-world's raycast ignores blocks without a collision shape, which
 * makes tall grass, flowers and torches impossible to target. Treat those
 * blocks as a unit cube for targeting instead.
 */
function blockAtCursorIncludingPlants (bot, maxDistance) {
  if (!bot.entity || !bot.entity.position) return null
  const eye = bot.entity.position.offset(0, bot.entity.height, 0)
  const direction = getViewDirection(bot.entity.pitch, bot.entity.yaw)
  const iterator = new RaycastIterator(eye, direction, maxDistance)
  let pos = iterator.block

  while (pos) {
    const block = bot.blockAt(new Vec3(pos.x, pos.y, pos.z))
    if (block) {
      if (block.shapes && block.shapes.length) {
        const intersect = iterator.intersect(block.shapes, block.position)
        if (intersect) {
          block.face = intersect.face
          block.intersect = intersect.pos
          return block
        }
      } else if (isTargetable(block)) {
        const intersect = iterator.intersect([[0, 0, 0, 1, 1, 1]], block.position)
        if (intersect) {
          block.face = intersect.face
          block.intersect = intersect.pos
          return block
        }
      }
    }
    pos = iterator.next()
  }
  return null
}

function safeDig (bot, block) {
  try {
    const result = bot.dig(block, 'ignore')
    if (result && typeof result.catch === 'function') result.catch(() => {})
  } catch (e) {}
}

function safeStopDigging (bot) {
  try {
    const result = bot.stopDigging()
    if (result && typeof result.catch === 'function') result.catch(() => {})
  } catch (e) {}
}

class Cursor {
  constructor (viewer, renderer, bot) {
    // Init state
    this.buttons = [false, false, false]
    this.lastButtons = [false, false, false]
    this.digging = false
    this.breakStartTime = 0
    this.cursorBlock = null
    this.viewer = viewer
    this.renderer = renderer
    this.bot = bot

    // Setup graphics
    const blockGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001)
    this.cursorMesh = new THREE.LineSegments(new THREE.EdgesGeometry(blockGeometry), new THREE.LineBasicMaterial({ color: 0 }))
    this.cursorMesh.visible = false
    viewer.scene.add(this.cursorMesh)

    const loader = new THREE.TextureLoader()
    this.breakTextures = []
    for (let i = 0; i < 10; i++) {
      const texture = loader.load('textures/' + viewer.version + '/blocks/destroy_stage_' + i + '.png')
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      this.breakTextures.push(texture)
    }
    const breakMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.MultiplyBlending
    })
    this.blockBreakMesh = new THREE.Mesh(blockGeometry, breakMaterial)
    this.blockBreakMesh.visible = false
    this.blockBreakMesh.renderOrder = 999
    viewer.scene.add(this.blockBreakMesh)

    // Setup events
    document.addEventListener('mouseup', (e) => {
      this.buttons[e.button] = false
    })

    document.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== renderer.domElement) return
      this.buttons[e.button] = true

      if (e.button === 0) this.attack()
      if (e.button === 1) {
        e.preventDefault()
        this.pickBlock()
      }
    })
    this.lastPlaced = 4 // ticks since last placed
    bot.on('physicsTick', () => { if (this.lastPlaced < 4) this.lastPlaced++ })
  }

  /** Returns the entity the player is looking at within reach, or null. */
  findEntity () {
    const bot = this.bot
    const creative = (bot.player && bot.player.gamemode === 1) || (bot.game && bot.game.gameMode === 'creative')
    return bot.nearestEntity((e) => {
      if (!e.position || !e.isValid) return false
      if (e.position.distanceTo(bot.entity.position) <= (creative ? 5 : 3)) {
        const dir = getViewDirection(bot.entity.pitch, bot.entity.yaw)
        const { width, height } = e
        const { x: eX, y: eY, z: eZ } = e.position
        const { x: bX, y: bY, z: bZ } = bot.entity.position
        const box = new THREE.Box3(
          new THREE.Vector3(eX - width / 2, eY, eZ - width / 2),
          new THREE.Vector3(eX + width / 2, eY + height, eZ + width / 2)
        )

        const r = new THREE.Raycaster(
          new THREE.Vector3(bX, bY + 1.52, bZ),
          new THREE.Vector3(dir.x, dir.y, dir.z)
        )
        const int = r.ray.intersectBox(box, new THREE.Vector3(eX, eY, eZ))
        return int !== null
      }

      return false
    })
  }

  attack () {
    const entity = this.findEntity()
    if (entity) {
      this.bot.attack(entity)
      return true
    }
    try {
      this.bot.swingArm('right')
    } catch (e) {}
    return false
  }

  pickBlock () {
    const bot = this.bot
    if (!bot || !bot.creative) return false
    const creative = (bot.player && bot.player.gamemode === 1) || (bot.game && bot.game.gameMode === 'creative')
    if (!creative) return false
    const block = this.cursorBlock
    if (!block) return false
    const item = bot.registry.itemsByName[block.name]
    if (!item) return false
    const Item = require('prismarine-item')(bot.registry)
    const stack = new Item(item.id, item.stackSize || 64)
    const slot = bot.inventory.hotbarStart + (bot.quickBarSlot || 0)
    bot.creative.setInventorySlot(slot, stack).catch(() => {})
    return true
  }

  use () {
    const entity = this.findEntity()
    if (entity && entity.type !== 'object') {
      try {
        this.bot.activateEntity(entity)
        return
      } catch (e) {}
    }
    if (this.cursorBlock) {
      try {
        this.bot.activateBlock(this.cursorBlock)
        return
      } catch (e) {}
    }
    try {
      this.bot.activateItem()
    } catch (e) {}
  }

  place () {
    const bot = this.bot
    const cursorBlock = this.cursorBlock
    if (!cursorBlock) return false
    const vecArray = [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(1, 0, 0)]
    const delta = cursorBlock.intersect.minus(cursorBlock.position)
    bot._placeBlockWithOptions(cursorBlock, vecArray[cursorBlock.face], { delta, forceLook: 'ignore' }).catch(() => {})
    this.lastPlaced = 0
    return true
  }

  setDigging (on) {
    this.digging = on
    if (on) {
      this.breakStartTime = performance.now()
    } else {
      safeStopDigging(this.bot)
    }
  }

  update (bot) {
    let cursorBlock = blockAtCursorIncludingPlants(bot, 6)
    if (!bot.canDigBlock(cursorBlock)) cursorBlock = null

    let cursorChanged = !cursorBlock !== !this.cursorBlock
    if (cursorBlock && this.cursorBlock) {
      cursorChanged = !cursorBlock.position.equals(this.cursorBlock.position)
    }
    this.cursorChanged = cursorChanged

    // Place
    if (cursorBlock && this.buttons[2] && (!this.lastButtons[2] || cursorChanged) && this.lastPlaced >= 4) {
      this.place()
    }

    const shouldDig = this.buttons[0] || this.digging
    const wasDigging = this.lastButtons[0] || this.breakActive

    // Start break
    if (cursorBlock && shouldDig && (!wasDigging || cursorChanged)) {
      this.breakStartTime = performance.now()
      safeDig(bot, cursorBlock)
    }

    // Stop break
    if (!shouldDig && wasDigging) {
      safeStopDigging(bot)
    }

    // Show break animation
    if (cursorBlock && shouldDig) {
      const time = bot.digTime(cursorBlock)
      if (time > 0) {
        const elapsed = performance.now() - this.breakStartTime
        const state = Math.min(9, Math.floor((elapsed / time) * 10))
        this.blockBreakMesh.position.set(cursorBlock.position.x + 0.5, cursorBlock.position.y + 0.5, cursorBlock.position.z + 0.5)
        this.blockBreakMesh.material.map = this.breakTextures[state]
        this.blockBreakMesh.visible = true
      } else {
        this.blockBreakMesh.visible = false
      }
    } else {
      this.blockBreakMesh.visible = false
    }

    // Show cursor
    if (!cursorBlock) {
      this.cursorMesh.visible = false
    } else {
      this.cursorMesh.visible = true
      this.cursorMesh.position.set(cursorBlock.position.x + 0.5, cursorBlock.position.y + 0.5, cursorBlock.position.z + 0.5)
    }

    // Update state
    this.cursorBlock = cursorBlock
    this.lastButtons[0] = this.buttons[0]
    this.lastButtons[1] = this.buttons[1]
    this.lastButtons[2] = this.buttons[2]
    this.breakActive = this.digging
  }
}

module.exports = Cursor
