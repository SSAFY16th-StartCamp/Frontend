<template>
  <div id="app">
    <router-view />
    <ChatbotFloating />
  </div>
</template>

<script>
import ChatbotFloating from './components/ChatbotFloating.vue'
export default { components:{ ChatbotFloating } }
</script>