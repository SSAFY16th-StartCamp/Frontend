<template>
  <div class="editor-backdrop" @mousedown.self="$emit('close')">
    <section
      class="editor-panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="editorTitleId"
    >
      <header class="editor-header">
        <div>
          <span class="editor-eyebrow">
            {{ post ? copy.editEyebrow : copy.newEyebrow }}
          </span>

          <h2 :id="editorTitleId">
            {{ post ? copy.editTitle : copy.newTitle }}
          </h2>

          <p>{{ copy.description }}</p>
        </div>

        <button
          type="button"
          class="close-button"
          :aria-label="copy.close"
          :disabled="saving"
          @click="$emit('close')"
        >
          <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <form class="editor-form" @submit.prevent="save">
        <label class="form-group">
          <span class="form-label">
            {{ copy.titleLabel }}
            <strong>*</strong>
          </span>

          <input
            v-model="title"
            class="form-control"
            type="text"
            maxlength="100"
            :placeholder="copy.titlePlaceholder"
            :disabled="saving"
          />

          <span class="character-count">
            {{ title.length }} / 100
          </span>
        </label>

        <label class="form-group">
          <span class="form-label">
            {{ copy.contentLabel }}
            <strong>*</strong>
          </span>

          <textarea
            v-model="content"
            class="form-control content-control"
            maxlength="5000"
            :placeholder="copy.contentPlaceholder"
            :disabled="saving"
          />

          <span class="character-count">
            {{ content.length }} / 5,000
          </span>
        </label>

        <label class="form-group password-group">
          <span class="form-label">
            {{ copy.passwordLabel }}
            <strong>*</strong>
          </span>

          <div class="password-input-wrap">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
            >
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>

            <input
              v-model="password"
              class="password-input"
              :type="showPassword ? 'text' : 'password'"
              maxlength="20"
              :placeholder="copy.passwordPlaceholder"
              :disabled="saving"
            />

            <button
              type="button"
              class="password-toggle"
              :aria-label="copy.togglePassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? copy.hide : copy.show }}
            </button>
          </div>

          <span class="form-help">
            {{ copy.passwordHelp }}
          </span>
        </label>

        <div class="language-notice">
          <span class="language-icon">
            {{ settings.lang === 'en' ? 'EN' : 'KO' }}
          </span>

          <div>
            <strong>{{ copy.languageTitle }}</strong>
            <p>{{ copy.languageDescription }}</p>
          </div>
        </div>

        <div class="editor-actions">
          <button
            type="button"
            class="cancel-button"
            :disabled="saving"
            @click="$emit('close')"
          >
            {{ copy.cancel }}
          </button>

          <button
            type="submit"
            class="save-button"
            :disabled="saving"
          >
            <span v-if="saving" class="save-spinner" />

            <svg
              v-else
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>

            {{ saving ? copy.saving : post ? copy.update : copy.publish }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import useApi from '../composables/useApi'
import { useSettings } from '../stores/settings'

const props = defineProps({
  post: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const api = useApi()
const settings = useSettings()
const { locale } = useI18n()

const editorTitleId = 'community-post-editor-title'

const title = ref('')
const content = ref('')
const password = ref('')
const saving = ref(false)
const showPassword = ref(false)

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      newEyebrow: 'Anonymous community',
      editEyebrow: 'Edit post',
      newTitle: 'Ask Seoul locals',
      editTitle: 'Edit your post',
      description:
        'No account is required. Your password is only used to edit or delete this post.',
      titleLabel: 'Title',
      contentLabel: 'Question or local tip',
      passwordLabel: 'Edit password',
      titlePlaceholder: 'What would you like to ask about Seoul?',
      contentPlaceholder:
        'Describe your question or share a helpful local travel tip.',
      passwordPlaceholder: 'Enter 4–20 characters',
      passwordHelp:
        'Remember this password. It is required to edit or delete your post.',
      languageTitle: 'Post language',
      languageDescription:
        'The post will be registered using your current language setting.',
      show: 'Show',
      hide: 'Hide',
      togglePassword: 'Show or hide password',
      cancel: 'Cancel',
      publish: 'Publish post',
      update: 'Save changes',
      saving: 'Saving',
      close: 'Close',
      fillFields: 'Please enter a title and content.',
      passwordRequired: 'Please enter the edit password.',
      passwordLength: 'The password must be between 4 and 20 characters.',
      saveFailed: 'Could not save the post.'
    }
  }

  return {
    newEyebrow: '익명 커뮤니티',
    editEyebrow: '게시글 수정',
    newTitle: '서울 주민에게 질문하기',
    editTitle: '게시글 수정하기',
    description:
      '로그인 없이 작성할 수 있으며, 설정한 비밀번호로만 수정·삭제할 수 있습니다.',
    titleLabel: '제목',
    contentLabel: '질문 또는 로컬 팁',
    passwordLabel: '수정용 비밀번호',
    titlePlaceholder: '서울에 관해 무엇이 궁금한가요?',
    contentPlaceholder:
      '여행 중 궁금한 점이나 외국인 여행자에게 도움이 되는 정보를 작성해 주세요.',
    passwordPlaceholder: '4~20자로 입력해 주세요',
    passwordHelp:
      '게시글 수정과 삭제에 필요하므로 비밀번호를 꼭 기억해 주세요.',
    languageTitle: '게시글 언어',
    languageDescription:
      '현재 설정된 언어로 게시글이 등록됩니다.',
    show: '보기',
    hide: '숨김',
    togglePassword: '비밀번호 표시 전환',
    cancel: '취소',
    publish: '게시글 등록',
    update: '수정 완료',
    saving: '저장 중',
    close: '닫기',
    fillFields: '제목과 내용을 모두 입력해 주세요.',
    passwordRequired: '수정용 비밀번호를 입력해 주세요.',
    passwordLength: '비밀번호는 4자 이상 20자 이하로 입력해 주세요.',
    saveFailed: '게시글 저장에 실패했습니다.'
  }
})

