import { ref } from 'vue'

const KEY = 'rb_accent_color'
export const DEFAULT_ACCENT_COLOR = '#e879f9'

const stored = localStorage.getItem(KEY) || localStorage.getItem('rb_venue_color') || DEFAULT_ACCENT_COLOR
const color = ref(stored)

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function apply(val) {
  document.documentElement.style.setProperty('--accent', val)
  document.documentElement.style.setProperty('--accent-bg', hexToRgba(val, 0.15))
}

apply(color.value)

export function useAccentColor() {
  function setColor(val) {
    color.value = val
    localStorage.setItem(KEY, val)
    apply(val)
  }
  return { accentColor: color, setColor }
}
