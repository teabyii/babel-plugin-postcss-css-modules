'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.default = transformPostCSS
exports.stopServer = exports.startServer = void 0

var _path = require('path')

var _child_process = require('child_process')

// note: socket path is important to keep short as it will be truncated if it
// exceeds certain platform limits. for this reason, we're writing to /tmp
// instead of using os.tmpdir (which can, on platforms like darwin, be quite
// long & per-process).
const projectId = process.cwd().toLowerCase().replace(/[^a-z]/ig, '')
const socketName = `bptp-${projectId}.sock`
const socketPath = (0, _path.join)('/tmp', socketName)
const tmpPath = (0, _path.join)('/tmp', `bptp-${projectId}`)
const nodeExecutable = process.argv[0]
const clientExcutable = (0, _path.join)(__dirname, 'postcss-client.js')
const serverExcutable = (0, _path.join)(__dirname, 'postcss-server.js')
let server

const startServer = () => {
  server = (0, _child_process.spawn)(nodeExecutable, [serverExcutable, socketPath, tmpPath], {
    env: process.env,
    // eslint-disable-line no-process-env
    stdio: 'inherit'
  })
  server.unref()
}

exports.startServer = startServer

const stopServer = () => {
  if (!server) {
    return
  }

  server.kill()
  server = null
  process.removeListener('exit', stopServer)
}

exports.stopServer = stopServer

const launchServer = () => {
  if (server) {
    return
  }

  startServer()
  process.on('exit', stopServer)
}

const defaultExtensions = ['.css']

const getStylesFromStylesheet = (stylesheetPath, file, config, configExtensions) => {
  const stylesheetExtension = (0, _path.extname)(stylesheetPath)
  const extensions = Array.isArray(configExtensions) ? configExtensions : defaultExtensions

  if (extensions.indexOf(stylesheetExtension) !== -1) {
    launchServer()
    const requiringFile = file.opts.filename
    const cssFile = (0, _path.resolve)((0, _path.dirname)(requiringFile), stylesheetPath)
    const data = JSON.stringify({
      cssFile,
      config
    })
    const execArgs = [clientExcutable, socketPath, data]
    const result = (0, _child_process.execFileSync)(nodeExecutable, execArgs, {
      env: process.env // eslint-disable-line no-process-env

    }).toString()
    return JSON.parse(result || '{}')
  }

  return undefined
}

function transformPostCSS ({
  types: t
}) {
  return {
    visitor: {
      CallExpression (path, {
        file,
        opts
      }) {
        const {
          callee: {
            name: calleeName
          },
          arguments: args
        } = path.node

        if (calleeName !== 'require' || !args.length || !t.isStringLiteral(args[0])) {
          return
        }

        const [{
          value: stylesheetPath
        }] = args
        const {
          config,
          extensions
        } = this.opts
        const tokens = getStylesFromStylesheet(stylesheetPath, file, config, extensions)

        if (tokens !== undefined) {
          const expression = path.findParent(test => test.isVariableDeclaration() || test.isExpressionStatement()) // keep `require` function call, and no comment

          if (opts.keep) {
            expression.insertBefore(t.callExpression(t.identifier(calleeName), args))
            expression.stop()
          } else {
            expression.addComment('trailing', ` @related-file ${stylesheetPath}`, true)
          }

          path.replaceWith(t.objectExpression(Object.keys(tokens).map(token => t.objectProperty(t.stringLiteral(token), t.stringLiteral(tokens[token])))))
        }
      },

      ImportDeclaration (path, {
        file,
        opts
      }) {
        const stylesheetPath = path.node.source.value

        if (path.node.specifiers.length !== 1) {
          return
        }

        const {
          config,
          extensions
        } = this.opts
        const tokens = getStylesFromStylesheet(stylesheetPath, file, config, extensions)

        if (tokens) {
          const styles = t.objectExpression(Object.keys(tokens).map(token => t.objectProperty(t.stringLiteral(token), t.stringLiteral(tokens[token]))))
          /* eslint-disable new-cap */

          const variableDeclaration = t.VariableDeclaration('var', [t.VariableDeclarator(path.node.specifiers[0].local, styles)])
          path.replaceWith(variableDeclaration)
          /* eslint-enable new-cap */
          // keep import declaration, and no comment

          if (opts.keep) {
            path.insertBefore(t.importDeclaration([], t.stringLiteral(stylesheetPath)))
            const parent = path.getFunctionParent()

            if (parent) {
              parent.stop()
            }
          } else {
            path.addComment('trailing', ` @related-file ${stylesheetPath}`, true)
          }
        }
      }

    }
  }
}
