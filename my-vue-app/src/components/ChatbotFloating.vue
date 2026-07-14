<template>
  <div class="floating-chatbot">
    <!-- 플로팅 버튼 -->
    <button
      v-if="!open"
      type="button"
      class="chatbot-toggle"
      :aria-label="copy.openChat"
      @click="toggleChat"
    >
      <span class="toggle-icon">
        <svg
          viewBox="0 0 24 24"
          width="25"
          height="25"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"
          />
          <path d="M8 9h8M8 13h5" />
        </svg>
      </span>

      <span class="toggle-copy">
        <strong>{{ copy.buttonTitle }}</strong>
        <small>{{ copy.buttonSubtitle }}</small>
      </span>

      <span class="online-indicator" />
    </button>

    <!-- 챗봇 창 -->
    <section
      v-if="open"
      class="chatbot-window"
      role="dialog"
      aria-modal="true"
      :aria-label="copy.title"
      @click.stop
    >
      <header class="chatbot-header">
        <div class="chatbot-profile">
          <div class="bot-avatar">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
            >
              <rect x="4" y="6" width="16" height="13" rx="4" />
              <path d="M9 11h.01M15 11h.01M9 15h6M12 6V3" />
            </svg>

            <span class="avatar-status" />
          </div>

          <div class="profile-copy">
            <strong>{{ copy.title }}</strong>

            <span>
              <i />
              {{ copy.online }}
            </span>
          </div>
        </div>

        <div class="header-actions">
          <span class="language-badge">
            {{ settings.lang === 'en' ? 'EN' : 'KO' }}
          </span>

          <button
            type="button"
            class="header-button"
            :aria-label="copy.closeChat"
            @click="toggleChat"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>

      <div ref="bodyRef" class="chatbot-body">
        <div class="chat-date">
          {{ copy.today }}
        </div>

        <div
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="message.role"
        >
          <div v-if="message.role === 'bot'" class="message-avatar">
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
            >
              <rect x="4" y="6" width="16" height="13" rx="4" />
              <path d="M9 11h.01M15 11h.01M9 15h6M12 6V3" />
            </svg>
          </div>

          <div class="message-content">
            <div
              class="message-bubble"
              :class="{ typing: message.typing }"
            >
              <div v-if="message.typing" class="typing-dots">
                <span />
                <span />
                <span />
              </div>

              <p v-else>{{ message.text }}</p>
            </div>

            <time v-if="!message.typing">
              {{ formatTime(message.createdAt) }}
            </time>
          </div>
        </div>

        <!-- 추천 질문 -->
        <div
          v-if="messages.length <= 1 && !sending"
          class="suggestion-section"
        >
          <span class="suggestion-label">
            {{ copy.suggestionTitle }}
          </span>

          <div class="suggestion-list">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              type="button"
              @click="selectSuggestion(suggestion)"
            >
              <span>✦</span>
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>

      <footer class="chatbot-footer">
        <div class="input-container">
          <textarea
            v-model="question"
            rows="1"
            :placeholder="copy.placeholder"
            :disabled="sending"
            @keydown.enter.exact.prevent="send"
          />

          <button
            type="button"
            class="send-button"
            :disabled="sending || !question.trim()"
            :aria-label="copy.send"
            @click="send"
          >
            <span v-if="sending" class="send-spinner" />

            <svg
              v-else
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>

        <p class="chatbot-notice">
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>

          {{ copy.notice }}
        </p>
      </footer>
    </section>
  </div>
</template>

<script setup>
import {
  computed,
  nextTick,
  ref,
  watch
} from 'vue'

import useApi from '../composables/useApi'

const api = useApi()

const bodyRef = ref(null)
const question = ref('')
const sending = ref(false)

const open = computed(() => settings.chatbotOpen)

