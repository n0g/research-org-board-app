import { ref, onMounted, onUnmounted } from 'vue'

const ICONS = { auto: '◑', light: '☀︎', dark: '☾︎' }
const CYCLE = { auto: 'light', light: 'dark', dark: 'auto' }

export function useTheme() {
  const pref = ref(localStorage.getItem('rb_theme') || 'auto')
  const icon = ref(ICONS[pref.value])

  function apply(p) {
    const dark = p === 'dark' || (p === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', dark)
    icon.value = ICONS[p]
  }

  function cycle() {
    pref.value = CYCLE[pref.value]
    localStorage.setItem('rb_theme', pref.value)
    apply(pref.value)
  }

  function onOsChange() {
    if (pref.value === 'auto') apply('auto')
  }

  onMounted(() => {
    apply(pref.value)
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onOsChange)
  })

  onUnmounted(() => {
    matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', onOsChange)
  })

  return { themeIcon: icon, cycleTheme: cycle, themePref: pref }
}
