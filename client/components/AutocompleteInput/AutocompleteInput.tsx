import React from 'react'
import cx from 'classnames'
import AutoCompleteComponent from 'react-autocomplete'

import { resolveComponent } from '../../../utils/resolveComponent'

const AutoComplete = resolveComponent(AutoCompleteComponent)

import SearchIcon from '../Icons/SearchIcon'
import { parsePackageString } from '../../../utils/common.utils'
import { useAutocompleteInput } from './hooks/useAutocompleteInput'
import { SuggestionItem } from './components/SuggestionItem'
import { useFontSize } from './hooks/useFontSize'

type AutocompleteInputProps = {
  initialValue?: string
  renderAsH1?: boolean
  className?: string
  containerClass?: string
  autoFocus?: boolean
  onSearchSubmit: (value: string) => void
  placeholder?: string
  hideSearchIcon?: boolean
}

const AutocompleteInput = ({
  initialValue = '',
  renderAsH1 = false,
  className,
  containerClass,
  autoFocus,
  onSearchSubmit,
  placeholder = 'find package',
  hideSearchIcon = false,
}: AutocompleteInputProps) => {
  const searchInput = React.useRef<any>(null)
  const {
    value,
    isMenuVisible,
    suggestions,
    error,
    handleSubmit,
    handleInputChange,
    setIsMenuVisible,
    setSuggestions,
  } = useAutocompleteInput({ initialValue, onSubmit: onSearchSubmit })
  const { searchFontSize } = useFontSize({ value })

  const { name, version } = React.useMemo(
    () => parsePackageString(value),
    [value]
  )

  return (
    <form
      className={cx(containerClass, 'autocomplete-input__form')}
      onSubmit={handleSubmit}
    >
      <div
        className={cx('autocomplete-input__container', className, {
          'autocomplete-input__container--menu-visible':
            isMenuVisible && !!suggestions.length,
        })}
      >
        <AutoComplete
          getItemValue={(item: any) => item.package.name}
          inputProps={{
            placeholder: placeholder,
            className: cx('autocomplete-input', {
              'autocomplete-input--error': error,
            }),
            autoCorrect: 'off',
            autoFocus: autoFocus,
            autoCapitalize: 'off',
            spellCheck: false,
            style: { fontSize: searchFontSize! },
          }}
          onMenuVisibilityChange={(isOpen: boolean) => setIsMenuVisible(isOpen)}
          onChange={handleInputChange}
          ref={searchInput}
          value={value}
          items={suggestions}
          onSelect={(value: string, item: any) => {
            setSuggestions([item])
            onSearchSubmit(value)
          }}
          renderMenu={(items: any, value: string, inbuiltStyles: any) => {
            return (
              <div
                style={{ minWidth: inbuiltStyles.minWidth }}
                className="autocomplete-input__suggestions-menu"
              >
                {items as any}
              </div>
            )
          }}
          wrapperStyle={{
            display: 'inline-block',
            width: '100%',
            position: 'relative',
          }}
          renderItem={(item: any, isHighlighted: boolean) => (
            <div key={item.package.name}>
              <SuggestionItem item={item} isHighlighted={isHighlighted} />
            </div>
          )}
        />
        <div
          style={{ fontSize: searchFontSize! }}
          className="autocomplete-input__dummy-input"
        >
          <PackageNameElement
            isHeading={renderAsH1}
            className="dummy-input__package-name"
          >
            {name}
          </PackageNameElement>
          {version !== null && (
            <>
              <span className="dummy-input__at-separator">@</span>
              <span className="dummy-input__package-version">{version}</span>
            </>
          )}
        </div>
      </div>
      {!hideSearchIcon && (
        <button type="submit" className="autocomplete-input__search-icon">
          <SearchIcon className="" />
        </button>
      )}
    </form>
  )
}

type PackageNameElementProps = React.HTMLAttributes<HTMLElement> & {
  isHeading?: boolean
}

export function PackageNameElement({
  isHeading,
  ...props
}: PackageNameElementProps) {
  return isHeading ? <h1 {...props} /> : <span {...props} />
}

export default AutocompleteInput
