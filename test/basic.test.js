/* eslint-env mocha */

const assert = require('assert')
const { sanitizeWorldName, parseGameMode } = require('../server-lib/singleplayer')
const { staticSuggestions } = require('../lib/commands')

describe('basic', () => {
  it('test', () => {

  })
})

describe('singleplayer', () => {
  it('sanitizes world names', () => {
    assert.strictEqual(sanitizeWorldName('My World!'), 'My_World')
    assert.strictEqual(sanitizeWorldName('../../etc/passwd'), 'etc_passwd')
    assert.strictEqual(sanitizeWorldName(''), 'world')
    assert.strictEqual(sanitizeWorldName(null), 'world')
  })

  it('parses game modes', () => {
    assert.strictEqual(parseGameMode('creative'), 1)
    assert.strictEqual(parseGameMode('survival'), 0)
    assert.strictEqual(parseGameMode(1), 1)
    assert.strictEqual(parseGameMode(0), 0)
    assert.strictEqual(parseGameMode('unknown'), 0)
  })
})

describe('command autocomplete', () => {
  it('suggests command names', () => {
    const values = staticSuggestions('/ga', {}).map((suggestion) => suggestion.value)
    assert.ok(values.includes('gamemode'))
    assert.ok(values.includes('gamerule'))
  })

  it('suggests command arguments', () => {
    const values = staticSuggestions('/gamemode c', {}).map((suggestion) => suggestion.value)
    assert.deepStrictEqual(values, ['creative'])
  })

  it('suggests registry item names', () => {
    const values = staticSuggestions('/give @p sto', { items: ['stone', 'dirt'] })
      .map((suggestion) => suggestion.value)
    assert.deepStrictEqual(values, ['stone'])
  })

  it('ignores non-command input', () => {
    assert.deepStrictEqual(staticSuggestions('hello', {}), [])
  })
})
