import React from 'react'
import cx from 'classnames'

import { WithClassName } from '../../../types'
import SideEffectIconSVG_ from '../../assets/side-effect.svg'

const SideEffectIconSVG = (SideEffectIconSVG_ as any).default || SideEffectIconSVG_

export default function SideEffectIcon({ className }: WithClassName) {
  return (
    <SideEffectIconSVG className={cx(className, 'sideeffect-icon-animated')} />
  )
}
