<template>
  <f7-app v-bind="f7params">
    <f7-view main :url="initialUrl" :transition="'f7-cover-v'" />
  </f7-app>
</template>

<script setup>
import routes from './routes.js'
import { useBoardStore } from './stores/board.js'
import { useTheme } from './composables/useTheme.js'

useTheme() // keeps OS dark-mode listener alive for the app lifetime

const store = useBoardStore()
const initialUrl = store.token ? '/board/' : '/'

const f7params = {
  name: 'Research Board',
  theme: 'ios',
  darkMode: false,
  routes,
  touch: {
    iosTouchRipple: false,
    mdTouchRipple: false,
  },
}
</script>
