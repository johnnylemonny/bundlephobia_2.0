import 'dotenv-defaults/config'
import { fastify as FastifyFactory, FastifyRequest, FastifyReply } from 'fastify'
import {
  getPackageStats,
  getAllPackageExports,
  getPackageExportSizes,
  eventQueue,
} from 'package-build-stats'
// @ts-ignore
import Amplitude from '@amplitude/node'

const fastify: any = FastifyFactory()

if (process.env.AMPLITUDE_API_KEY) {
  const client = Amplitude.init(process.env.AMPLITUDE_API_KEY)

  eventQueue.on('*', (event: any, details: any) => {
    client.logEvent({
      event_type: String(event),
      user_id: 'build-service',
      event_properties: {
        ...details,
      },
    })
  })

  setInterval(() => {
    client.flush()
  }, 5000)
}

fastify.get('/size', async (req: FastifyRequest<{ Querystring: { p: string } }>, res: FastifyReply) => {
  const packageString = decodeURIComponent(req.query.p)
  try {
    const result = await getPackageStats(packageString, {
      installTimeout: 60000,
    })
    return res.code(200).send(result)
  } catch (err: any) {
    console.log(err)
    const errorToSend = err && typeof err === 'object' && 'toJSON' in err ? err.toJSON() : err
    return res.code(500).send(errorToSend)
  }
})

fastify.get('/exports-sizes', async (req: FastifyRequest<{ Querystring: { p: string } }>, res: FastifyReply) => {
  const packageString = decodeURIComponent(req.query.p)

  try {
    const result = await getPackageExportSizes(packageString, {
      installTimeout: 60000,
    })
    return res.code(200).send(result)
  } catch (err: any) {
    console.log(err)
    const errorToSend = err && typeof err === 'object' && 'toJSON' in err ? err.toJSON() : err
    return res.code(500).send(errorToSend)
  }
})

fastify.get('/exports', async (req: FastifyRequest<{ Querystring: { p: string } }>, res: FastifyReply) => {
  const packageString = decodeURIComponent(req.query.p)

  try {
    const result = await getAllPackageExports(packageString, {
      installTimeout: 60000,
    })
    return res.code(200).send(result)
  } catch (err: any) {
    console.log(err)
    const errorToSend = err && typeof err === 'object' && 'toJSON' in err ? err.toJSON() : err
    return res.code(500).send(errorToSend)
  }
})

fastify
  .listen({ port: 7002 })
  .then(() => {
    console.log(`server listening on 7002`)
  })
  .catch((err: any) => {
    console.error(err)
    process.exit(1)
  })