const copy = computed(() => {
  if (settings.lang === 'en') {
    return {
      buttonTitle: 'Seoul Travel Assistant',
      buttonSubtitle: 'Ask me anything',
      openChat: 'Open Seoul travel assistant',
      closeChat: 'Close Seoul travel assistant',
      title: 'Welcome Seoul AI',
      online: 'Ready to help',
      today: 'Today',
      greeting:
        'Hello! I am your Seoul travel assistant. Ask me about attractions, festivals, transportation or local travel tips.',
      suggestionTitle: 'Try asking',
      placeholder: 'Ask anything about Seoul...',
      send: 'Send message',
      notice:
        'Answers are based on Seoul tourism data and community information.',
      serverError:
        'Sorry, I could not connect to the server. Please try again shortly.',
      languageChanged: 'The chatbot language has been changed to English.',
      suggestions: [
        'Recommend attractions near Jongno-gu',
        'Where can I find vegan food in Seoul?',
        'What festivals are happening in Seoul?',
        'Suggest places for a solo traveler'
      ]
    }
  }

  return {
    buttonTitle: '서울 여행 도우미',
    buttonSubtitle: '무엇이든 물어보세요',
    openChat: '서울 여행 챗봇 열기',
    closeChat: '서울 여행 챗봇 닫기',
    title: '웰컴 서울 AI',
    online: '상담 가능',
    today: '오늘',
    greeting:
      '안녕하세요! 서울 여행 도우미입니다. 관광지, 축제, 교통, 로컬 여행 팁을 자유롭게 물어보세요.',
    suggestionTitle: '이렇게 질문해 보세요',
    placeholder: '서울에 대해 궁금한 점을 입력하세요',
    send: '메시지 전송',
    notice:
      '서울 관광 공공데이터와 커뮤니티 정보를 바탕으로 답변합니다.',
    serverError:
      '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    languageChanged: '챗봇 언어가 한국어로 변경되었습니다.',
    suggestions: [
      '종로구 주변 관광지를 추천해 줘',
      '서울에서 비건 음식을 먹을 수 있는 곳은?',
      '서울에서 열리는 축제를 알려줘',
      '혼자 여행하기 좋은 장소를 추천해 줘'
    ]
  }
})

const suggestions = computed(() => copy.value.suggestions)

const messages = ref([
  createMessage(
    'bot',
    settings.lang === 'en'
      ? 'Hello! I am your Seoul travel assistant. Ask me about attractions, festivals, transportation or local travel tips.'
      : '안녕하세요! 서울 여행 도우미입니다. 관광지, 축제, 교통, 로컬 여행 팁을 자유롭게 물어보세요.'
  )
])

function createMessage(role, text, options = {}) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    role,
    text,
    typing: options.typing || false,
    createdAt: new Date()
  }
}

function toggleChat() {
  settings.toggleChat()

  if (!open.value) {
    return
  }

  scrollToBottom()
}

function selectSuggestion(suggestion) {
  question.value = suggestion
  send()
}

