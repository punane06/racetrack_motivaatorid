import { useMemo, useState } from 'react'
import type { FormEvent, PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'

const roleByPathPrefix: Record<string, string> = {
  '/front-desk': 'Receptionist access key',
  '/race-control': 'Safety Official access key',
  '/lap-line-tracker': 'Lap-line Observer access key',
}

export function AuthGate({ children }: PropsWithChildren) {
  const location = useLocation()
  const label = useMemo(() => roleByPathPrefix[location.pathname] ?? 'Access key', [location.pathname])
  const [value, setValue] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  if (unlocked) {
    return <>{children}</>
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) {
      return
    }

    // Real server validation will be connected in issue #11.
    setUnlocked(true)
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Employee Login</h1>
        <p>Enter the key before any real-time controls are available.</p>
        <label>
          {label}
          <input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter access key"
            autoFocus
          />
        </label>
        <button type="submit">Unlock Interface</button>
      </form>
    </div>
  )
}
