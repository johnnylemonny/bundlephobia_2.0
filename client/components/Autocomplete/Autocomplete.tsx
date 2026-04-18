import React, { useState, useRef, useEffect } from 'react'
import cx from 'classnames'

interface AutocompleteProps {
  items: any[]
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSelect: (value: string, item: any) => void
  getItemValue: (item: any) => string
  renderItem: (item: any, isHighlighted: boolean) => React.ReactNode
  renderMenu: (items: React.ReactNode[], value: string, style: React.CSSProperties) => React.ReactNode
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  wrapperStyle?: React.CSSProperties
  onMenuVisibilityChange?: (isOpen: boolean) => void
}

const Autocomplete = React.forwardRef<HTMLInputElement, AutocompleteProps>((props, ref) => {
  const {
    items,
    value,
    onChange,
    onSelect,
    getItemValue,
    renderItem,
    renderMenu,
    inputProps,
    wrapperStyle,
    onMenuVisibilityChange,
  } = props

  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const internalInputRef = useRef<HTMLInputElement>(null)
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalInputRef

  useEffect(() => {
    if (onMenuVisibilityChange) {
      onMenuVisibilityChange(isOpen && items.length > 0)
    }
  }, [isOpen, items.length, onMenuVisibilityChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev + 1) % items.length)
      setIsOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev - 1 + items.length) % items.length)
      setIsOpen(true)
    } else if (e.key === 'Enter') {
      if (isOpen && items[highlightedIndex]) {
        e.preventDefault()
        const selectedItem = items[highlightedIndex]
        onSelect(getItemValue(selectedItem), selectedItem)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleBlur = () => {
    // Delay to allow clicking on menu items
    setTimeout(() => setIsOpen(false), 200)
  }

  const menuItems = items.map((item, index) => (
    <div
      key={index}
      onMouseDown={() => {
        onSelect(getItemValue(item), item)
        setIsOpen(false)
      }}
      onMouseEnter={() => setHighlightedIndex(index)}
    >
      {renderItem(item, highlightedIndex === index)}
    </div>
  ))

  return (
    <div style={{ ...wrapperStyle, position: 'relative' }}>
      <input
        {...inputProps}
        ref={inputRef}
        value={value}
        onChange={e => {
          onChange(e)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {isOpen && items.length > 0 && (
        <div ref={menuRef} style={{ position: 'absolute', zIndex: 1000, width: '100%' }}>
          {renderMenu(menuItems, value, { minWidth: '100%' })}
        </div>
      )}
    </div>
  )
})

export default Autocomplete
