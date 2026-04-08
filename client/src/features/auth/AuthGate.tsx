import { useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { appSocket } from '@/lib/socket'

const roleByPath: Record<string, 'receptionist' | 'safety' | 'observer'> = {
  '/front-desk': 'receptionist',
  '/race-control': 'safety',
  '/lap-line-tracker': 'observer',
}

const labelByPath: Record<string, string> = {
  '/front-desk': 'Receptionist access key',
  '/race-control': 'Safety Official access key',
  '/lap-line-tracker': 'Lap-line Observer access key',
}

export function AuthGate({ children }: Readonly<PropsWithChildren>) {
  const location = useLocation()
  const label = useMemo(() => labelByPath[location.pathname] ?? 'Access key', [location.pathname])
  const [value, setValue] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const role = roleByPath[location.pathname]

  if (unlocked) {
    return <>{children}</>
  }

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!value.trim() || !role) {
      setError('Please enter the access key.')
      return
    }
    appSocket.emit(
      'auth:check',
      { role, key: value },
      (result: { ok: boolean; message?: string }) => {
        if (result.ok) {
          setUnlocked(true)
        } else {
          setError('Incorrect access key')
          setValue('')
        }
      }
    )
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
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  )
}
