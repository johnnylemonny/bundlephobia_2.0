import winston from 'winston'
import config from './config'

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      handleExceptions: true,
    }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
      handleExceptions: true,
    })
  )
}

const logger = {
  info(type: string, extra: any, message?: string) {
    winstonLogger.info({
      type,
      extra,
      message,
    })
  },
  error(type: string, err: any, message?: string) {
    winstonLogger.error({
      type,
      message,
      errMessage: err?.message,
      stack: err?.stack,
    })
  },
}

export default logger
