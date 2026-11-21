// Client-side command metadata used by the chat input autocomplete.
//
// Server tab-completions are merged on top of these candidates. The table
// fills the gap for servers (including the embedded singleplayer world) that
// do not support the tab-complete packet, and gives suggestions a short human
// readable description. When a server advertises its command tree, that list
// replaces the built-in names so unavailable commands are not offered.

const SELECTORS = ['@a', '@p', '@r', '@s', '@e']

const GAME_MODES = ['survival', 'creative', 'adventure', 'spectator']
const DIFFICULTIES = ['peaceful', 'easy', 'normal', 'hard']
const TIME_ACTIONS = ['add', 'set', 'query']
const TIME_VALUES = ['day', 'noon', 'night', 'midnight', 'daytime', 'gametime']
const WEATHER_TYPES = ['clear', 'rain', 'thunder']
const GAMERULES = [
  'commandBlockOutput',
  'doDaylightCycle',
  'doWeatherCycle',
  'doMobSpawning',
  'mobGriefing',
  'keepInventory',
  'naturalRegeneration',
  'fallDamage',
  'fireDamage',
  'doFireTick',
  'randomTickSpeed',
  'spawnRadius',
  'showCoordinates'
]
const SCOREBOARD_ACTIONS = ['objectives', 'players']
const TAG_ACTIONS = ['add', 'remove', 'list']
const TEAM_ACTIONS = ['add', 'remove', 'empty', 'join', 'leave', 'list', 'modify']
const TITLE_ACTIONS = ['title', 'subtitle', 'actionbar', 'clear', 'reset', 'times']
const ADVANCEMENT_ACTIONS = ['grant', 'revoke']
const ADVANCEMENT_VALUES = ['everything', 'only', 'from', 'through', 'until']
const RECIPE_ACTIONS = ['give', 'take']
const LOCATE_TYPES = ['biome', 'structure', 'poi']

