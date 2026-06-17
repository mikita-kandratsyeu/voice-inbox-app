module.exports = function (api) {
  api.cache(() => process.env.NODE_ENV ?? '');
  const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  const envFile = nodeEnv === 'production' ? '.env.production' : '.env';
  console.log(`[babel] NODE_ENV=${nodeEnv} → @env from ${envFile}`);

  return {
    presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: envFile,
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
      'react-native-worklets/plugin',
    ],
  };
};
