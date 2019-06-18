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
	watch: true,
  devServer: {
		contentBase: path.join(__dirname, 'dist'),
		compress: true,
		port: process.env.PORT || 1337
  }
};
