import net from 'net'
import fs from 'fs-extra'
import path, { isAbsolute } from 'path'
import util from 'util'
import crypto from 'crypto'
import makeDebug from 'debug'
import postcss from 'postcss'
import loadConfig from 'postcss-load-config'

const debug = makeDebug('babel-plugin-transform-postcss')
const streams = { stderr: process.stderr } // overwritable by tests
const md5 = (data) => (
  crypto.createHash('md5').update(data).digest('hex')
)
const error = (...args) => {
  let prefix = 'babel-plugin-transform-postcss: '
  const message = util.format(...args)

  if (streams.stderr.isTTY) {
    prefix = `\x1b[31m${prefix}\x1b[0m`
  }

  streams.stderr.write(`${prefix}${message}\n`)
}

async function outputCSS (code, file, root, from, to) {
  if (!from || !to) return

  let outputPath = to
  if (!isAbsolute(outputPath)) {
    outputPath = path.resolve(root, to)
  }
  let sourcePath = from
  if (!isAbsolute(sourcePath)) {
    sourcePath = path.resolve(root, from)
  }
  const relativePath = path.relative(sourcePath, file)
  // console.log(path.resolve(outputPath, relativePath))
  return fs.outputFile(path.resolve(outputPath, relativePath), code)
}

const main = async function main (socketPath, tmpPath) {
  try {
    fs.mkdirSync(tmpPath)
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }

  const options = { allowHalfOpen: true }
  const server = net.createServer(options, (connection) => {
    let data = ''

    connection.on('data', (chunk) => {
      data += chunk.toString('utf8')
    })

    connection.on('end', async () => {
      try {
        let tokens, cache
        const { cssFile, config, opts } = JSON.parse(data)
        const { from, to } = opts || {}
        const cachePath =
          `${path.join(tmpPath, cssFile.replace(/[^a-z]/ig, ''))}.cache`
        const source = // eslint-disable-next-line no-sync
          fs.readFileSync(cssFile, 'utf8')
        const hash = md5(source)

        // eslint-disable-next-line no-sync
        try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')) } catch (err) {
          if (err.code !== 'ENOENT') {
            throw err
          }
        }

        let configPath = path.dirname(cssFile)

        if (config) {
          configPath = path.resolve(config)
        }

        if (cache && cache.hash === hash) {
          connection.end(JSON.stringify(cache.tokens))
          await outputCSS(cache.code, cssFile, config, from, to)
          return
        }

        const extractModules = (_, resultTokens) => {
          tokens = resultTokens
        }

        const { plugins, options: postcssOpts } =
          await loadConfig({ extractModules }, configPath)

        const runner = postcss(plugins)

        const code = await runner.process(source, Object.assign({
          from: cssFile,
          to: cssFile // eslint-disable-line id-length
        }, postcssOpts))

        // output css files
        await outputCSS(code.css, cssFile, configPath, from, to)

        cache = {
          hash,
          tokens,
          code: code.css
        }

        // eslint-disable-next-line no-sync
        fs.writeFileSync(cachePath, JSON.stringify(cache))

        connection.end(JSON.stringify(tokens))
      } catch (err) {
        error(err.stack)
        connection.end()
      }
    })
  })

  if (fs.existsSync(socketPath)) {
    error(`Server already running on socket ${socketPath}`)
    process.exit(1)
  } else {
    await new Promise((resolve, reject) => {
      server.on('error', (err) => reject(err))
      server.on('listening', () => {
        const handler = () => {
          fs.unlinkSync(socketPath) // eslint-disable-line no-sync
        }

        server.on('close', () => {
          process.removeListener('exit', handler)
          process.removeListener('SIGINT', handler)
          process.removeListener('SIGTERM', handler)
        })

        process.on('exit', handler)
        process.on('SIGINT', handler)
        process.on('SIGTERM', handler)

        resolve()
      })

      server.listen(socketPath, () => {
        debug(
          `babel-plugin-transform-postcss server running on socket ${socketPath}`
        )
      })
    })

    return server
  }
}

/* istanbul ignore if */
if (require.main === module) {
  (async () => {
    try { await main(...process.argv.slice(2)) } catch (err) { process.stderr.write(`${err.stack}\n`); process.exit(1) }
  })()
}

export {
  main,
  streams as _streams
}
