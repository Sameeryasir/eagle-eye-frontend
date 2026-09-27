module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowUndefined: true,
          safe: true,
          verbose: false,
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
