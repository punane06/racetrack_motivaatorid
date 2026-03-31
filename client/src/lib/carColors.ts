export function getCarColor(carNumber: number): string {
  const colors: Record<number, string> = {
    1: '#22c55e',
    2: '#a855f7',
    3: '#eab308',
    4: '#0ea5e9',
    5: '#ef4444',
    6: '#f97316',
    7: '#14b8a6',
    8: '#ec4899',
  }

  return colors[carNumber] ?? '#6b7280'
}