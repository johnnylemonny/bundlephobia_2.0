const path = require('path')

module.exports = {
  pageExtensions: ['page.js', 'page.tsx'],
  sassOptions: {
    includePaths: [path.join(__dirname, 'stylesheets')],
  },
  env: {
    RELEASE_DATE: new Date().toDateString(),
  },
  webpack(config, { isServer }) {
    const isRegExp = val => {
      return (
        val &&
        (val instanceof RegExp ||
          Object.prototype.toString.call(val) === '[object RegExp]' ||
          val.constructor?.name === 'RegExp')
      )
    }

    const testMatchesSvg = test => {
      if (!test) return false
      if (isRegExp(test)) {
        return test.test('file.svg') || test.test('a.svg')
      }
      if (typeof test === 'function') {
        try {
          return test('file.svg')
        } catch (e) {
          return false
        }
      }
      if (Array.isArray(test)) {
        return test.some(testMatchesSvg)
      }
      return false
    }

    const traverseRules = (rules, path = 'rules') => {
      if (!Array.isArray(rules)) return
      rules.forEach((rule, idx) => {
        const currentPath = `${path}[${idx}]`
        if (rule.test && testMatchesSvg(rule.test)) {
          if (isServer) {
            console.log(`Found SVG match at ${currentPath}:`, {
              test: rule.test ? rule.test.toString() : null,
              loader: rule.loader,
              type: rule.type,
              exclude: rule.exclude ? rule.exclude.toString() : null,
            })
          }

          if (Array.isArray(rule.exclude)) {
            rule.exclude.push(/\.svg$/i)
          } else if (rule.exclude) {
            rule.exclude = [rule.exclude, /\.svg$/i]
          } else {
            rule.exclude = /\.svg$/i
          }

          if (isServer) {
            console.log(`  -> Applied exclude to ${currentPath}`)
          }
        }
        if (rule.oneOf) {
          traverseRules(rule.oneOf, `${currentPath}.oneOf`)
        }
        if (rule.rules) {
          traverseRules(rule.rules, `${currentPath}.rules`)
        }
      })
    }

    traverseRules(config.module.rules)

    // Add our dedicated SVGR rule
    config.module.rules.unshift({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    })

    config.resolve.alias = {
      ...config.resolve.alias,
      client: path.resolve(__dirname, 'client'),
      utils: path.resolve(__dirname, 'utils'),
    }

    return config
  },
}
