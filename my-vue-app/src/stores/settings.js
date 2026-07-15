import { defineStore } from 'pinia'

export const useSettings = defineStore('settings', {
  state: () => ({
    lang: 'en',
    chatbotOpen: false
  }),
  actions: {
    setLang(l) { this.lang = l },
    toggleChat() { this.chatbotOpen = !this.chatbotOpen }
  }
})