<template>
  <section class="post-list-section">
    <div v-if="loading" class="state-card">
      <div class="loading-spinner" />
      <strong>{{ copy.loading }}</strong>
      <p>{{ copy.loadingDescription }}</p>
    </div>

    <div v-else-if="errorMessage" class="state-card error-state">
      <span class="state-icon">!</span>
      <strong>{{ copy.loadFailed }}</strong>
      <p>{{ errorMessage }}</p>

      <button type="button" class="retry-button" @click="load">
        {{ copy.retry }}
      </button>
    </div>

    <div v-else-if="filteredPosts.length === 0" class="state-card">
      <span class="state-icon">💬</span>
      <strong>
        {{ searchKeyword ? copy.noSearchResult : copy.emptyTitle }}
      </strong>
      <p>
        {{ searchKeyword ? copy.noSearchDescription : copy.emptyDescription }}
      </p>
    </div>

    <div v-else class="post-list">
      <article
        v-for="post in filteredPosts"
        :key="post.id"
        class="post-card"
      >
        <div class="post-card-header">
          <div class="post-meta">
            <span
              class="language-badge"
              :class="post.language === 'en' ? 'english' : 'korean'"
            >
              {{ post.language === 'en' ? 'EN' : 'KO' }}
            </span>

            <span class="anonymous-label">
              {{ copy.anonymous }}
            </span>

            <span class="meta-divider">·</span>

            <time :datetime="post.created_at || post.createdAt">
              {{ formatDate(post.created_at || post.createdAt) }}
            </time>
          </div>

          <span v-if="post.view_count !== undefined" class="view-count">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>

            {{ post.view_count }}
          </span>
        </div>

        <button
          type="button"
          class="post-content-button"
          @click="$emit('edit', post)"
        >
          <h3>{{ post.title }}</h3>

          <p>{{ post.content }}</p>
        </button>

        <div v-if="post.tags?.length" class="post-tags">
          <span v-for="tag in post.tags" :key="tag">
            #{{ tag }}
          </span>
        </div>

        <div class="post-card-footer">
          <div class="post-info">
            <span v-if="post.category" class="category-label">
              {{ post.category }}
            </span>

            <span v-if="post.location?.name || post.location_name">
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
              >
                <path
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>

              {{ post.location?.name || post.location_name }}
            </span>
          </div>

          <div class="post-actions">
            <button
              type="button"
              class="action-button edit-button"
              @click="$emit('edit', post)"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
              >
                <path d="M12 20h9" />
                <path
                  d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"
                />
              </svg>

              {{ copy.edit }}
            </button>

            <button
              type="button"
              class="action-button delete-button"
              :disabled="deletingId === post.id"
              @click="tryDelete(post)"
            >
              <svg
                v-if="deletingId !== post.id"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6 18 20H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>

              <span
                v-else
                class="button-spinner"
                aria-label="삭제 중"
              />

              {{ deletingId === post.id ? copy.deleting : copy.delete }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import useApi from '../composables/useApi'

const props = defineProps({
  searchKeyword: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['edit', 'changed'])

const api = useApi()
const { locale } = useI18n()

const posts = ref([])
const loading = ref(true)
const errorMessage = ref('')
const deletingId = ref(null)

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      anonymous: 'Anonymous traveler',
      edit: 'Edit',
      delete: 'Delete',
      deleting: 'Deleting',
      loading: 'Loading community posts',
      loadingDescription: 'Bringing you the latest questions and local tips.',
      loadFailed: 'Could not load posts',
      retry: 'Try again',
      emptyTitle: 'No community posts yet',
      emptyDescription: 'Be the first traveler to ask Seoul locals a question.',
      noSearchResult: 'No matching posts found',
      noSearchDescription: 'Try another keyword or clear the search.',
      passwordPrompt: 'Enter the password set when the post was created.',
      deleteConfirm: 'Delete this post?',
      deleteSuccess: 'The post has been deleted.',
      deleteFailed: 'Failed to delete the post.'
    }
  }

  return {
    anonymous: '익명 여행자',
    edit: '수정',
    delete: '삭제',
    deleting: '삭제 중',
    loading: '커뮤니티 글을 불러오고 있어요',
    loadingDescription: '최신 질문과 서울 로컬 팁을 가져오는 중입니다.',
    loadFailed: '게시글을 불러오지 못했어요',
    retry: '다시 시도',
    emptyTitle: '아직 등록된 게시글이 없어요',
    emptyDescription: '서울 주민에게 궁금한 내용을 가장 먼저 질문해 보세요.',
    noSearchResult: '검색 결과가 없어요',
    noSearchDescription: '다른 검색어를 입력하거나 검색어를 지워 보세요.',
    passwordPrompt: '게시글 작성 시 설정한 비밀번호를 입력하세요.',
    deleteConfirm: '이 게시글을 삭제할까요?',
    deleteSuccess: '게시글이 삭제되었습니다.',
    deleteFailed: '게시글 삭제에 실패했습니다.'
  }
})

