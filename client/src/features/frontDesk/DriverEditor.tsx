import { useEffect, useState } from 'react'
import type React from 'react'

interface DriverEditorProps {
  readonly mode?: 'add' | 'edit'
  readonly submitLabel?: string
  readonly initialName?: string
  readonly onSubmit: (name: string) => void
  readonly onCancel?: () => void
}

export function DriverEditor({
  mode = 'add',
  submitLabel,
  initialName = '',
  onSubmit,
  onCancel,
}: Readonly<DriverEditorProps>) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  const buttonLabel = submitLabel ?? (mode === 'add' ? 'Add Driver' : 'Save')

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = name.trim()
    if (!normalized) {
      return
    }

    onSubmit(normalized)

    if (mode === 'add') {
      setName('')
    }
  }

  return (
    <form className="driver-editor" onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Driver name"
        aria-label="Driver name"
      />
      <button type="submit">{buttonLabel}</button>
      {mode === 'edit' && onCancel ? (
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  )
}
