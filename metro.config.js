<<<<<<< HEAD
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
=======
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
>>>>>>> 6fe383932a51d4dd736598b6d65f339aa0e43f47

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