const filteredPosts = computed(() => {
  const keyword = props.searchKeyword.trim().toLowerCase()

  if (!keyword) {
    return posts.value
  }

  return posts.value.filter((post) => {
    const target = [
      post.title,
      post.content,
      post.category,
      post.location?.name,
      post.location_name,
      ...(post.tags || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return target.includes(keyword)
  })
})

async function load() {
  loading.value = true
  errorMessage.value = ''

  const [error, data] = await api.safe(() =>
    api.fetchPosts({
      page: 1,
      size: 50,
      sort: 'latest'
    })
  )

  if (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      copy.value.loadFailed

    posts.value = []
    loading.value = false
    return
  }

  posts.value = Array.isArray(data) ? data : data?.items || []
  loading.value = false
}

function formatDate(timestamp) {
  if (!timestamp) {
    return ''
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return new Intl.DateTimeFormat(
    locale.value === 'en' ? 'en-US' : 'ko-KR',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  ).format(date)
}

async function tryDelete(post) {
  const password = window.prompt(copy.value.passwordPrompt)

  if (!password) {
    return
  }

  const confirmed = window.confirm(copy.value.deleteConfirm)

  if (!confirmed) {
    return
  }

  deletingId.value = post.id

  const [error] = await api.safe(() =>
    api.deletePost(post.id, {
      password
    })
  )

  deletingId.value = null

  if (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      copy.value.deleteFailed

    window.alert(message)
    return
  }

  window.alert(copy.value.deleteSuccess)
  await load()
  emit('changed')
}

onMounted(load)

defineExpose({
  load
})
</script>

<style scoped>
.post-list-section {
  width: 100%;
}

.post-list {
  display: grid;
  gap: 14px;
}

.post-card {
  overflow: hidden;
  padding: 17px;
  background: #fff;
  border: 1px solid #e5e9f2;
  border-radius: 19px;
  box-shadow: 0 6px 18px rgba(25, 37, 64, 0.055);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.post-card:hover {
  border-color: rgba(83, 98, 238, 0.28);
  box-shadow: 0 12px 28px rgba(25, 37, 64, 0.09);
  transform: translateY(-2px);
}

.post-card-header,
.post-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.post-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: #8b96a9;
  font-size: 11px;
}

.language-badge {
  display: inline-grid;
  place-items: center;
  min-width: 31px;
  height: 23px;
  padding: 0 7px;
  color: #5263e9;
  font-size: 9px;
  font-weight: 900;
  background: #eef0ff;
  border-radius: 7px;
}

.language-badge.english {
  color: #078b78;
  background: #e6faf6;
}

.anonymous-label {
  overflow: hidden;
  color: #68758b;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-divider {
  color: #c3cad5;
}

.view-count {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  color: #929daf;
  font-size: 11px;
}

.post-content-button {
  display: block;
  width: 100%;
  padding: 13px 0 14px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
}

.post-content-button h3 {
  margin: 0;
  color: #172137;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.45;
  letter-spacing: -0.018em;
}

.post-content-button p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: #637087;
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  line-clamp: 3;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 14px;
}

.post-tags span {
  padding: 4px 8px;
  color: #5c69dc;
  font-size: 10px;
  font-weight: 750;
  background: #f0f2ff;
  border-radius: 999px;
}

.post-card-footer {
  padding-top: 13px;
  border-top: 1px solid #edf0f5;
}

.post-info {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #7b879b;
  font-size: 11px;
}

.post-info > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.category-label {
  padding: 4px 8px;
  color: #5263e9;
  font-weight: 800;
  background: #eef0ff;
  border-radius: 999px;
}

.post-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  background: transparent;
  border-radius: 10px;
}

.edit-button {
  color: #5263e9;
  border: 1px solid #dfe3fa;
}

.delete-button {
  color: #e45662;
  border: 1px solid #f5dfe2;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.state-card {
  display: flex;
  min-height: 250px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: #7d899d;
  text-align: center;
  background: #fff;
  border: 1px dashed #d5dbe6;
  border-radius: 20px;
}

.state-card strong {
  margin-top: 12px;
  color: #263149;
  font-size: 16px;
  font-weight: 900;
}

.state-card p {
  max-width: 360px;
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  color: #5263e9;
  font-size: 22px;
  font-weight: 900;
  background: #eef0ff;
  border-radius: 17px;
}

.error-state .state-icon {
  color: #e45662;
  background: #fff0f1;
}

.retry-button {
  height: 38px;
  margin-top: 16px;
  padding: 0 15px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  background: #5362ee;
  border: 0;
  border-radius: 11px;
}

.loading-spinner,
.button-spinner {
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #e1e5fa;
  border-top-color: #5362ee;
}

.button-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(228, 86, 98, 0.25);
  border-top-color: #e45662;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .post-card {
    padding: 15px;
  }

  .anonymous-label,
  .meta-divider {
    display: none;
  }

  .post-card-footer {
    align-items: flex-end;
  }

  .post-info {
    max-width: 48%;
  }

  .action-button {
    width: 35px;
    padding: 0;
    justify-content: center;
    font-size: 0;
  }

  .action-button svg {
    width: 16px;
    height: 16px;
  }
}
</style>