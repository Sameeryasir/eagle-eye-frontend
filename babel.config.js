module.exports = function (api) {
  api.cache(false);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowUndefined: true,
          safe: false,
          verbose: false,
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
