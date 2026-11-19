const webpack = require('webpack')
const path = require('path')

// Builds the in-browser singleplayer engine as a separate, lazily loaded
// script. It must not touch the public/ directory apart from writing its own
// output file, because the main client build runs first.
module.exports = {
  mode: 'production',
  target: 'web',
  entry: path.resolve(__dirname, './embedded/singleplayer-server.js'),
  output: {
    path: path.resolve(__dirname, './public'),
    filename: 'singleplayer-server.js',
    chunkFilename: 'singleplayer-server.[id].js',
    publicPath: './',
    clean: false
  },
  resolve: {
    alias: {
      'minecraft-protocol': path.resolve(
        __dirname,
        'node_modules/minecraft-protocol/src/index.js'
      ),
      express: false,
      fs: path.resolve(__dirname, 'embedded/browser_fs.js'),
      net: path.resolve(__dirname, 'embedded/virtual_net.js'),
      crypto: path.resolve(__dirname, 'embedded/crypto_shim.js'),
      dns: path.resolve(__dirname, 'lib/dns.js'),
      readline: false,
      needle: false,
      jose: false,
      '@azure/msal-node': false,
      canvas: false,
      perf_hooks: path.resolve(__dirname, 'lib/perf_hooks_replacement.js')
    },
    fallback: {
      assert: require.resolve('assert/'),
      buffer: require.resolve('buffer/'),
      child_process: false,
      constants: require.resolve('constants-browserify'),
      crypto: require.resolve('crypto-browserify'),
      events: require.resolve('events/'),
      http: require.resolve('http-browserify'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      timers: require.resolve('timers-browserify'),
      tls: false,
      url: require.resolve('url/'),
      util: require.resolve('util/'),
      vm: false,
      zlib: require.resolve('browserify-zlib')
    }
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /^\.\/(index|lib\/plugins)$|^\.\.\/lib\/plugins$/,
      (resource) => {
        const context = (resource.context || '').replace(/\\/g, '/')
        if (!context.includes('/flying-squid/src')) return
        resource.request = path.resolve(__dirname, 'embedded/flying-squid-plugins.js')
      }
    ),
    new webpack.NormalModuleReplacementPlugin(
      /^\.\/data\.js$/,
      (resource) => {
        const context = (resource.context || '').replace(/\\/g, '/')
        if (!context.endsWith('/node_modules/minecraft-data')) return
        resource.request = path.resolve(__dirname, 'embedded/minecraft-data.js')
      }
    ),
    new webpack.IgnorePlugin({ resourceRegExp: /^esbuild-import-glob/ }),
    new webpack.DefinePlugin({
      'process.platform': JSON.stringify('browser'),
      'process.browser': 'true'
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ],
  performance: {
    hints: false
  }
}
