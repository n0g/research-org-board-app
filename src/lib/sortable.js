// Minimal touch+mouse drag-to-reorder for the setup stage list.
// Works on the container element; moves items in the `rows` Ref array.
export function initSortable(container, rows) {
  let dragEl = null, placeholder = null, startIndex = -1

  container.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.handle')
    if (!handle) return
    const row = handle.closest('.stage-row')
    if (!row) return

    e.preventDefault()
    startIndex = parseInt(row.dataset.index, 10)
    dragEl = row
    placeholder = document.createElement('div')
    placeholder.className = 'stage-row stage-row-placeholder'
    placeholder.style.height = row.offsetHeight + 'px'

    const rect = row.getBoundingClientRect()
    const offsetY = e.clientY - rect.top

    Object.assign(row.style, {
      position: 'fixed',
      width: rect.width + 'px',
      left: rect.left + 'px',
      top: rect.top + 'px',
      zIndex: '1000',
      opacity: '0.9',
      pointerEvents: 'none',
    })
    row.after(placeholder)

    function onMove(e) {
      if (!dragEl) return
      dragEl.style.top = (e.clientY - offsetY) + 'px'

      const siblings = [...container.querySelectorAll('.stage-row:not(.stage-row-placeholder)')]
      for (const sib of siblings) {
        if (sib === dragEl) continue
        const sibRect = sib.getBoundingClientRect()
        if (e.clientY < sibRect.top + sibRect.height / 2) {
          container.insertBefore(placeholder, sib)
          break
        } else if (sib === siblings[siblings.length - 1]) {
          sib.after(placeholder)
        }
      }
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove)
      if (!dragEl) return

      Object.assign(dragEl.style, {
        position: '', width: '', left: '', top: '',
        zIndex: '', opacity: '', pointerEvents: '',
      })

      const allRows = [...container.querySelectorAll('.stage-row:not(.stage-row-placeholder)')]
      const endIndex = [...container.children].indexOf(placeholder)

      // reorder the reactive array
      const item = rows.value.splice(startIndex, 1)[0]
      const insertAt = endIndex > startIndex ? endIndex - 1 : endIndex
      rows.value.splice(Math.max(0, insertAt), 0, item)

      placeholder.remove()
      dragEl = null
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp, { once: true })
  })
}
