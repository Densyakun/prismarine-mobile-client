'use strict'

// Trimmed replacement for minecraft-data/data.js used by the in-browser
// singleplayer engine. It only exposes the versions we bundle instead of every
// Minecraft version, which keeps the lazily loaded engine small enough for
// mobile. Keep the entries in sync with lib/versions.js and the 1.18.2 entry of
// minecraft-data/data.js.
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
    },
    '1.20.1': {
      get attributes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.17/attributes.json') },
      get blocks () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/blocks.json') },
      get blockCollisionShapes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/blockCollisionShapes.json') },
      get biomes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/biomes.json') },
      get effects () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/effects.json') },
      get items () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/items.json') },
      get enchantments () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/enchantments.json') },
      get recipes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/recipes.json') },
      get instruments () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/instruments.json') },
      get materials () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/materials.json') },
      get language () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/language.json') },
      get entities () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/entities.json') },
      get protocol () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/protocol.json') },
      get windows () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.16.1/windows.json') },
      get version () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20.1/version.json') },
      get foods () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/foods.json') },
      get particles () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/particles.json') },
      get blockLoot () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/blockLoot.json') },
      get entityLoot () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/entityLoot.json') },
      get loginPacket () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/loginPacket.json') },
      get tints () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/tints.json') },
      get mapIcons () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.16/mapIcons.json') },
      get sounds () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20.1/sounds.json') },
      proto: 'minecraft-data/data/pc/1.20/proto.yml'
    },
    '1.21.4': {
      get attributes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.3/attributes.json') },
      get blocks () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/blocks.json') },
      get blockCollisionShapes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/blockCollisionShapes.json') },
      get biomes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/biomes.json') },
      get effects () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/effects.json') },
      get items () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/items.json') },
      get enchantments () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.1/enchantments.json') },
      get recipes () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/recipes.json') },
      get instruments () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20.5/instruments.json') },
      get materials () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/materials.json') },
      get language () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/language.json') },
      get entities () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/entities.json') },
      get protocol () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/protocol.json') },
      get windows () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.16.1/windows.json') },
      get version () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/version.json') },
      get foods () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.1/foods.json') },
      get particles () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/particles.json') },
      get blockLoot () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/blockLoot.json') },
      get entityLoot () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20/entityLoot.json') },
      get loginPacket () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.3/loginPacket.json') },
      get tints () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/tints.json') },
      get mapIcons () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20.2/mapIcons.json') },
      get commands () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.20.5/commands.json') },
      get sounds () { return require('../node_modules/minecraft-data/minecraft-data/data/pc/1.21.4/sounds.json') },
      proto: 'minecraft-data/data/pc/1.21.4/proto.yml'
    }
  }
}
