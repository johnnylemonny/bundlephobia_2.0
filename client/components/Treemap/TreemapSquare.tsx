import React from 'react'
import cx from 'classnames'
import { WithClassName } from '../../../types'

type TreemapSquareProps = {
  style: React.CSSProperties
  data?: any
  value?: number
} & React.PropsWithChildren &
  React.HTMLAttributes<HTMLDivElement> &
  Pick<
    React.CSSProperties,
    'left' | 'top' | 'width' | 'height' | 'borderRadius'
  >

function TreemapSquare({
  children,
  left,
  top,
  width,
  height,
  borderRadius,
  data,
  style,
  value,
  className,
  ...other
}: TreemapSquareProps) {
  return (
    <div
      className={cx(className)}
      data-vals={data.toString() + '...' + width + '...' + height}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        wordBreak: 'break-word',
        flexDirection: 'column',
        ...style,
      }}
      {...other}
    >
      {children}
    </div>
  )
}

export default TreemapSquare
