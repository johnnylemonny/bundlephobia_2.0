const path = require('path')

module.exports = {
  pageExtensions: ['page.js', 'page.tsx'],
  sassOptions: {
    includePaths: [path.join(__dirname, 'stylesheets')],
    silenceDeprecations: ['legacy-js-api', 'import'],
  },
  env: {
    RELEASE_DATE: new Date().toDateString(),
  },
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    )

    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/i
    }

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: { and: [/\.[jt]sx?$/] },
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
