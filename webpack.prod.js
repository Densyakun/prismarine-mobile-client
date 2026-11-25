const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

const LodashModuleReplacementPlugin = require('lodash-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MinimizerPlugin = require('minimizer-webpack-plugin')
const webpack = require('webpack')

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true,
    // Webpack's default minimizer starts one worker per CPU. The bundle is
    // large (all Minecraft data) and low-memory build machines OOM there.
    minimizer: [new MinimizerPlugin({ parallel: 1 })]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new LodashModuleReplacementPlugin()
  ]
})
