module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { unstable_transformProfile: 'default' }],
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: { '@': './src' },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};