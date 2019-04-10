import fs from 'fs'
import path from 'path'
import * as babel from '@babel/core'

const fixtures = path.join(__dirname, 'fixtures')

export const babelNoModules = {
  presets: [ ['@babel/preset-env', { modules: false, targets: { node: 'current' } }] ]
}

export const transform = (filename, babelOptionOverrides, extensions, pluginOptions) => {
  const file = path.join(fixtures, filename)

  const options = Object.assign({
    babelrc: false,
    presets: [ ['@babel/preset-env', { targets: { node: 'current' }, modules: false }] ],
    plugins: [
      ['./src/index.js', Object.assign({
        config: 'fixtures/postcss.config.js',
        extensions
      }, pluginOptions)]
    ]
  }, babelOptionOverrides)

  return new Promise((resolve, reject) => {
    babel.transformFile(file, options, (err, result) => {
      if (err) { reject(err) } else { resolve(result.code) }
    })
  })
}

export const read = (filename) => {
  const file = path.join(fixtures, filename)
  const options = {
    encoding: 'utf8'
  }

  return new Promise((resolve, reject) => {
    fs.readFile(file, options, (err, result) => {
      if (err) { reject(err) } else { resolve(result) }
    })
  })
}
