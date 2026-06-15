import React from 'react'
import debounce from 'debounce'
import { parsePackageString } from '../../../../utils/common.utils'
import API, { type PackageSuggestion } from '../../../api'

interface UseAutocompleteInputArgs {
  initialValue: string
  onSubmit: (value: string) => void
}

export function useAutocompleteInput({
  initialValue,
  onSubmit,
}: UseAutocompleteInputArgs) {
  const [value, setValue] = React.useState(initialValue)
  const [suggestions, setSuggestions] = React.useState<PackageSuggestion[]>([])
  const [isMenuVisible, setIsMenuVisible] = React.useState(false)
  const [error, setError] = React.useState(false)

  const getSuggestions = React.useMemo(
    () =>
      debounce((query: string) => {
        API.getSuggestions(query).then(result => {
          setSuggestions(result)
        })
      }, 150),
    [],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      setError(false)
      onSubmit(value)
    } else {
      setError(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(false)
    setValue(e.target.value)
    const trimmedValue = e.target.value.trim()
    const { name } = parsePackageString(trimmedValue)

    if (trimmedValue.length > 1) {
      getSuggestions(name)
    }

    if (!trimmedValue) {
      setSuggestions([])
    }
  }

  return {
    value,
    suggestions,
    isMenuVisible,
    error,
    handleSubmit,
    handleInputChange,
    setIsMenuVisible,
    setSuggestions,
  }
}
