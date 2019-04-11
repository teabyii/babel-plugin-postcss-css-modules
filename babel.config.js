module.exports = function (api) {
  api.cache(true)

  return {
    sourceMaps: true,
    presets: [
      [
        '@babel/preset-env', {
          targets: {
            node: '6.11.0'
          }
        }
      ]
    ],
    env: {
      coverage: {
        plugins: [
          'istanbul'
        ]
      }
    }
  }
}
