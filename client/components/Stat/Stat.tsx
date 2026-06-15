import React from 'react'
import cx from 'classnames'

import { formatSize, formatTime } from '../../../utils'
import { WithClassName } from '../../../types'
import { useClipboard } from '../../hooks/useClipboard'

const Type = {
  SIZE: 'size',
  TIME: 'time',
} as const

type StatProps = WithClassName & {
  value: number
  type: 'size' | 'time'
  label: string
  infoText?: string
  compact?: boolean
}

export default function Stat({
  value,
  label,
  type,
  infoText,
  compact,
  className,
}: StatProps) {
  const { copied, copy } = useClipboard()
  
  const formatted = type === Type.SIZE ? formatSize(value) : formatTime(value)
  const roundedValue = type === Type.SIZE
      ? parseFloat(formatted.size.toFixed(1))
      : parseFloat(formatted.size.toFixed(2))

  const handleCopy = () => {
    copy(`${roundedValue} ${formatted.unit} (${label})`)
  }

  return (
    <div
      className={cx('stat-container', className, {
        'stat-container--compact': compact,
      })}
      onClick={handleCopy}
      title="Click to copy"
      style={{ cursor: 'pointer' }}
    >
      <div className="stat-container__value-container">
        <div className="stat-container__value-wrap">
          <div
            className={cx('stat-container__value', type)}
            style={{ transitionDuration: `${value}s` }}
            data-value={roundedValue}
          >
            {roundedValue}
          </div>
        </div>
        <div className="stat-container__unit">
          {formatted.unit}
          {copied && <span className="stat-container__copied-hint">Copied!</span>}
        </div>
      </div>
      <div className="stat-container__divider" />
      <div className="stat-container__footer">
        <div className="stat-container__label">{label}</div>
        {infoText && (
          <div
            className="stat-container__info-text"
            data-balloon-pos="right"
            aria-label={infoText}
            onClick={(e) => e.stopPropagation()}
          >
            i
          </div>
        )}
      </div>
    </div>
  )
}

Stat.type = Type