watch(
  () => props.post,
  (post) => {
    title.value = post?.title || ''
    content.value = post?.content || ''
    password.value = ''
    showPassword.value = false
  },
  {
    immediate: true
  }
)

async function save() {
  const normalizedTitle = title.value.trim()
  const normalizedContent = content.value.trim()

  if (!normalizedTitle || !normalizedContent) {
    window.alert(copy.value.fillFields)
    return
  }

  if (!password.value) {
    window.alert(copy.value.passwordRequired)
    return
  }

  if (password.value.length < 4 || password.value.length > 20) {
    window.alert(copy.value.passwordLength)
    return
  }

  saving.value = true

  try {
    const payload = {
      title: normalizedTitle,
      content: normalizedContent,
      password: password.value,
      language: settings.lang || locale.value
    }

    let result

    if (props.post?.id) {
      result = await api.updatePost(props.post.id, payload)
    } else {
      result = await api.createPost(payload)
    }

    emit('saved', result)
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      copy.value.saveFailed

    window.alert(message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 22px;
  background: rgba(13, 21, 39, 0.58);
  backdrop-filter: blur(7px);
}

.editor-panel {
  width: min(100%, 720px);
  max-height: calc(100vh - 44px);
  overflow-y: auto;
  background: #fff;
  border: 1px solid rgba(229, 233, 242, 0.94);
  border-radius: 25px;
  box-shadow: 0 24px 70px rgba(13, 21, 39, 0.24);
}

.editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 23px 23px 20px;
  border-bottom: 1px solid #edf0f5;
}

.editor-eyebrow {
  color: #5866e9;
  font-size: 11px;
  font-weight: 850;
}

.editor-header h2 {
  margin: 5px 0 0;
  color: #172137;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: -0.025em;
}

.editor-header p {
  max-width: 530px;
  margin: 7px 0 0;
  color: #7d899c;
  font-size: 12px;
  line-height: 1.6;
}

.close-button {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  padding: 0;
  color: #69768a;
  background: #f5f7fa;
  border: 1px solid #e7eaf0;
  border-radius: 12px;
}

.editor-form {
  display: grid;
  gap: 20px;
  padding: 22px 23px 24px;
}

.form-group {
  position: relative;
  display: grid;
  gap: 8px;
}

.form-label {
  color: #263148;
  font-size: 12px;
  font-weight: 850;
}

.form-label strong {
  color: #e85663;
}

.form-control {
  width: 100%;
  min-height: 49px;
  padding: 13px 14px;
  color: #1c263b;
  font-size: 13px;
  background: #fff;
  border: 1px solid #dfe4ed;
  border-radius: 13px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.form-control:focus {
  border-color: rgba(83, 98, 238, 0.7);
  box-shadow: 0 0 0 4px rgba(83, 98, 238, 0.1);
}

.form-control::placeholder,
.password-input::placeholder {
  color: #a1abbb;
}

.content-control {
  min-height: 190px;
  line-height: 1.65;
  resize: vertical;
}

.character-count {
  position: absolute;
  right: 9px;
  bottom: -17px;
  color: #a0a9b8;
  font-size: 9px;
}

.password-group {
  margin-top: 4px;
}

.password-input-wrap {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 49px;
  padding: 0 11px 0 14px;
  color: #768399;
  background: #fff;
  border: 1px solid #dfe4ed;
  border-radius: 13px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.password-input-wrap:focus-within {
  border-color: rgba(83, 98, 238, 0.7);
  box-shadow: 0 0 0 4px rgba(83, 98, 238, 0.1);
}

.password-input {
  min-width: 0;
  height: 47px;
  flex: 1;
  padding: 0;
  color: #1c263b;
  font-size: 13px;
  background: transparent;
  border: 0;
  outline: none;
}

.password-toggle {
  flex-shrink: 0;
  padding: 5px;
  color: #5664e6;
  font-size: 10px;
  font-weight: 850;
  background: transparent;
  border: 0;
}

.form-help {
  color: #919bad;
  font-size: 10px;
  line-height: 1.5;
}

.language-notice {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px;
  background: #f5f6ff;
  border: 1px solid #e6e8fb;
  border-radius: 14px;
}

.language-icon {
  display: grid;
  place-items: center;
  width: 37px;
  height: 31px;
  flex-shrink: 0;
  color: #5362e8;
  font-size: 10px;
  font-weight: 900;
  background: #fff;
  border: 1px solid #dee2fa;
  border-radius: 9px;
}

.language-notice strong {
  color: #2f3a52;
  font-size: 11px;
  font-weight: 850;
}

.language-notice p {
  margin: 2px 0 0;
  color: #8590a2;
  font-size: 10px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding-top: 2px;
}

.cancel-button,
.save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 43px;
  padding: 0 17px;
  font-size: 12px;
  font-weight: 850;
  border-radius: 12px;
}

.cancel-button {
  color: #68758b;
  background: #fff;
  border: 1px solid #dfe4ed;
}

.save-button {
  min-width: 125px;
  color: #fff;
  background: linear-gradient(135deg, #5362ee, #735be8);
  border: 0;
  box-shadow: 0 9px 20px rgba(83, 98, 238, 0.24);
}

.cancel-button:disabled,
.save-button:disabled,
.close-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.save-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.38);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .editor-backdrop {
    align-items: end;
    padding: 0;
  }

  .editor-panel {
    width: 100%;
    max-height: 94vh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 25px 25px 0 0;
  }

  .editor-header {
    padding: 20px 18px 17px;
  }

  .editor-form {
    padding: 19px 18px calc(22px + env(safe-area-inset-bottom));
  }

  .editor-actions {
    display: grid;
    grid-template-columns: 1fr 1.3fr;
  }

  .cancel-button,
  .save-button {
    width: 100%;
    padding: 0 10px;
  }
}
</style>