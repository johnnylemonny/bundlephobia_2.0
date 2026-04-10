import { Context } from 'koa'
import { drawStatsImg } from '../../utils/draw.utils'
import Cache from '../../utils/cache.utils'
import send from 'koa-send'
import queryString from 'query-string'
import { resolvePackage } from '../../utils/server.utils'
import semver from 'semver'

const cache = new Cache()

async function generateImgMiddleware(ctx: Context) {
  // See https://github.com/facebook/react/issues/13838
  const url = ctx.url.replace(/&amp;/g, '&')

  let { name, version, theme, wide } = queryString.parseUrl(url).query as {
    name: string
    version: string
    theme?: 'dark' | 'light'
    wide?: string
  }

  try {
    if (!semver.valid(version)) {
      const resolved = await resolvePackage(name)
      version = resolved.version
    }

    const result = await cache.getPackageSize({ name, version })

    ctx.type = 'png'
    ctx.cacheControl = {
      maxAge: 60 * 60 * 60,
    }
    ctx.body = drawStatsImg({
      name: result.name,
      version: result.version,
      min: result.size,
      gzip: result.gzip,
      theme,
      wide: wide === 'true' || wide === '1',
    })
  } catch (err) {
    console.error(err)
    ctx.cacheControl = {
      noCache: true,
    }
    await send(ctx, 'client/assets/public/android-chrome-192x192.png')
  }
}

export default generateImgMiddleware
