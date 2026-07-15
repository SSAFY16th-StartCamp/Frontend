<template>
  <div class="detail-backdrop" @mousedown.self="close">
    <section class="detail-panel">
      <header class="detail-header">
        <div class="title-wrap">
          <h2>{{ post?.title || '' }}</h2>
          <div class="meta">
            <span class="lang">{{ post?.language || 'ko' }}</span>
            <span class="views">👁 {{ post?.view_count ?? 0 }}</span>
          </div>
        </div>

        <button class="close-btn" @click="close" aria-label="Close">✕</button>
      </header>

      <div class="detail-body">
        <article class="content">
          <p v-if="post">{{ post.content }}</p>
        </article>

        <div v-if="placeLabel" class="place">
          <strong>Place:</strong>
          <span class="place-name">{{ placeLabel }}</span>
        </div>

        <div v-if="tagNames.length" class="tags">
          <span v-for="t in tagNames" :key="t" class="tag-chip">#{{ t }}</span>
        </div>

        <section class="comments">
          <h3>Comments <small>({{ post?.comments?.length || 0 }})</small></h3>

          <div v-if="post?.comments?.length" class="comment-list">
            <div v-for="c in post.comments" :key="c.id" class="comment-item">
              <div class="comment-text">{{ c.content }}</div>
              <div class="comment-meta">
                <small>{{ c.created_at || c.createdAt }}</small>
              </div>
            </div>
          </div>

          <form @submit.prevent="submitComment" class="comment-form">
            <textarea v-model="commentContent" :placeholder="copy.writeCommentPlaceholder" required></textarea>
            <input v-model="commentPassword" type="password" :placeholder="copy.passwordPlaceholder" required />
            <div class="comment-actions">
              <button type="submit" :disabled="commenting">{{ copy.postComment }}</button>
            </div>
          </form>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import useApi from '../composables/useApi'
import useLocations from '../composables/useLocations'

const props = defineProps({ postId: { type: [String, Number], required: true } })
const emit = defineEmits(['close', 'saved'])

const api = useApi()
const locationApi = useLocations()
const { locale } = useI18n()

const copy = computed(() => {
  if (String(locale.value).toLowerCase().startsWith('en')) {
    return {
      writeCommentPlaceholder: 'Write a comment',
      passwordPlaceholder: 'Password',
      postComment: 'Post comment'
    }
  }

  return {
    writeCommentPlaceholder: '댓글을 입력하세요',
    passwordPlaceholder: '비밀번호',
    postComment: '댓글 작성'
  }
})

const post = ref(null)
const placeLabel = ref('')
const tagNames = ref([])

const commentContent = ref('')
const commentPassword = ref('')
const commenting = ref(false)

async function load() {
  try {
    const data = await api.fetchPost(props.postId)
    post.value = data

    // fetch first place name if available
    const pid = (data.place_ids && data.place_ids[0]) || (data.place_id) || null
    if (pid) {
      try {
        const loc = await locationApi.fetchLocation(pid)
        placeLabel.value = localeLabel(loc)
      } catch (e) {
        placeLabel.value = ''
      }
    } else {
      placeLabel.value = ''
    }

    // map tag ids to names via tags API
    try {
      const tagData = await api.fetchTags()
      const items = Array.isArray(tagData) ? tagData : tagData?.items || []
      const tagMap = new Map(items.map(t => [Number(t.id), t]))
      const ids = data.tag_ids || data.tags || []
      tagNames.value = (ids || []).map((id) => {
        const entry = tagMap.get(Number(id))
        if (!entry) return String(id)
        return String(locale.value).toLowerCase().startsWith('en') ? entry.name_en || entry.name : entry.name
      })
    } catch (e) {
      tagNames.value = (data.tag_ids || data.tags || []).map(String)
    }
  } catch (err) {
    post.value = null
  }
}

function localeLabel(loc) {
  if (!loc) return ''
  if (String(locale.value).toLowerCase().startsWith('en')) {
    return loc.titleEn || loc.title || ''
  }
  return loc.title || loc.titleEn || ''
}

async function submitComment() {
  if (!commentContent.value || !commentPassword.value) return
  commenting.value = true
  try {
    await api.createComment(props.postId, {
      content: commentContent.value,
      password: commentPassword.value,
      language: String(locale.value).toLowerCase().startsWith('en') ? 'en' : 'ko'
    })

    commentContent.value = ''
    commentPassword.value = ''
    await load()
    emit('saved')
  } catch (err) {
    window.alert(err.message || 'Failed to post comment')
  } finally {
    commenting.value = false
  }
}

onMounted(load)

watch(() => props.postId, () => load())

function close() {
  emit('close')
}
</script>

<style scoped>
.detail-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
}
.detail-panel {
  width: min(100%, 820px);
  max-height: 90vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #eef2ff;
  padding-bottom: 12px;
}
.title-wrap h2 {
  margin: 0;
  font-size: 18px;
}
.title-wrap .meta {
  margin-top: 6px;
  color: #7d8799;
  font-size: 12px;
}
.close-btn {
  background: transparent;
  border: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.detail-body { padding-top: 12px }
.content { margin: 8px 0 16px }
.place { margin: 8px 0; color: #2d3748 }
.place-name { margin-left: 6px; font-weight: 700 }
.tags { margin: 8px 0 16px }
.tag-chip { display:inline-block; background:#f5f7ff; color:#3540a3; padding:6px 8px; border-radius:999px; margin-right:8px; font-size:13px }
.comments { margin-top: 18px }
.comment-list { display:flex; flex-direction:column; gap:10px; margin-bottom:12px }
.comment-item { background:#fbfbff; border:1px solid #eef2ff; padding:10px; border-radius:8px }
.comment-meta { color:#8891a6; font-size:12px; margin-top:6px }
.comment-form textarea { width:100%; min-height:90px; padding:10px; border-radius:8px; border:1px solid #e6eefc }
.comment-form input { width:100%; margin-top:8px; padding:8px; border-radius:8px; border:1px solid #e6eefc }
.comment-actions { display:flex; justify-content:flex-end; margin-top:8px }
.comment-actions button { background:linear-gradient(135deg,#5362ee,#735be8); color:#fff; border:0; padding:8px 14px; border-radius:8px; cursor:pointer }
</style>
