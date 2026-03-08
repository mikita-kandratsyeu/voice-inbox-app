module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        allowUndefined: true,
      },
    ],
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@/': './src',
          '@/app': './src/app',
          '@/entities': './src/entities',
          '@/features': './src/features',
          '@/screens': './src/screens',
          '@/shared': './src/shared',
          '@/widgets': './src/widgets',
        },
      },
    ],
  ],
};
