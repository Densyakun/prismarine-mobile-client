// @ts-check
const path = require('path')
const fs = require('fs')

function patchMinecraftData () {
  const dataPath = path.join(require.resolve('minecraft-data'), '../data.js')
  const lines = fs.readFileSync(dataPath, 'utf8').split('\n')
  if (lines[0] === '//patched') return

  function removeLinesBetween (start, end) {
    const startIndex = lines.findIndex(line => line === start)
    if (startIndex === -1) return
    const endIndex = startIndex + lines.slice(startIndex).findIndex(line => line === end)
    // insert block comments
    lines.splice(startIndex, 0, '/*')
    lines.splice(endIndex + 2, 0, '*/')
  }

  removeLinesBetween("  'bedrock': {", '  }')

  lines.unshift('//patched')
  fs.writeFileSync(dataPath, lines.join('\n'), 'utf8')
}

function patchFlyingSquidDrops () {
  // flying-squid drops blocks with a large upward/sideways velocity. Vanilla
  // drops start with a small horizontal-only velocity and then fall under
  // gravity. Patch the dependency at install time so this also applies on
  // Vercel.
  try {
    const squidDir = path.dirname(require.resolve('flying-squid'))
    const diggingPath = path.join(squidDir, 'src/lib/plugins/digging.js')
    if (!fs.existsSync(diggingPath)) return
    const originalVelocity = 'new Vec3(Math.random() * 4 - 2, Math.random() * 2 + 2, Math.random() * 4 - 2)'
    const fixedVelocity = 'new Vec3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2)'
    const source = fs.readFileSync(diggingPath, 'utf8')
    if (source.includes(originalVelocity)) {
      fs.writeFileSync(diggingPath, source.split(originalVelocity).join(fixedVelocity), 'utf8')
      console.log('Patched flying-squid block drop velocity')
    }
  } catch (e) {
    console.warn('Could not patch flying-squid drop velocity:', e.message)
  }
}

function patchFlyingSquidThrowVelocity () {
  try {
    const squidDir = path.dirname(require.resolve('flying-squid'))
    const inventoryPath = path.join(squidDir, 'src/lib/plugins/inventory.js')
    if (!fs.existsSync(inventoryPath)) return
    const original = 'velocity: new Vec3(0, 0, 0),'
    const fixed = 'velocity: new Vec3(-Math.sin(player.yaw || 0) * 0.3, 0.1, -Math.cos(player.yaw || 0) * 0.3),'
    const source = fs.readFileSync(inventoryPath, 'utf8')
    if (source.includes(original)) {
      fs.writeFileSync(inventoryPath, source.split(original).join(fixed), 'utf8')
      console.log('Patched flying-squid thrown item velocity')
    }
  } catch (e) {
    console.warn('Could not patch flying-squid throw velocity:', e.message)
  }
}

function patchFlyingSquidDropSlot () {
  try {
    const squidDir = path.dirname(require.resolve('flying-squid'))
    const inventoryPath = path.join(squidDir, 'src/lib/plugins/inventory.js')
    if (!fs.existsSync(inventoryPath)) return
    const original = `            const heldItem = player.inventory.slots[36 + player.heldItemSlot]
            serv.spawnObject(2, player.world, player.position, {
              velocity: new Vec3(-Math.sin(player.yaw || 0) * 0.45, 0.1, -Math.cos(player.yaw || 0) * 0.45),
              itemId: heldItem.type,
              itemDamage: heldItem.metadata,
              pickupTime: 1000,
              deathTime: 60 * 5 * 100
            })`
    const fixed = `            const heldItem = player.inventory.slots[clickInfo.slot]
            if (heldItem) {
              serv.spawnObject(2, player.world, player.position, {
                velocity: new Vec3(-Math.sin(player.yaw || 0) * 0.3, 0.1, -Math.cos(player.yaw || 0) * 0.3),
                itemId: heldItem.type,
                itemDamage: heldItem.metadata,
                pickupTime: 500,
                deathTime: 60 * 5 * 100
              })
            }`
    const source = fs.readFileSync(inventoryPath, 'utf8')
    if (source.includes(original)) {
      fs.writeFileSync(inventoryPath, source.replace(original, fixed), 'utf8')
      console.log('Patched flying-squid drop slot lookup')
    }
  } catch (e) {
    console.warn('Could not patch flying-squid drop slot:', e.message)
  }
}

