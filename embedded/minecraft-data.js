'use strict'

// Trimmed replacement for minecraft-data/data.js used by the in-browser
// singleplayer engine. It only exposes 1.18.2 instead of every Minecraft
// version, which keeps the lazily loaded engine small enough for mobile.
// Keep this in sync with the 1.18.2 entry of minecraft-data/data.js.
module.exports = {
  pc: {
    '1.18.2': {
      get attributes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/attributes.json') },
      get blocks () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/blocks.json') },
      get blockCollisionShapes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/blockCollisionShapes.json') },
      get biomes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/biomes.json') },
      get effects () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/effects.json') },
      get items () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/items.json') },
      get enchantments () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/enchantments.json') },
      get recipes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/recipes.json') },
      get instruments () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.16.1/instruments.json') },
      get materials () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/materials.json') },
      get language () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18.2/language.json') },
      get entities () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/entities.json') },
      get protocol () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18.2/protocol.json') },
      get windows () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.16.1/windows.json') },
      get version () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18.2/version.json') },
      get foods () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/foods.json') },
      get particles () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/particles.json') },
      get blockLoot () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/blockLoot.json') },
      get entityLoot () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/entityLoot.json') },
      get loginPacket () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18.2/loginPacket.json') },
      get tints () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/tints.json') },
      get mapIcons () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.16/mapIcons.json') },
      get sounds () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.18/sounds.json') },
      proto: 'minecraft-data/data/pc/1.18.2/proto.yml'
    }
  }
}
