// @ts-check
//
// Prepares the installed dependencies so the client can run modern Minecraft
// versions (26.3 by default).
//
// The published npm packages do not include 26.3 support yet (the PrismarineJS
// PRs are still open), so this script:
//   - injects the vendored 26.3 data into `minecraft-data`,
//   - teaches `prismarine-chunk` the 26.3 chunk/light format,
//   - enables the 26.3 version-gated `prismarine-physics` features,
//   - aliases the newest bundled `prismarine-viewer` assets to 26.3.
//
// Only the viewer files the client actually loads are aliased (block atlas,
// block states and the destroy-stage overlays) so the build does not duplicate
// the whole ~3300 file texture tree.

const path = require('path')
const fs = require('fs')

const TARGET_VERSION = '26.3'
const BASE_VERSION = '26.1'
// Ordered from most to least accurate. 26.1 is used when the installed viewer
// already bundles it, otherwise we fall back to the newest bundled assets.
const ASSET_FALLBACK_VERSIONS = ['26.1', '1.21.4', '1.21.1']

// Generated from the 26.3 data branch (PrismarineJS/minecraft-data#1345).
// 26.3 has its own registries; only the icon and window data are shared.
const DATA_PATHS_263 = {
  attributes: 'pc/26.3',
  blockCollisionShapes: 'pc/26.3',
  blocks: 'pc/26.3',
  blockLoot: 'pc/26.3',
  biomes: 'pc/26.3',
  commands: 'pc/26.3',
  effects: 'pc/26.3',
  enchantments: 'pc/26.3',
  entities: 'pc/26.3',
  entityLoot: 'pc/26.3',
  foods: 'pc/26.3',
  instruments: 'pc/26.3',
  items: 'pc/26.3',
  language: 'pc/26.3',
  loginPacket: 'pc/26.3',
  mapIcons: 'pc/1.20.2',
  materials: 'pc/26.3',
  particles: 'pc/26.3',
  protocol: 'pc/26.3',
  recipes: 'pc/26.3',
  sounds: 'pc/26.3',
  tints: 'pc/26.3',
  version: 'pc/26.3',
  windows: 'pc/1.20.3',
  proto: 'pc/26.3'
}

