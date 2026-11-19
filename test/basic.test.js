/* eslint-env mocha */

const assert = require('assert')
const { sanitizeWorldName, parseGameMode } = require('../server-lib/singleplayer')

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
