module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      'nativewind/babel',
    ],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        allowUndefined: true,
        safe: true, // Allow missing .env file
        verbose: false, // Reduce console output
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
