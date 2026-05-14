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
    let meta = document.querySelector('meta[name="theme-color"][data-dynamic]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.dataset.dynamic = '1'
      document.head.appendChild(meta)
    }
    meta.content = dark ? '#1C1C1E' : '#F5F5F7'
  }

  function cycle() {
    pref.value = CYCLE[pref.value]
    localStorage.setItem('rb_theme', pref.value)
    apply(pref.value)
  }

  function setTheme(p) {
    pref.value = p
    localStorage.setItem('rb_theme', p)
    apply(p)
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

  return { themeIcon: icon, cycleTheme: cycle, setTheme, themePref: pref }
}
