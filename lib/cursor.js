/* global THREE performance */

const { Vec3 } = require('vec3')

function getViewDirection (pitch, yaw) {
  const csPitch = Math.cos(pitch)
  const snPitch = Math.sin(pitch)
  const csYaw = Math.cos(yaw)
  const snYaw = Math.sin(yaw)
  return new Vec3(-snYaw * csPitch, snPitch, -csYaw * csPitch)
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
    })
    this.lastPlaced = 4 // ticks since last placed
    bot.on('physicsTick', () => { if (this.lastPlaced < 4) this.lastPlaced++ })
  }

  /** Returns the entity the player is looking at within reach, or null. */
  findEntity () {
    const bot = this.bot
    return bot.nearestEntity((e) => {
      if (!e.position || !e.isValid) return false
      if (e.position.distanceTo(bot.entity.position) <= (bot.player.gamemode === 1 ? 5 : 3)) {
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

  use () {
    const entity = this.findEntity()
    if (entity) {
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
    bot._placeBlockWithOptions(cursorBlock, vecArray[cursorBlock.face], { delta, forceLook: 'ignore' })
    this.lastPlaced = 0
    return true
  }

  setDigging (on) {
    this.digging = on
    if (on) {
      this.breakStartTime = performance.now()
    } else {
      try {
        this.bot.stopDigging()
      } catch (e) {}
    }
  }

  update (bot) {
    let cursorBlock = bot.blockAtCursor(6)
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
      try {
        bot.dig(cursorBlock, 'ignore')
      } catch (e) {} // we don't care if its aborted
    }

    // Stop break
    if (!shouldDig && wasDigging) {
      try {
        bot.stopDigging()
      } catch (e) {}
    }

    // Show break animation
    if (cursorBlock && shouldDig) {
      const elapsed = performance.now() - this.breakStartTime
      const time = bot.digTime(cursorBlock)
      const state = Math.min(9, Math.floor((elapsed / time) * 10))
      this.blockBreakMesh.position.set(cursorBlock.position.x + 0.5, cursorBlock.position.y + 0.5, cursorBlock.position.z + 0.5)
      this.blockBreakMesh.material.map = this.breakTextures[state]
      this.blockBreakMesh.visible = true
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
