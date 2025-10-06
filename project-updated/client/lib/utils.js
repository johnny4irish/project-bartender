import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Универсальный резолвер отображаемого имени по ID и карте
// Пример: resolveDisplayName(sale.bar, barMap)
export function resolveDisplayName(value, map = {}) {
  if (!value) return '—'
  // Если строка: сначала карта, затем фолбэк — сама строка
  if (typeof value === 'string') {
    return map[value] || value
  }
  // Если объект: используем displayName/name/_id
  if (typeof value === 'object') {
    return value.displayName || value.name || value._id || '—'
  }
  // Иначе приводим к строке
  try {
    return String(value)
  } catch {
    return '—'
  }
}