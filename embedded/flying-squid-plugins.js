'use strict'

// Webpack-compatible replacement for flying-squid's plugin loader.
// Upstream checks `!!require.context` as a value, which webpack does not
// expose; calling require.context directly lets webpack build the same map.

module.exports.builtinPlugins = null

const filterKeys = (keys) => keys.filter((key) => key !== './index.js' && key !== 'index.js')

module.exports.initPlugins = () => {
  if (module.exports.builtinPlugins) return
  const pluginsMap = require.context(
    '../node_modules/flying-squid/src/lib/plugins',
    false,
    /^(?!.*(?:external\.js$)).*\.js$/
  )
  module.exports.builtinPlugins = filterKeys(pluginsMap.keys()).map((key) => pluginsMap(key))
}
