module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Required by react-native-vision-camera frame processors.
      // Must be last in the plugin list.
      "react-native-worklets-core/plugin",
    ],
  };
};
