const path = require('path')

module.exports = {
  pageExtensions: ['page.js', 'page.tsx'],
  sassOptions: {
    includePaths: [path.join(__dirname, 'stylesheets')],
  },
  env: {
    RELEASE_DATE: new Date().toDateString(),
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: 'removeViewBox',
                  active: false,
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
