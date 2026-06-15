import React from 'react'
import cx from 'classnames'
import { useCombobox } from 'downshift'
import debounce from 'debounce'

import SearchIcon from '../Icons/SearchIcon'
import { parsePackageString } from '../../../utils/common.utils'
import { SuggestionItem } from './components/SuggestionItem'
import { useFontSize } from './hooks/useFontSize'
import API from '../../api'

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

export const AutocompleteInput = ({
  initialValue = '',
  renderAsH1 = false,
  className,
  containerClass,
  autoFocus,
  onSearchSubmit,
  placeholder = 'find package',
  hideSearchIcon = false,
}: AutocompleteInputProps) => {
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  const [error, setError] = React.useState(false)

  const getSuggestions = React.useMemo(
    () =>
      debounce((query: string) => {
        API.getSuggestions(query)
          .then(result => {
            setSuggestions(result || [])
          })
          .catch(() => {
            setSuggestions([])
          })
      }, 150),
    [],
  )

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex,
    inputValue,
  } = useCombobox({
    items: suggestions,
    initialInputValue: initialValue,
    itemToString: item => (item ? item.package.name : ''),
    onInputValueChange: ({ inputValue: newInputValue = '' }) => {
      setError(false)
      const trimmedValue = newInputValue.trim()
      const { name } = parsePackageString(trimmedValue)

      if (trimmedValue.length > 1) {
        getSuggestions(name)
      } else {
        setSuggestions([])
      }
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        setSuggestions([selectedItem])
        onSearchSubmit(selectedItem.package.name)
      }
    },
  })

  const { searchFontSize } = useFontSize({ value: inputValue || '' })

  const { name, version } = React.useMemo(
    () => parsePackageString(inputValue || ''),
    [inputValue],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue && inputValue.trim()) {
      setError(false)
      onSearchSubmit(inputValue)
    } else {
      setError(true)
    }
  }

  return (
    <form
      className={cx(containerClass, 'autocomplete-input__form')}
      onSubmit={handleSubmit}
    >
      <div
        className={cx('autocomplete-input__container', className, {
          'autocomplete-input__container--menu-visible':
            isOpen && !!suggestions.length,
        })}
      >
        <div
          style={{
            display: 'inline-block',
            width: '100%',
            position: 'relative',
          }}
        >
          <input
            {...getInputProps({
              placeholder: placeholder,
              className: cx('autocomplete-input', {
                'autocomplete-input--error': error,
              }),
              autoCorrect: 'off',
              autoFocus: autoFocus,
              autoCapitalize: 'off',
              spellCheck: false,
              style: searchFontSize ? { fontSize: searchFontSize } : {},
            })}
          />
          <div
            {...getMenuProps()}
            className="autocomplete-input__suggestions-menu"
          >
            {isOpen &&
              suggestions.map((item, index) => (
                <div key={item.package.name} {...getItemProps({ item, index })}>
                  <SuggestionItem
                    item={item}
                    isHighlighted={highlightedIndex === index}
                  />
                </div>
              ))}
          </div>
        </div>
        <div
          style={searchFontSize ? { fontSize: searchFontSize } : {}}
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
