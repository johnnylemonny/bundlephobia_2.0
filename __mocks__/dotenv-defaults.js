const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

function load() {
  const envDefaultsPath = path.resolve(process.cwd(), '.env.defaults')
  const envPath = path.resolve(process.cwd(), '.env')

  if (fs.existsSync(envDefaultsPath)) {
    const defaults = dotenv.parse(fs.readFileSync(envDefaultsPath))
    for (const k in defaults) {
      if (process.env[k] === undefined) {
        process.env[k] = defaults[k]
      }
    }
  }

  if (fs.existsSync(envPath)) {
    const env = dotenv.parse(fs.readFileSync(envPath))
    for (const k in env) {
      process.env[k] = env[k]
    }
  }
}

load()

module.exports = {
  config: (options = {}) => {
    load()
    return { parsed: process.env }
  },
}
