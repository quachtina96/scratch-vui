const path = require('path');

module.exports = {
  entry: './src/prototype.js',
  output: {
    filename: 'prototype_bundle.js',
    path: path.resolve(__dirname, 'src')
  },
	node: {
	   fs: "empty"
	}
};