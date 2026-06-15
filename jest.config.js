module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^dotenv-defaults$': '<rootDir>/__mocks__/dotenv-defaults.js',
    '^dotenv-defaults/config$': '<rootDir>/__mocks__/dotenv-defaults.js',
    '^execa$': '<rootDir>/__mocks__/execa.js',
    '^query-string$': '<rootDir>/__mocks__/query-string.js',
    '.*/similarPackages.middleware$':
      '<rootDir>/__mocks__/similarPackages.middleware.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(dotenv-defaults)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
