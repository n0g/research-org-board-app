<template>
  <f7-app v-bind="f7params">
    <f7-view main url="/" :transition="'f7-cover-v'" />
  </f7-app>
</template>

<script setup>
import routes from './routes.js'

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
