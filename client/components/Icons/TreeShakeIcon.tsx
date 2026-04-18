import React from 'react'
import cx from 'classnames'

import { WithClassName } from '../../../types'
import TreeShakeIconSVG_ from '../../assets/tree-shake.svg'

const TreeShakeIconSVG = (TreeShakeIconSVG_ as any).default || TreeShakeIconSVG_

export default function TreeShakeIcon({ className }: WithClassName) {
  return (
    <TreeShakeIconSVG className={cx(className, 'treeshake-icon-animated')} />
  )
}
