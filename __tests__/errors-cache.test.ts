import request from 'supertest'
import { initServer } from '../index'
import { Server } from 'http'
import Koa from 'koa'

jest.setTimeout(60000)

describe('build api', () => {
  let app: Koa
  let server: Server

  beforeAll(async () => {
    jest.setTimeout(30000)
    app = await initServer()
    server = app.listen()
  })

  afterAll(done => {
    server.close(done)
  })

  it('builds correct packages', async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: 'react@16.5.0' })

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('max-age=86400')

    expect(response.body.name).toBe('react')
    expect(response.body.version).toBe('16.5.0')
  })

  it('handles hash bang in the beginning of packages', async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: '@bundlephobia/test-build-error' })

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('max-age=86400')

    expect(response.body.size).toBeGreaterThan(0)
  })

  it('gives right error messages on when trying to build blocklisted packages', async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: 'polymer-cli' })

    expect(response.status).toBe(403)
    expect(response.headers['cache-control']).toBe('max-age=60')

    expect(response.body.error.code).toBe('BlocklistedPackageError')
  })

  it('gives right error messages on when trying to build entry point error ', async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: '@bundlephobia/test-entry-point-error' })

    expect(response.status).toBe(500)
    expect(response.headers['cache-control']).toBe('max-age=3600')

    expect(response.body.error.code).toBe('EntryPointError')
  })

  it('ignores errors when trying to build packages with missing dependency errors', async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: '@bundlephobia/missing-dependency-error' })

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('max-age=86400')

    expect(response.body.size).toBeGreaterThan(0)
  })

  it("gives right error messages on when trying to build packages that don't exist", async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: '@bundlephobia/does-not-exist' })

    expect(response.status).toBe(404)
    expect(response.headers['cache-control']).toBe('max-age=60')

    expect(response.body.error.code).toBe('PackageNotFoundError')
  })

  it("gives right error messages on when trying to build packages versions that don't exist", async () => {
    const response = await request(server)
      .get('/api/size')
      .query({ package: '@bundlephobia/test-entry-point-error@459.0.0' })

    expect(response.status).toBe(404)
    expect(response.headers['cache-control']).toBe('max-age=60')
    expect(response.body.error.code).toBe('PackageVersionMismatchError')
  })
})
