'use strict'

// Small behaviour fixes applied to the embedded flying-squid worlds. They are
// shared by the in-browser server and the self-hosted Node server so both use
// the same vanilla rules.

// Vanilla loot for grass-like plants. flying-squid's block loot data drops the
// plant itself even without shears (and ignores the drop chance), which lets
// grass/ferns dupe themselves. Keep only what vanilla would drop.
const PLANT_DROPS = {
  grass: { shears: { item: 'grass', count: 1 }, other: null },
  short_grass: { shears: { item: 'grass', count: 1 }, other: null },
  fern: { shears: { item: 'fern', count: 1 }, other: null },
  tall_grass: { shears: { item: 'grass', count: 2 }, other: { item: 'wheat_seeds', count: 1, chance: 0.125 } },
  large_fern: { shears: { item: 'fern', count: 2 }, other: { item: 'wheat_seeds', count: 1, chance: 0.125 } }
}

function isShears (item) {
  return !!(item && typeof item.name === 'string' && item.name.endsWith('shears'))
}

function applyPlantDropFix (player, serv, data) {
  if (!data || !Array.isArray(data.drops) || !data.drops.length) return
  const blockName = data.block && data.block.name
  // Before the flattening (1.13) the `grass` id is the grass block itself, not
  // the plant; only apply the plant rule when the separate block exists.
  if (blockName === 'grass' && !serv.registry.blocksByName.grass_block) return
  const rule = PLANT_DROPS[blockName]
  if (!rule) return

  const held = player.inventory && player.inventory.slots[36 + (player.heldItemSlot || 0)]
  const chosen = isShears(held) ? rule.shears : rule.other
  const base = data.drops[0]

  data.drops.length = 0
  if (!chosen) return
  if (chosen.chance && Math.random() > chosen.chance) return

  const item = serv.registry.itemsByName[chosen.item]
  if (!item) return

  base.blockDropId = item.id
  base.blockDropCount = chosen.count
  base.blockDropDamage = 0
  data.drops.push(base)
}

/**
 * Installs the vanilla plant drops listener on a flying-squid server.
 * @param {import('flying-squid').MCServer} server
 */
function installVanillaDrops (server) {
  server.on('newPlayer', (player) => {
    player.on('dug', (data, cancelled) => {
      if (cancelled) return
      applyPlantDropFix(player, server, data)
    })
  })
}

let playerDataPatched = false

/**
 * The game mode chosen on the singleplayer screen must win over the game mode
 * stored in the world's playerdata, otherwise switching an existing world from
 * survival to creative keeps sending survival in the login packet.
 */
function forceSelectedGameMode () {
  if (playerDataPatched) return
  let playerDat
  try {
    playerDat = require('flying-squid/src/lib/playerDat')
  } catch (e) {
    return
  }
  if (!playerDat || typeof playerDat.read !== 'function') return
  playerDataPatched = true

  const read = playerDat.read
  playerDat.read = async function (...args) {
    const data = await read.apply(this, args)
    if (data && data.player) delete data.player.gameMode
    return data
  }
}

module.exports = {
  installVanillaDrops,
  forceSelectedGameMode,
  applyPlantDropFix,
  PLANT_DROPS
}
