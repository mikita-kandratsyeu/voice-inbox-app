module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
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
