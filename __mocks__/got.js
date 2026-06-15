const gotMock = {
  get: () => Promise.resolve({ body: '' }),
  post: () => Promise.resolve({ body: '' }),
}

module.exports = gotMock
