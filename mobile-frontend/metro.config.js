const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle 3D model assets
config.resolver.assetExts.push('glb', 'gltf', 'obj', 'mtl', 'bin');

module.exports = withNativeWind(config, { input: './global.css' });
