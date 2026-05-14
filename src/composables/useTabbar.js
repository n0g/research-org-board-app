import { ref } from 'vue'

const visible = ref(true)

export function useTabbar() {
  return {
    visible,
    hide() { visible.value = false },
    show() { visible.value = true },
  }
}
