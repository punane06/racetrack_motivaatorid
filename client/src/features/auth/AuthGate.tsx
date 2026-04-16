import { useMemo, useState } from 'react'
import { useToast } from '@/lib/toast'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { employeeSocket } from '@/lib/socket'

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
  const { showToast } = useToast()
  const role = roleByPath[location.pathname]

  if (unlocked) {
    return <>{children}</>
  }

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim() || !role) {
      showToast('Please enter the access key.', 'error')
      return
    }

    // Ensure we start from a clean disconnected state
    if (employeeSocket.connected) {
      employeeSocket.disconnect()
    }

    employeeSocket.auth = { role, key: value }

    const onConnect = () => {
      employeeSocket.off('connect_error', onError)
      setUnlocked(true)
    }
    const onError = () => {
      employeeSocket.off('connect', onConnect)
      showToast('Incorrect access key', 'error')
      setValue('')
    }

    employeeSocket.once('connect', onConnect)
    employeeSocket.once('connect_error', onError)
    employeeSocket.connect()
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} aria-labelledby="auth-heading">
        <h1 id="auth-heading">Employee Login</h1>
        <p>Enter the key before any real-time controls are available.</p>
        <label>
          <span className="sr-only">{label}</span>
          <input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={label}
            aria-label={label}
            autoFocus
          />
        </label>
        <button type="submit">Unlock Interface</button>

      </form>
    </div>
  )
}
