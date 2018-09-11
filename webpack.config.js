const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    app: './src/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist/static'),
    filename: '[name].bundle.js',
    publicPath: '/static'
  },
  devtool: 'source-map',
  devServer: {
    clientLogLevel: 'warning',
    contentBase: './dist',
    hot: true,
    host: '0.0.0.0',
    port: '3030',
  },
  // resolve: {
  //   extensions: ['.js', '.json'],
  //   alias: {
  //     'src': path.resolve(__dirname, 'src')
  //   }
  // },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [path.resolve(__dirname, 'src')]
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(['dist/static']),
    new HtmlWebpackPlugin({
      filename: '../index.html',
      template: 'index.html',
      inject: true
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(), // HMR shows correct file names in console on update.
  ]
};