async function send() {
  const userText = question.value.trim()

  if (!userText || sending.value) {
    return
  }

  messages.value.push(createMessage('user', userText))
  question.value = ''
  sending.value = true

  const typingMessage = createMessage('bot', '', {
    typing: true
  })

  messages.value.push(typingMessage)
  await scrollToBottom()

  try {
    const history = messages.value
      .filter((message) => !message.typing)
      .slice(-10)
      .map((message) => ({
        role: message.role === 'bot' ? 'assistant' : 'user',
        content: message.text
      }))

    const payload = {
      message: userText,
      language: settings.lang || 'ko',
      history
    }

    const [error, response] = await api.safe(() =>
      api.postChat(payload)
    )

    removeMessage(typingMessage.id)

    if (error) {
      messages.value.push(
        createMessage('bot', copy.value.serverError)
      )

      await scrollToBottom()
      return
    }

    messages.value.push(
      createMessage('bot', normalizeAnswer(response))
    )
  } catch (error) {
    removeMessage(typingMessage.id)

    messages.value.push(
      createMessage('bot', copy.value.serverError)
    )
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

function normalizeAnswer(response) {
  if (typeof response === 'string') {
    return response
  }

  if (response?.answer) {
    return response.answer
  }

  if (response?.result) {
    return response.result
  }

  if (response?.message) {
    return response.message
  }

  if (Array.isArray(response?.messages)) {
    return response.messages
      .map((message) => message.text || message.content)
      .filter(Boolean)
      .join('\n')
  }

  return copy.value.serverError
}

function removeMessage(messageId) {
  messages.value = messages.value.filter(
    (message) => message.id !== messageId
  )
}

function formatTime(date) {
  return new Intl.DateTimeFormat(
    settings.lang === 'en' ? 'en-US' : 'ko-KR',
    {
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(new Date(date))
}

async function scrollToBottom() {
  await nextTick()

  if (bodyRef.value) {
    bodyRef.value.scrollTo({
      top: bodyRef.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    scrollToBottom()
  }
})

watch(
  () => settings.lang,
  () => {
    messages.value.push(
      createMessage('bot', copy.value.languageChanged)
    )

    scrollToBottom()
  }
)
</script>

<style scoped>
.floating-chatbot {
  position: fixed;
  right: 18px;
  bottom: 88px;
  z-index: 1400;
}

/* 플로팅 버튼 */
.chatbot-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 60px;
  padding: 8px 17px 8px 9px;
  color: #fff;
  background:
    linear-gradient(135deg, #5362ee 0%, #755be9 100%);
  border: 0;
  border-radius: 21px;
  box-shadow:
    0 16px 34px rgba(83, 98, 238, 0.35);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.chatbot-toggle:hover {
  box-shadow:
    0 20px 42px rgba(83, 98, 238, 0.42);
  transform: translateY(-3px);
}

.toggle-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  color: #5865eb;
  background: #fff;
  border-radius: 15px;
}

.toggle-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.toggle-copy strong {
  font-size: 13px;
  font-weight: 900;
  line-height: 1.3;
}

.toggle-copy small {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  font-weight: 600;
}

.online-indicator {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 14px;
  height: 14px;
  background: #2ed3a2;
  border: 3px solid #fff;
  border-radius: 50%;
}

/* 챗봇 창 */
.chatbot-window {
  display: flex;
  width: min(390px, calc(100vw - 32px));
  height: min(590px, calc(100vh - 150px));
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e6ef;
  border-radius: 25px;
  box-shadow:
    0 25px 75px rgba(18, 27, 48, 0.25);
  animation: open-chat 0.22s ease-out;
}

@keyframes open-chat {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 헤더 */
.chatbot-header {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  color: #fff;
  background:
    linear-gradient(135deg, #5362ee 0%, #765be8 100%);
}

.chatbot-profile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.bot-avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 45px;
  height: 45px;
  flex-shrink: 0;
  color: #5865e9;
  background: #fff;
  border-radius: 15px;
  box-shadow: 0 6px 18px rgba(29, 35, 101, 0.2);
}

.avatar-status {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 12px;
  height: 12px;
  background: #34d6a4;
  border: 3px solid #fff;
  border-radius: 50%;
}

.profile-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.profile-copy strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-copy > span {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.77);
  font-size: 10px;
  font-weight: 650;
}

.profile-copy i {
  width: 6px;
  height: 6px;
  background: #3ce0ad;
  border-radius: 50%;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 7px;
}

.language-badge {
  display: grid;
  place-items: center;
  min-width: 31px;
  height: 25px;
  padding: 0 7px;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
}

.header-button {
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  padding: 0;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
}

/* 메시지 영역 */
.chatbot-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 13px;
  overflow-y: auto;
  padding: 17px 15px;
  background:
    linear-gradient(180deg, #f8f9fd 0%, #f5f7fb 100%);
  scrollbar-width: thin;
  scrollbar-color: #d9ddea transparent;
}

.chat-date {
  align-self: center;
  padding: 4px 9px;
  color: #9aa4b5;
  font-size: 9px;
  font-weight: 700;
  background: #ebedf4;
  border-radius: 999px;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-avatar {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  color: #5866e9;
  background: #fff;
  border: 1px solid #e0e4ee;
  border-radius: 10px;
}

.message-content {
  display: flex;
  max-width: 80%;
  flex-direction: column;
}

.message-row.user .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 11px 13px;
  color: #344058;
  font-size: 12px;
  line-height: 1.6;
  background: #fff;
  border: 1px solid #e3e7ef;
  border-radius: 16px 16px 16px 5px;
  box-shadow: 0 4px 12px rgba(24, 35, 59, 0.045);
}

.message-row.user .message-bubble {
  color: #fff;
  background:
    linear-gradient(135deg, #5362ee, #705be6);
  border: 0;
  border-radius: 16px 16px 5px 16px;
  box-shadow: 0 7px 16px rgba(83, 98, 238, 0.22);
}

.message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-content time {
  margin-top: 4px;
  color: #a2abba;
  font-size: 8px;
}

/* 타이핑 표시 */
.message-bubble.typing {
  min-width: 57px;
}

.typing-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 17px;
}

.typing-dots span {
  width: 5px;
  height: 5px;
  background: #9da6b5;
  border-radius: 50%;
  animation: typing 1.1s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

/* 추천 질문 */
.suggestion-section {
  margin-top: 4px;
  padding-left: 36px;
}

.suggestion-label {
  display: block;
  margin-bottom: 8px;
  color: #8c97aa;
  font-size: 9px;
  font-weight: 800;
}

.suggestion-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
}

.suggestion-list button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 8px 10px;
  color: #5663d9;
  font-size: 10px;
  font-weight: 750;
  text-align: left;
  background: #fff;
  border: 1px solid #dfe3f7;
  border-radius: 11px;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.suggestion-list button:hover {
  background: #f0f2ff;
  transform: translateX(2px);
}

.suggestion-list button span {
  color: #745ce7;
}

/* 입력 영역 */
.chatbot-footer {
  padding: 11px 12px 10px;
  background: #fff;
  border-top: 1px solid #e9ecf2;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  min-height: 49px;
  padding: 6px 6px 6px 13px;
  background: #f5f6fa;
  border: 1px solid #e1e5ed;
  border-radius: 16px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.input-container:focus-within {
  border-color: rgba(83, 98, 238, 0.6);
  box-shadow: 0 0 0 4px rgba(83, 98, 238, 0.09);
}

.input-container textarea {
  min-width: 0;
  min-height: 35px;
  max-height: 88px;
  flex: 1;
  padding: 8px 0;
  resize: none;
  color: #253047;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.45;
  background: transparent;
  border: 0;
  outline: none;
}

.input-container textarea::placeholder {
  color: #a0a9b8;
}

.send-button {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  padding: 0;
  color: #fff;
  background:
    linear-gradient(135deg, #5362ee, #735be8);
  border: 0;
  border-radius: 12px;
  box-shadow: 0 6px 15px rgba(83, 98, 238, 0.23);
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
  box-shadow: none;
}

.send-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.42);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.chatbot-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 7px 0 0;
  color: #9ba4b3;
  font-size: 8px;
  line-height: 1.4;
  text-align: center;
}

/* 모바일 */
@media (max-width: 520px) {
  .floating-chatbot {
    right: 14px;
    bottom: 82px;
  }

  .chatbot-toggle {
    width: 58px;
    height: 58px;
    min-height: 58px;
    padding: 0;
    border-radius: 19px;
  }

  .toggle-icon {
    width: 58px;
    height: 58px;
    color: #fff;
    background: transparent;
  }

  .toggle-copy {
    display: none;
  }

  .chatbot-window {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
  }

  .chatbot-header {
    min-height: 70px;
    padding-top: max(13px, env(safe-area-inset-top));
  }

  .chatbot-footer {
    padding-bottom:
      max(10px, env(safe-area-inset-bottom));
  }

  .chatbot-body {
    padding-right: 13px;
    padding-left: 13px;
  }

  .message-content {
    max-width: 83%;
  }
}
</style>