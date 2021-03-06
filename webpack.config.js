const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
	mode: 'development',
	entry: './src/prototype.js',
	output: {
		path: path.resolve(__dirname, './build'),
		filename: 'bundle.js'
	},
	plugins: [
		new CopyWebpackPlugin([{
			from: 'static',
			to: '.'
		}])
	],
  devServer: {
		contentBase: path.join(__dirname, 'build'),
		compress: true,
		port: process.env.PORT || 1337
  }
};
