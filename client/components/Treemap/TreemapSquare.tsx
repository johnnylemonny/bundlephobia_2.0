import React from 'react'

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
  ...other
}: TreemapSquareProps) {
  return (
    <div
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
