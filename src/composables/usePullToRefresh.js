import { onMounted, onUnmounted } from 'vue'

export function usePullToRefresh(getEl, getIndicator, onRefresh, isCardDragging) {
  const THRESHOLD = 80
  let startY = 0, active = false, refreshing = false

  function onTouchStart(e) {
    if (e.touches.length !== 1 || refreshing) return
    const col = e.target.closest('.col-body')
    if (col && col.scrollTop > 0) return
    startY = e.touches[0].clientY
    active = true
  }

  function onTouchMove(e) {
    if (!active || isCardDragging()) { active = false; return }
    const dy = e.touches[0].clientY - startY
    if (dy <= 4) return
    const pull = Math.min(dy * 0.5, THRESHOLD)
    const progress = pull / THRESHOLD
    const ind = getIndicator()
    if (!ind) return
    ind.style.top = (44 + pull * 0.6) + 'px'
    ind.style.opacity = Math.min(progress * 2, 1)
    ind.textContent = progress >= 1 ? '↑' : '↓'
    ind.className = 'ptr-indicator' + (progress >= 1 ? ' ready' : '')
  }

  function onTouchEnd(e) {
    if (!active) return
    active = false
    if (isCardDragging()) return
    const dy = e.changedTouches[0].clientY - startY
    const ind = getIndicator()
    if (!ind) return
    if (dy >= THRESHOLD && !refreshing) {
      refreshing = true
      ind.textContent = ''
      ind.className = 'ptr-indicator spinning'
      onRefresh().finally(() => {
        refreshing = false
        ind.className = 'ptr-indicator'
        ind.style.opacity = '0'
      })
    } else {
      ind.className = 'ptr-indicator'
      ind.style.opacity = '0'
    }
  }

  onMounted(() => {
    const el = getEl()
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
  })

  onUnmounted(() => {
    const el = getEl()
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  })
}