function patchFlyingSquidDropEntityType () {
  try {
    const squidDir = path.dirname(require.resolve('flying-squid'))
    const inventoryPath = path.join(squidDir, 'src/lib/plugins/inventory.js')
    if (!fs.existsSync(inventoryPath)) return
    const original = 'serv.spawnObject(2, player.world, player.position, {'
    const fixed = 'serv.spawnObject((serv.registry.entitiesByName.item || serv.registry.entitiesByName.Item).id, player.world, player.position.offset(-Math.sin(player.yaw || 0) * 0.4, 0.6, -Math.cos(player.yaw || 0) * 0.4), {'
    const source = fs.readFileSync(inventoryPath, 'utf8')
    if (source.includes(original)) {
      fs.writeFileSync(inventoryPath, source.split(original).join(fixed), 'utf8')
      console.log('Patched flying-squid drop entity type and position')
    }
  } catch (e) {
    console.warn('Could not patch flying-squid drop entity type:', e.message)
  }
}

function patchFlyingSquidDropTuning () {
  try {
    const squidDir = path.dirname(require.resolve('flying-squid'))
    const inventoryPath = path.join(squidDir, 'src/lib/plugins/inventory.js')
    if (!fs.existsSync(inventoryPath)) return
    let source = fs.readFileSync(inventoryPath, 'utf8')
    source = source.replaceAll(
      'player.position.offset(-Math.sin(player.yaw || 0) * 0.4, 0.6, -Math.cos(player.yaw || 0) * 0.4)',
      'player.position.offset(-Math.sin(player.yaw || 0) * 0.6, 0.6, -Math.cos(player.yaw || 0) * 0.6)'
    )
    source = source.replaceAll(
      'new Vec3(-Math.sin(player.yaw || 0) * 0.3, 0.1, -Math.cos(player.yaw || 0) * 0.3)',
      'new Vec3(-Math.sin(player.yaw || 0) * 0.45, 0.1, -Math.cos(player.yaw || 0) * 0.45)'
    )
    source = source.replaceAll('pickupTime: 500,', 'pickupTime: 1000,')
    fs.writeFileSync(inventoryPath, source, 'utf8')
  } catch (e) {
    console.warn('Could not tune flying-squid drops:', e.message)
  }
}

function patchPrismarineWindowsDrop () {
  try {
    const windowsDir = path.dirname(require.resolve('prismarine-windows'))
    const windowPath = path.join(windowsDir, 'lib/Window.js')
    if (!fs.existsSync(windowPath)) return
    const original = `    dropClick (click) {
      const { item } = click
      if (this.selectedItem || item === null) return []
      if (click.mouseButton === 0) {
        if (--click.item.count === 0) this.updateSlot(click.slot, null)
        return [click.slot]
      } else if (click.mouseButton === 1) {
        this.updateSlot(click.slot, null)
        return [click.slot]
      }
    }`
    const fixed = `    dropClick (click) {
      const item = click.item === undefined ? this.slots[click.slot] : click.item
      if (this.selectedItem || !item) return []
      if (click.mouseButton === 0) {
        if (--item.count === 0) this.updateSlot(click.slot, null)
        return [click.slot]
      } else if (click.mouseButton === 1) {
        this.updateSlot(click.slot, null)
        return [click.slot]
      }
    }`
    const source = fs.readFileSync(windowPath, 'utf8')
    if (source.includes(original)) {
      fs.writeFileSync(windowPath, source.replace(original, fixed), 'utf8')
      console.log('Patched prismarine-windows dropClick')
    }
  } catch (e) {
    console.warn('Could not patch prismarine-windows:', e.message)
  }
}

patchMinecraftData()
patchFlyingSquidDrops()
patchFlyingSquidThrowVelocity()
patchFlyingSquidDropSlot()
patchFlyingSquidDropEntityType()
patchFlyingSquidDropTuning()
patchPrismarineWindowsDrop()