const COMMANDS = [
  { name: 'help', usage: '/help [command]', args: ['command'] },
  { name: 'gamemode', usage: '/gamemode <mode> [player]', args: [GAME_MODES, 'target'] },
  { name: 'time', usage: '/time <add|set|query> [value]', args: [TIME_ACTIONS, timeValue] },
  { name: 'weather', usage: '/weather <clear|rain|thunder> [duration]', args: [WEATHER_TYPES, 'number'] },
  { name: 'difficulty', usage: '/difficulty <peaceful|easy|normal|hard>', args: [DIFFICULTIES] },
  { name: 'give', usage: '/give <player> <item> [count]', args: ['target', 'item', 'count'] },
  { name: 'clear', usage: '/clear [player] [item]', args: ['target', 'item'] },
  { name: 'kill', usage: '/kill [target]', args: ['target'] },
  { name: 'tp', usage: '/tp <target> [destination]', args: ['target', 'target'] },
  { name: 'teleport', usage: '/teleport <target> [destination]', args: ['target', 'target'] },
  { name: 'effect', usage: '/effect <give|clear> <player> [effect] [seconds] [amplifier]', args: [['give', 'clear'], 'target', 'effect', 'number', 'number'] },
  { name: 'enchant', usage: '/enchant <player> <enchantment> [level]', args: ['target', 'enchantment', 'number'] },
  { name: 'xp', usage: '/xp <add|set|query> <amount> [player]', args: [['add', 'set', 'query'], 'count', 'target'] },
  { name: 'experience', usage: '/experience <add|set|query> <amount> [player]', args: [['add', 'set', 'query'], 'count', 'target'] },
  { name: 'summon', usage: '/summon <entity> [x y z]', args: ['entity', 'number', 'number', 'number'] },
  { name: 'setblock', usage: '/setblock <x> <y> <z> <block>', args: ['number', 'number', 'number', 'block'] },
  { name: 'fill', usage: '/fill <x1> <y1> <z1> <x2> <y2> <z2> <block>', args: ['number', 'number', 'number', 'number', 'number', 'number', 'block'] },
  { name: 'clone', usage: '/clone <x1> <y1> <z1> <x2> <y2> <z2> <x> <y> <z>', args: ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'] },
  { name: 'particle', usage: '/particle <name> [x y z]', args: ['particle', 'number', 'number', 'number'] },
  { name: 'playsound', usage: '/playsound <sound> <source> <player>', args: ['sound', 'string', 'target'] },
  { name: 'stopsound', usage: '/stopsound <player> [source] [sound]', args: ['target', 'string', 'sound'] },
  { name: 'title', usage: '/title <player> <title|subtitle|actionbar|times> ...', args: ['target', TITLE_ACTIONS, 'string'] },
  { name: 'tellraw', usage: '/tellraw <player> <json>', args: ['target', 'string'] },
  { name: 'msg', usage: '/msg <player> <message>', args: ['target', 'string'] },
  { name: 'tell', usage: '/tell <player> <message>', args: ['target', 'string'] },
  { name: 'w', usage: '/w <player> <message>', args: ['target', 'string'] },
  { name: 'say', usage: '/say <message>', args: ['string'] },
  { name: 'me', usage: '/me <message>', args: ['string'] },
  { name: 'list', usage: '/list' },
  { name: 'seed', usage: '/seed' },
  { name: 'spawnpoint', usage: '/spawnpoint [player] [x y z]', args: ['target', 'number', 'number', 'number'] },
  { name: 'setworldspawn', usage: '/setworldspawn [x y z]', args: ['number', 'number', 'number'] },
  { name: 'gamerule', usage: '/gamerule <rule> [value]', args: [GAMERULES, ['true', 'false', 'number']] },
  { name: 'locate', usage: '/locate <biome|structure|poi> <value>', args: [LOCATE_TYPES, 'string'] },
  { name: 'advancement', usage: '/advancement <grant|revoke> <player> <value>', args: [ADVANCEMENT_ACTIONS, 'target', ADVANCEMENT_VALUES] },
  { name: 'recipe', usage: '/recipe <give|take> <player> <recipe>', args: [RECIPE_ACTIONS, 'target', 'string'] },
  { name: 'function', usage: '/function <name>', args: ['string'] },
  { name: 'scoreboard', usage: '/scoreboard <objectives|players> ...', args: [SCOREBOARD_ACTIONS, 'string'] },
  { name: 'tag', usage: '/tag <player> <add|remove|list> [name]', args: ['target', TAG_ACTIONS, 'string'] },
  { name: 'team', usage: '/team <add|remove|join|leave|list|modify> [name]', args: [TEAM_ACTIONS, 'string'] },
  { name: 'execute', usage: '/execute ...' },
  { name: 'op', usage: '/op <player>', args: ['target'] },
  { name: 'deop', usage: '/deop <player>', args: ['target'] },
  { name: 'kick', usage: '/kick <player> [reason]', args: ['target', 'string'] },
  { name: 'ban', usage: '/ban <player> [reason]', args: ['target', 'string'] },
  { name: 'pardon', usage: '/pardon <player>', args: ['target'] },
  { name: 'whitelist', usage: '/whitelist <add|remove|list> [player]', args: [['add', 'remove', 'list', 'on', 'off'], 'target'] },
  { name: 'save-all', usage: '/save-all' },
  { name: 'save-on', usage: '/save-on' },
  { name: 'save-off', usage: '/save-off' },
  { name: 'reload', usage: '/reload' },
  { name: 'stop', usage: '/stop' },
  { name: 'damage', usage: '/damage <target> <amount>', args: ['target', 'number'] },
  { name: 'ping', usage: '/ping [number]', args: ['number'] },
  { name: 'version', usage: '/version' },
  { name: 'bug', usage: '/bug' },
  { name: 'selector', usage: '/selector <selector>', args: ['target'] },
  { name: 'modpe', usage: '/modpe <params>', args: ['string'] }
]

const COMMANDS_BY_NAME = {}
for (const command of COMMANDS) COMMANDS_BY_NAME[command.name] = command

function timeValue (previous) {
  if (previous === 'set') return TIME_VALUES
  if (previous === 'add') return ['1', '1000', '6000', '12000']
  if (previous === 'query') return ['daytime', 'gametime']
  return TIME_ACTIONS
}

function typeValues (type, context) {
  switch (type) {
    case 'target':
      return SELECTORS.concat(context.players || [])
    case 'player':
      return context.players || []
    case 'item':
      return context.items || []
    case 'block':
      return context.blocks || []
    case 'entity':
      return context.entities || []
    case 'effect':
      return context.effects || []
    case 'enchantment':
      return context.enchantments || []
    case 'particle':
      return context.particles || []
    case 'sound':
      return context.sounds || []
    case 'count':
      return ['1', '8', '16', '32', '64']
    case 'command':
      return COMMANDS.map((command) => command.name)
    default:
      return []
  }
}

function resolveArg (spec, previous, context) {
  if (Array.isArray(spec)) return spec
  if (typeof spec === 'function') return spec(previous, context) || []
  return typeValues(spec, context)
}

function tokenize (input) {
  const text = input.startsWith('/') ? input.slice(1) : input
  const tokens = text.split(/\s+/)
  if (!tokens.length) tokens.push('')
  return {
    tokens,
    current: tokens[tokens.length - 1] || '',
    endsWithSpace: /\s$/.test(text)
  }
}

function matches (candidates, current) {
  const needle = current.toLowerCase()
  const normalized = needle.replace(/ /g, '_')
  const out = []
  const seen = new Set()
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue
    const value = String(candidate)
    const lower = value.toLowerCase()
    if (!(lower.startsWith(needle) || lower.startsWith(normalized))) continue
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(value)
  }
  if (out.length === 0 && needle.length >= 2) {
    for (const candidate of candidates) {
      if (candidate === undefined || candidate === null) continue
      const value = String(candidate)
      const lower = value.toLowerCase()
      if (!(lower.includes(needle) || lower.includes(normalized))) continue
      if (seen.has(lower)) continue
      seen.add(lower)
      out.push(value)
    }
  }
  return out
}