function resolvePackageDir (name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`))
  } catch (err) {
    return path.dirname(require.resolve(name))
  }
}

function readJSON (file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJSON (file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function removeLinesBetween (lines, start, end) {
  const startIndex = lines.findIndex(line => line === start)
  if (startIndex === -1) return
  const endIndex = startIndex + lines.slice(startIndex).findIndex(line => line === end)
  // insert block comments
  lines.splice(startIndex, 0, '/*')
  lines.splice(endIndex + 2, 0, '*/')
}

function injectMinecraftData () {
  let packageDir
  try {
    packageDir = resolvePackageDir('minecraft-data')
  } catch (err) {
    console.warn('[patchPackages] minecraft-data is not installed, skipping')
    return
  }

  const dataDir = path.join(packageDir, 'minecraft-data', 'data')
  const vendorDir = path.join(__dirname, '..', 'vendor', 'minecraft-data', 'pc', TARGET_VERSION)
  if (!fs.existsSync(vendorDir)) {
    console.warn(`[patchPackages] vendor data for ${TARGET_VERSION} is missing, skipping minecraft-data injection`)
    return
  }

  // 1. Copy the vendored 26.3 data (protocol, registries and the shared
  //    1.20.3 window layout) into the installed data tree.
  const targetVersionDir = path.join(dataDir, 'pc', TARGET_VERSION)
  fs.mkdirSync(targetVersionDir, { recursive: true })
  for (const file of fs.readdirSync(vendorDir)) {
    fs.copyFileSync(path.join(vendorDir, file), path.join(targetVersionDir, file))
  }
  const vendorRoot = path.join(__dirname, '..', 'vendor', 'minecraft-data', 'pc')
  const sharedWindows = path.join(vendorRoot, '1.20.3', 'windows.json')
  if (fs.existsSync(sharedWindows)) {
    const windowsDir = path.join(dataDir, 'pc', '1.20.3')
    fs.mkdirSync(windowsDir, { recursive: true })
    fs.copyFileSync(sharedWindows, path.join(windowsDir, 'windows.json'))
  }

  // 2. Register the version in dataPaths.json.
  const dataPathsFile = path.join(dataDir, 'dataPaths.json')
  const dataPaths = readJSON(dataPathsFile)
  dataPaths.pc = dataPaths.pc || {}
  if (!dataPaths.pc[TARGET_VERSION]) {
    dataPaths.pc[TARGET_VERSION] = Object.assign({}, DATA_PATHS_263)
    writeJSON(dataPathsFile, dataPaths)
    console.log(`[patchPackages] registered minecraft-data ${TARGET_VERSION}`)
  } else if (JSON.stringify(dataPaths.pc[TARGET_VERSION]) !== JSON.stringify(DATA_PATHS_263)) {
    dataPaths.pc[TARGET_VERSION] = Object.assign({}, DATA_PATHS_263)
    writeJSON(dataPathsFile, dataPaths)
  }

  // 3. Advertise the version in the supported-versions list.
  const versionsFile = path.join(dataDir, 'pc', 'common', 'versions.json')
  const versions = readJSON(versionsFile)
  if (!versions.includes(TARGET_VERSION)) {
    versions.push(TARGET_VERSION)
    writeJSON(versionsFile, versions)
  }

  // 4. Add the matching entry to the generated data.js used at runtime/bundle time.
  patchDataJs(path.join(packageDir, 'data.js'))
}

function patchDataJs (dataFile) {
  let text = fs.readFileSync(dataFile, 'utf8')
  let changed = false

  // Drop a previously generated entry so it can be rebuilt against the current
  // mapping (idempotent upgrades).
  if (text.includes(`'${TARGET_VERSION}': {`)) {
    const existingStart = text.indexOf(`\n    '${TARGET_VERSION}': {`)
    const existingEnd = text.indexOf('\n    }', existingStart + 1)
    if (existingStart !== -1 && existingEnd !== -1) {
      let existingEndExclusive = existingEnd + '\n    }'.length
      if (text[existingEndExclusive] === ',') existingEndExclusive += 1
      text = text.slice(0, existingStart) + text.slice(existingEndExclusive)
      changed = true
    }
  }

  if (!text.includes(`'${TARGET_VERSION}': {`)) {
    const anchor = `\n    '${BASE_VERSION}': {`
    const start = text.indexOf(anchor)
    if (start === -1) throw new Error(`[patchPackages] could not find ${BASE_VERSION} in minecraft-data data.js`)
    const blockStart = start + 1
    const blockEnd = text.indexOf('\n    }', blockStart)
    if (blockEnd === -1) throw new Error(`[patchPackages] could not find the end of ${BASE_VERSION} in data.js`)
    const blockEndExclusive = blockEnd + '\n    }'.length
    let block = text.slice(blockStart, blockEndExclusive)
    block = block.replace(`'${BASE_VERSION}': {`, `'${TARGET_VERSION}': {`)

    // Point every getter at its 26.3 data file.
    for (const [name, dir] of Object.entries(DATA_PATHS_263)) {
      if (name === 'proto') continue
      const getter = new RegExp(`(get ${name} \\(\\) \\{ return require\\("\\.\\/minecraft-data\\/data\\/)[^"\\n]+(\\/${name}\\.json"\\) \\})`)
      block = block.replace(getter, `$1${dir}$2`)
    }
    block = block.replace(
      /proto: __dirname \+ '\/minecraft-data\/data\/[^']+'/,
      `proto: __dirname + '/minecraft-data/data/${DATA_PATHS_263.proto}/proto.yml'`
    )
    text = text.slice(0, blockEndExclusive) + ',\n' + block + text.slice(blockEndExclusive)
    changed = true
  }

  // Strip bedrock: the browser client never uses it and the bundle is huge.
  if (text.split('\n')[0] !== '//patched') {
    const lines = text.split('\n')
    removeLinesBetween(lines, "  'bedrock': {", '  }')
    lines.unshift('//patched')
    text = lines.join('\n')
    changed = true
  }

  if (changed) {
    fs.writeFileSync(dataFile, text, 'utf8')
    console.log(`[patchPackages] patched minecraft-data data.js for ${TARGET_VERSION}`)
  }
}

function patchViewer () {
  let packageDir
  try {
    packageDir = resolvePackageDir('prismarine-viewer')
  } catch (err) {
    console.warn('[patchPackages] prismarine-viewer is not installed, skipping')
    return
  }

  // Let the viewer accept the new version instead of alerting "not supported".
  const versionFile = path.join(packageDir, 'viewer', 'lib', 'version.js')
  if (fs.existsSync(versionFile)) {
    let text = fs.readFileSync(versionFile, 'utf8')
    if (!text.includes(`'${TARGET_VERSION}'`)) {
      text = text.replace('const supportedVersions = [', `const supportedVersions = ['${TARGET_VERSION}', `)
      fs.writeFileSync(versionFile, text, 'utf8')
      console.log(`[patchPackages] added ${TARGET_VERSION} to prismarine-viewer supported versions`)
    }
  }

  // Alias the newest bundled assets to the new version.
  const texturesDir = path.join(packageDir, 'public', 'textures')
  const statesDir = path.join(packageDir, 'public', 'blocksStates')
  const targetPng = path.join(texturesDir, `${TARGET_VERSION}.png`)
  const targetFolder = path.join(texturesDir, TARGET_VERSION)
  const targetStates = path.join(statesDir, `${TARGET_VERSION}.json`)

  if (fs.existsSync(targetPng) && fs.existsSync(targetFolder) && fs.existsSync(targetStates)) {
    return
  }

  const source = ASSET_FALLBACK_VERSIONS.find(version =>
    fs.existsSync(path.join(texturesDir, `${version}.png`)) &&
    fs.existsSync(path.join(texturesDir, version)) &&
    fs.existsSync(path.join(statesDir, `${version}.json`)))

  if (!source) {
    console.warn(`[patchPackages] no bundled prismarine-viewer assets found to alias for ${TARGET_VERSION}`)
    return
  }

  fs.copyFileSync(path.join(texturesDir, `${source}.png`), targetPng)

  const sourceBlocks = path.join(texturesDir, source, 'blocks')
  const targetBlocks = path.join(targetFolder, 'blocks')
  if (fs.existsSync(sourceBlocks)) {
    fs.mkdirSync(targetBlocks, { recursive: true })
    for (const file of fs.readdirSync(sourceBlocks)) {
      if (file.startsWith('destroy_stage_') && file.endsWith('.png')) {
        fs.copyFileSync(path.join(sourceBlocks, file), path.join(targetBlocks, file))
      }
    }
  }

  fs.copyFileSync(path.join(statesDir, `${source}.json`), targetStates)
  console.log(`[patchPackages] aliased prismarine-viewer ${source} assets to ${TARGET_VERSION}`)
}

function patchPrismarineChunk () {
  let packageDir
  try {
    packageDir = resolvePackageDir('prismarine-chunk')
  } catch (err) {
    console.warn('[patchPackages] prismarine-chunk is not installed, skipping')
    return
  }

  // 26.2/26.3 use the 1.18+ chunk format.
  const indexPath = path.join(packageDir, 'src', 'index.js')
  if (fs.existsSync(indexPath)) {
    let text = fs.readFileSync(indexPath, 'utf8')
    if (!text.includes('26.3: require(') && text.includes("26.1: require('./pc/1.18/chunk')")) {
      text = text.replace(
        "26.1: require('./pc/1.18/chunk')",
        "26.1: require('./pc/1.18/chunk'),\n    26.2: require('./pc/1.18/chunk'),\n    26.3: require('./pc/1.18/chunk')"
      )
      fs.writeFileSync(indexPath, text, 'utf8')
      console.log('[patchPackages] added 26.3 chunk implementation mapping')
    }
  }

  // 26.3 (protocol 777) encodes light-section masks as raw bytes instead of longs.
  const columnPath = path.join(packageDir, 'src', 'pc', '1.18', 'ChunkColumn.js')
  if (fs.existsSync(columnPath)) {
    let text = fs.readFileSync(columnPath, 'utf8')
    if (!text.includes('lightMasksAreByteArrays')) {
      text = text.replace(
        "  const hasFluidCount = mcData.version['>=']('26.1')",
        "  const hasFluidCount = mcData.version['>=']('26.1')\n" +
        "  const lightMasksAreByteArrays = mcData.version['>=']('26.3')"
      )
      text = text.replace(
        'const incomingLightMask = BitArray.fromLongArray(pLightMask, 1)',
        'const incomingLightMask = lightMasksAreByteArrays ? BitArray.fromByteArray(pLightMask, 1) : BitArray.fromLongArray(pLightMask, 1)'
      )
      text = text.replace(
        'const incomingEmptyMask = BitArray.fromLongArray(pEmptyMask, 1)',
        'const incomingEmptyMask = lightMasksAreByteArrays ? BitArray.fromByteArray(pEmptyMask, 1) : BitArray.fromLongArray(pEmptyMask, 1)'
      )
      text = text.replace(
        '        skyLightMask: this.skyLightMask.toLongArray(),\n' +
        '        blockLightMask: this.blockLightMask.toLongArray(),\n' +
        '        emptySkyLightMask: this.emptySkyLightMask.toLongArray(),\n' +
        '        emptyBlockLightMask: this.emptyBlockLightMask.toLongArray()',
        '        skyLightMask: lightMasksAreByteArrays ? this.skyLightMask.toByteArray() : this.skyLightMask.toLongArray(),\n' +
        '        blockLightMask: lightMasksAreByteArrays ? this.blockLightMask.toByteArray() : this.blockLightMask.toLongArray(),\n' +
        '        emptySkyLightMask: lightMasksAreByteArrays ? this.emptySkyLightMask.toByteArray() : this.emptySkyLightMask.toLongArray(),\n' +
        '        emptyBlockLightMask: lightMasksAreByteArrays ? this.emptyBlockLightMask.toByteArray() : this.emptyBlockLightMask.toLongArray()'
      )
      fs.writeFileSync(columnPath, text, 'utf8')
      console.log('[patchPackages] patched 26.3 light-section mask codec')
    }
  }

  const bitArrayPath = path.join(packageDir, 'src', 'pc', 'common', 'BitArrayNoSpan.js')
  if (fs.existsSync(bitArrayPath)) {
    let text = fs.readFileSync(bitArrayPath, 'utf8')
    if (!text.includes('fromByteArray')) {
      text = text.replace(
        '  static fromLongArray (array, bitsPerValue) {',
        '  toByteArray () {\n' +
        '    const bytes = []\n' +
        '    for (let i = 0; i < this.capacity; i++) {\n' +
        '      const byteIndex = i >> 3\n' +
        '      const bitIndex = i & 7\n' +
        '      if (!bytes[byteIndex]) bytes[byteIndex] = 0\n' +
        '      if (this.get(i)) bytes[byteIndex] |= (1 << bitIndex)\n' +
        '    }\n' +
        '    let end = bytes.length\n' +
        '    while (end > 0 && !bytes[end - 1]) end--\n' +
        '    return bytes.slice(0, end)\n' +
        '  }\n\n' +
        '  static fromLongArray (array, bitsPerValue) {'
      )
      text = text.replace(
        '  static or (a, b) {',
        '  static fromByteArray (bytes, bitsPerValue) {\n' +
        '    const bitArray = new BitArray({\n' +
        '      capacity: Math.floor(8 / bitsPerValue) * bytes.length,\n' +
        '      bitsPerValue\n' +
        '    })\n' +
        '    for (let i = 0; i < bytes.length; i++) {\n' +
        '      const byte = bytes[i]\n' +
        '      for (let b = 0; b < 8; b++) {\n' +
        '        if ((byte >> b) & 1) {\n' +
        '          bitArray.set(i * 8 + b, 1)\n' +
        '        }\n' +
        '      }\n' +
        '    }\n' +
        '    return bitArray\n' +
        '  }\n\n' +
        '  static or (a, b) {'
      )
      fs.writeFileSync(bitArrayPath, text, 'utf8')
      console.log('[patchPackages] added byte-array light mask helpers')
    }
  }
}

function patchPrismarinePhysics () {
  let packageDir
  try {
    packageDir = resolvePackageDir('prismarine-physics')
  } catch (err) {
    console.warn('[patchPackages] prismarine-physics is not installed, skipping')
    return
  }

  const featuresFile = path.join(packageDir, 'lib', 'features.json')
  if (!fs.existsSync(featuresFile)) return

  const features = readJSON(featuresFile)
  let changed = false
  for (const name of ['proportionalLiquidGravity', 'climbUsingJump']) {
    const feature = features.find(entry => entry.name === name)
    if (!feature) continue
    for (const version of ['26.2', '26.3']) {
      if (!feature.versions.includes(version)) {
        feature.versions.push(version)
        changed = true
      }
    }
  }

  if (changed) {
    writeJSON(featuresFile, features)
    console.log('[patchPackages] enabled 26.3 physics features')
  }
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

function patchFlyingSquidTabComplete () {
  // flying-squid writes the pre-1.13 tab_complete packet shape (an array of
  // strings). Modern protocols expect matches to be objects with a `match`
  // field, so serializing the old shape throws and can take the embedded
  // server down as soon as the client asks for a completion.
  try {
    const squidDir = path.dirname(require.resolve('flying-squid'))
    const tabCompletePath = path.join(squidDir, 'src/lib/plugins/tabComplete.js')
    if (!fs.existsSync(tabCompletePath)) return
    const original = `  const sendTabComplete = (matches, existingContent) => {
    player._client.write('tab_complete', {
      matches: matches.filter((match) => match.startsWith(existingContent))
    })
  }`
    const fixed = `  const sendTabComplete = (matches, existingContent) => {
    const filtered = matches.filter((match) => match.startsWith(existingContent))
    if (serv.registry.version['>=']('1.13')) {
      player._client.write('tab_complete', {
        transactionId: 0,
        start: 0,
        length: existingContent.length,
        matches: filtered.map((match) => ({ match, tooltip: undefined }))
      })
    } else {
      player._client.write('tab_complete', {
        matches: filtered
      })
    }
  }`
    const source = fs.readFileSync(tabCompletePath, 'utf8')
    if (source.includes(original)) {
      fs.writeFileSync(tabCompletePath, source.replace(original, fixed), 'utf8')
      console.log('Patched flying-squid tab completion packet')
    }
  } catch (e) {
    console.warn('Could not patch flying-squid tab completion:', e.message)
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

injectMinecraftData()
patchFlyingSquidDrops()
patchFlyingSquidThrowVelocity()
patchFlyingSquidDropSlot()
patchFlyingSquidDropEntityType()
patchFlyingSquidDropTuning()
patchFlyingSquidTabComplete()
patchViewer()
patchPrismarineChunk()
patchPrismarinePhysics()
patchPrismarineWindowsDrop()
