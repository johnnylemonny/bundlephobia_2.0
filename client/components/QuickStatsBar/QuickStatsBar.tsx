import React, { Component } from 'react'

import { sanitizeHTML } from '../../../utils/common.utils'
import TreeShakeIconSVG from '../../assets/tree-shake.svg'
import SideEffectIconSVG from '../../assets/side-effect.svg'
import DependencyIconSVG from '../../assets/dependency.svg'
import GithubIconSVG from '../../assets/github-logo.svg'
import NPMIconSVG from '../../assets/npm-logo.svg'
import InfoIconSVG from '../../assets/info.svg'

import { resolveComponent } from '../../../utils/resolveComponent'

import { GitHubIcon } from '../Icons/GitHubIcon'
const TreeShakeIcon = resolveComponent(TreeShakeIconSVG)
const SideEffectIcon = resolveComponent(SideEffectIconSVG)
const DependencyIcon = resolveComponent(DependencyIconSVG)
const NPMIcon = resolveComponent(NPMIconSVG)
const InfoIcon = resolveComponent(InfoIconSVG)

import { PackageInfo } from '../../../types'

type QuickStatsBarProps = Partial<
  Pick<
    PackageInfo,
    | 'name'
    | 'description'
    | 'repository'
    | 'dependencyCount'
    | 'isTreeShakeable'
    | 'hasSideEffects'
  >
>

class QuickStatsBar extends Component<QuickStatsBarProps> {
  static defaultProps = {
    description: '',
  }

  getStatItemCount = () => {
    const { isTreeShakeable, hasSideEffects } = this.props
    let statItemCount = 0

    if (isTreeShakeable) statItemCount += 1
    if (hasSideEffects !== true) statItemCount += 1
    return statItemCount
  }

  getTrimmedDescription = () => {
    const { description = '' } = this.props
    const trimmed = description.trim()

    if (trimmed.endsWith('.')) {
      return trimmed.substring(0, trimmed.length - 1)
    } else {
      return trimmed
    }
  }

  render() {
    const {
      isTreeShakeable,
      hasSideEffects,
      dependencyCount,
      name,
      repository,
    } = this.props
    const statItemCount = this.getStatItemCount()
    const description = this.getTrimmedDescription()

    const GithubIconComp = GithubIcon
    const NpmIconComp = NPMIcon
    const TreeShakeIconComp = TreeShakeIcon
    const SideEffectIconComp = SideEffectIcon
    const DependencyIconComp = DependencyIcon
    const InfoIconComp = InfoIcon

    return (
      <div className="quick-stats-bar">
        <div
          className="quick-stats-bar__stat quick-stats-bar__stat--description "
          title={description}
        >
          <InfoIconComp />
          {statItemCount < 2 && (
            <span
              className="quick-stats-bar__stat--description-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(description) }}
              style={{
                maxWidth: `${500 - statItemCount * 280}px`,
              }}
            />
          )}
        </div>

        {isTreeShakeable && (
          <div className="quick-stats-bar__stat">
            <TreeShakeIconComp className="quick-stats-bar__stat-icon" />{' '}
            <span>tree-shakeable</span>
          </div>
        )}

        {!(hasSideEffects === true) && (
          <div className="quick-stats-bar__stat">
            <SideEffectIconComp className="quick-stats-bar__stat-icon" />{' '}
            <span>
              {Array.isArray(hasSideEffects) && hasSideEffects.length
                ? 'some side-effects'
                : 'side-effect free'}
            </span>
          </div>
        )}
        <div className="quick-stats-bar__stat quick-stats-bar__stat--optional">
          <DependencyIconComp className="quick-stats-bar__stat-icon" />
          <span>
            {(dependencyCount || 0) === 0 ? (
              'no dependencies'
            ) : (
              <span>
                {dependencyCount}{' '}
                {(dependencyCount || 0) > 1 ? 'dependencies' : 'dependency'}
              </span>
            )}
          </span>
        </div>
        <div className="quick-stats-bar__stat">
          <a
            className="quick-stats-bar__link"
            href={'https://npmjs.com/package/' + name}
            target="_blank"
            rel="noopener noreferrer"
          >
            <NpmIconComp className="quick-stats-bar__logo-icon quick-stats-bar__logo-icon--npm" />
          </a>
          {repository && (
            <a
              className="quick-stats-bar__link"
              href={repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon className="quick-stats-bar__logo-icon quick-stats-bar__logo-icon--github" />
            </a>
          )}
        </div>
        {this.props.children && (
          <div className="quick-stats-bar__right">{this.props.children}</div>
        )}
      </div>
    )
  }
}

export default QuickStatsBar
