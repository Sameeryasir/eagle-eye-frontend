const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Base Expo config
let config = getDefaultConfig(__dirname);

// Keep your react-native-svg-transformer config
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// Merge with metro default and apply nativewind
config = mergeConfig(config, {
  /* your custom metro options can go here */
});

module.exports = withNativeWind(config, { input: "./global.css" });
