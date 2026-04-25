import { ref } from 'vue'

const collapsed = ref(localStorage.getItem('rb_sidebar_collapsed') === '1')

export function useSidebar() {
  function toggle() {
    collapsed.value = !collapsed.value
    localStorage.setItem('rb_sidebar_collapsed', collapsed.value ? '1' : '0')
  }
  return { sidebarCollapsed: collapsed, toggleSidebar: toggle }
}
