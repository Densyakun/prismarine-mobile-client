'use strict'

// Versions offered in the "Join a Server" screen. Each entry maps to an
// existing prismarine-viewer texture atlas (newer patches of a major version
// reuse the newest atlas of that major), so keep the last patch of each major
// that we want to expose.
const JOIN_VERSIONS = [
  '1.16.5',
  '1.17.1',
  '1.18.2',
  '1.19.4',
  '1.20.1',
  '1.20.4',
  '1.20.6',
  '1.21.1',
  '1.21.4',
  '1.21.8',
  '26.3'
]

// Versions the bundled singleplayer (flying-squid) can generate. The in-browser
// engine only bundles data for these, so keep them in sync with
// embedded/minecraft-data.js.
const SINGLEPLAYER_VERSIONS = ['1.18.2', '1.20.1', '1.21.4']

const DEFAULT_SINGLEPLAYER_VERSION = '1.20.1'

module.exports = {
  JOIN_VERSIONS,
  SINGLEPLAYER_VERSIONS,
  DEFAULT_SINGLEPLAYER_VERSION
}
