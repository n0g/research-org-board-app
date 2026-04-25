import { ref } from 'vue'

const KEY = 'rb_venue_color'
export const DEFAULT_VENUE_COLOR = '#a78bfa'

const color = ref(localStorage.getItem(KEY) || DEFAULT_VENUE_COLOR)

function apply(val) {
  document.documentElement.style.setProperty('--venue-color', val)
}

apply(color.value)

export function useVenueColor() {
  function setColor(val) {
    color.value = val
    localStorage.setItem(KEY, val)
    apply(val)
  }
  return { venueColor: color, setColor }
}
