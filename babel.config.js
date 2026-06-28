module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['.'],
      alias: {
        '@features': './src/features',
        '@navigation': './src/navigation',
        '@native': './src/native',
        '@theme': './src/theme',
        '@assets': './assets',
        '@i18n': './src/i18n',
        '@api': './src/api',
        '@auth': './src/auth',
        '@sync': './src/sync',
      },
    }],
  ],
};