function commandSuggestions (current, limit, extra = []) {
  let names
  if (Array.isArray(extra) && extra.length) {
    names = []
    for (const name of extra) {
      if (name && names.indexOf(name) === -1) names.push(name)
    }
  } else {
    names = COMMANDS.map((command) => command.name)
  }
  const list = matches(names, current)
  return list.slice(0, limit).map((name) => {
    const command = COMMANDS_BY_NAME[name]
    return {
      value: name,
      label: '/' + name,
      detail: command ? command.usage : '',
      kind: 'command'
    }
  })
}

/**
 * Builds autocomplete candidates for the current chat input.
 *
 * @param {string} input raw input, usually starting with "/"
 * @param {object} context candidate lists ({ players, items, blocks, ... })
 * @param {number} [limit]
 * @returns {Array<{value: string, label: string, detail: string, kind: string}>}
 */
function staticSuggestions (input, context = {}, limit = 12) {
  if (!input.startsWith('/')) return []
  const { tokens, current, endsWithSpace } = tokenize(input)
  const commandToken = (tokens[0] || '').toLowerCase()

  if (tokens.length <= 1 && !endsWithSpace) {
    return commandSuggestions(commandToken, limit, context.commands || [])
  }

  const command = COMMANDS_BY_NAME[commandToken]
  if (!command || !command.args) return []

  const argIndex = tokens.length - 2
  const previous = argIndex > 0 ? tokens[argIndex] : undefined
  const spec = command.args[argIndex]
  if (spec === undefined) return []

  return matches(resolveArg(spec, previous, context), current)
    .slice(0, limit)
    .map((value) => ({
      value,
      label: value,
      detail: '',
      kind: 'arg'
    }))
}

module.exports = {
  staticSuggestions,
  commandNames: COMMANDS.map((command) => command.name)
}
