<template>
  <div class="community-page">
    <!-- 상단 헤더 (Home과 동일한 형태, 기존 스타일 유지) -->
    <header class="home-header">
      <button
        type="button"
        class="brand"
        aria-label="홈으로 이동"
        @click="router.push('/')"
      >
        <span class="brand-logo">W</span>

        <span class="brand-copy">
          <strong>Welcome Seoul</strong>
          <span>{{ copy.badgeSubtitle }}</span>
        </span>
      </button>

      <div class="language-switch" aria-label="언어 선택">
        <button
          type="button"
          :class="{ active: locale === 'ko' }"
          @click="changeLanguage('ko')"
        >
          KO
        </button>

        <button
          type="button"
          :class="{ active: locale === 'en' }"
          @click="changeLanguage('en')"
        >
          EN
        </button>
      </div>
    </header>

    <section class="community-hero">
      <div class="hero-decoration decoration-one" />
      <div class="hero-decoration decoration-two" />

      <div class="community-hero-content">
        <span class="hero-badge">
          <span class="online-dot" />
          {{ copy.badge }}
        </span>

        <h1>{{ copy.title }}</h1>

        <p>{{ copy.description }}</p>

        <button
          type="button"
          class="write-button"
          @click="openNew"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
          </svg>

          {{ copy.writePost }}
        </button>
      </div>
    </section>

    <main class="community-content">
      <section class="community-toolbar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.7-3.7" />
          </svg>

          <input
            v-model="searchKeyword"
            type="search"
            :placeholder="copy.searchPlaceholder"
            aria-label="게시글 검색"
          />

          <button
            v-if="searchKeyword"
            type="button"
            class="clear-button"
            :aria-label="copy.clearSearch"
            @click="searchKeyword = ''"
          >
            ×
          </button>
        </div>

        <button type="button" class="desktop-write-button" @click="openNew">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>

          {{ copy.writePost }}
        </button>
      </section>

      <section class="post-section">
        <div class="section-heading">
          <div>
            <span>{{ copy.sectionEyebrow }}</span>
            <h2>{{ copy.sectionTitle }}</h2>
            <p>{{ copy.sectionDescription }}</p>
          </div>
        </div>

        <PostList
          :key="listRefreshKey"
          :search-keyword="searchKeyword"
          @edit="openEdit"
          @view="openView"
          @changed="refreshList"
        />
      </section>

      <footer class="site-footer">
        <div class="container">
          <strong>Welcome Seoul</strong>
          <p>{{ copy.dataSource }}</p>
          <p>License: 공공누리 제3유형</p>
        </div>
      </footer>
    </main>

    <Teleport to="body">
      <PostEditor v-if="editorOpen" :post="editingPost" @close="closeEditor" @saved="handleSaved" />
      <PostDetail v-if="detailOpen" :postId="detailPostId" @close="closeDetail" @saved="refreshList" />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PostList from '../components/PostList.vue'
import PostEditor from '../components/PostEditor.vue'
import useApi from '../composables/useApi'
import PostDetail from '../components/PostDetail.vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettings } from '../stores/settings'

const { locale } = useI18n()
const settings = useSettings()
const api = useApi()
const route = useRoute()
const router = useRouter()

const editorOpen = ref(false)
const editingPost = ref(null)
const detailOpen = ref(false)
const detailPostId = ref(null)
const searchKeyword = ref('')
const listRefreshKey = ref(0)

const copy = computed(() => {
  if (locale.value === 'en') {
    return {
      badge: 'Seoul local community',
      badgeSubtitle: 'Local tips for global travelers',
      title: 'Ask locals.\nTravel Seoul with confidence.',
      description:
        'Share questions anonymously and discover practical tips from Seoul residents and international travelers.',
      writePost: 'Write a post',
      searchPlaceholder: 'Search questions, places or travel tips',
      clearSearch: 'Clear search',
      guideTitle: 'Korean and English posts are welcome',
      guideDescription:
        'No account is required. Set a password when writing a post to edit or delete it later.',
      sectionEyebrow: 'Latest community',
      sectionTitle: 'Questions and local tips',
      sectionDescription:
        'Explore recent travel questions and useful information shared by the community.',
      dataSource: 'Data: Korea Tourism Organization TourAPI 4.0'
    }
  }

  return {
    badge: '서울 로컬 커뮤니티',
    badgeSubtitle: '외국인을 위한 서울 로컬 정보',
    title: '현지인에게 묻고,\n안심하고 서울을 여행하세요.',
    description:
      '로그인 없이 익명으로 질문하고, 서울 주민과 외국인 여행자가 공유한 실용적인 정보를 확인하세요.',
    writePost: '게시글 작성',
    searchPlaceholder: '질문, 장소 또는 여행 팁을 검색하세요',
    clearSearch: '검색어 지우기',
    guideTitle: '한국어와 영어로 자유롭게 작성할 수 있어요',
    guideDescription:
      '회원가입은 필요하지 않으며, 작성할 때 설정한 비밀번호로 수정과 삭제를 진행합니다.',
    sectionEyebrow: '최신 커뮤니티',
    sectionTitle: '여행 질문과 로컬 팁',
    sectionDescription:
      '커뮤니티에 새로 등록된 서울 여행 질문과 유용한 정보를 확인하세요.',
    dataSource: '데이터 출처: 한국관광공사 TourAPI 4.0'
  }
})

function openNew() {
  editingPost.value = null
  editorOpen.value = true
}

async function openEdit(post) {
  editorOpen.value = true

  try {
    const data = await api.fetchPost(post.id)
    editingPost.value = data
  } catch (err) {
    editingPost.value = post
  }
}

function closeEditor() {
  editorOpen.value = false
  editingPost.value = null
}

function handleSaved() {
  closeEditor()
  refreshList()
}

function refreshList() {
  listRefreshKey.value += 1
}

watch(
  () => route.query.post,
  (val) => {
    if (val) {
      detailPostId.value = val
      detailOpen.value = true
    } else {
      detailOpen.value = false
      detailPostId.value = null
    }
  },
  { immediate: true }
)

function closeDetail() {
  detailOpen.value = false
  detailPostId.value = null

  if (route.query && route.query.post) {
    const q = { ...route.query }
    delete q.post
    router.replace({ path: route.path, query: q })
  }
}

function openView(post) {
  detailPostId.value = post.id
  detailOpen.value = true
}

watch(editorOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

function changeLanguage(language) {
  locale.value = language
  if (settings.setLang) settings.setLang(language)
  localStorage.setItem('welcome-seoul-language', language)
}
</script>

<style scoped>
/* --- keep Community's original layout and styling, and use Home's footer styles exactly --- */

.community-page {
  min-height: 100vh;
  padding-bottom: 32px;
  color: #172137;
  background: #f6f8fc;
}

.community-hero {
  position: relative;
  overflow: hidden;
  padding: 62px 18px 76px;
  color: #fff;
  background:
    linear-gradient(145deg, #4f60ed 0%, #7357e8 58%, #8b5be2 100%);
}

.community-hero::after {
  position: absolute;
  inset: 0;
  content: "";
  background:
    linear-gradient(120deg, rgba(255,255,255,0.08), transparent 45%);
}

.hero-decoration {
  position: absolute;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.decoration-one {
  top: -80px;
  right: -75px;
  width: 260px;
  height: 260px;
}

.decoration-two {
  bottom: -100px;
  left: -70px;
  width: 220px;
  height: 220px;
}

.community-hero-content {
  position: relative;
  z-index: 1;
  max-width: 1140px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 850;
  background: rgba(23, 32, 55, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  backdrop-filter: blur(9px);
}

.online-dot {
  width: 7px;
  height: 7px;
  background: #45e0ad;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(69, 224, 173, 0.16);
}

.community-hero h1 {
  max-width: 730px;
  margin: 17px 0 0;
  font-size: clamp(32px, 8vw, 55px);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.045em;
  white-space: pre-line;
}

.community-hero p {
  max-width: 620px;
  margin: 15px 0 0;
  color: rgba(255, 255, 255, 0.83);
  font-size: 14px;
  line-height: 1.7;
}

.write-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 45px;
  margin-top: 23px;
  padding: 0 17px;
  color: #5261e5;
  font-size: 12px;
  font-weight: 900;
  background: #fff;
  border: 0;
  border-radius: 13px;
  box-shadow: 0 11px 25px rgba(31, 38, 100, 0.18);
}

.community-content {
  position: relative;
  z-index: 3;
  max-width: 920px;
  margin: -31px auto 0;
  padding: 0 17px;
}

.community-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e4e8f1;
  border-radius: 19px;
  box-shadow: 0 15px 36px rgba(25, 37, 64, 0.12);
  backdrop-filter: blur(14px);
}

.search-wrap {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  color: #5665e7;
}

.search-wrap input {
  min-width: 0;
  height: 43px;
  flex: 1;
  padding: 0;
  color: #1d273d;
  font-size: 13px;
  background: transparent;
  border: 0;
  outline: none;
}

.clear-button {
  width: 27px;
  height: 27px;
  padding: 0;
  color: #8792a4;
  font-size: 20px;
  line-height: 1;
  background: #f0f2f6;
  border: 0;
  border-radius: 50%;
}

.desktop-write-button {
  display: none;
  align-items: center;
  gap: 6px;
  height: 43px;
  padding: 0 15px;
  color: #fff;
  font-size: 11px;
  font-weight: 850;
  background: linear-gradient(135deg, #5362ee, #735be8);
  border: 0;
  border-radius: 12px;
}

.community-guide {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 15px;
  padding: 14px;
  background: #fff;
  border: 1px solid #e5e9f1;
  border-radius: 16px;
}

.guide-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  font-size: 20px;
  background: #eef0ff;
  border-radius: 14px;
}

.post-section {
  margin-top: 29px;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading span {
  color: #5765e8;
  font-size: 11px;
  font-weight: 850;
}

.section-heading h2 {
  margin: 5px 0 0;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: -0.025em;
}

.section-heading p {
  margin: 6px 0 0;
  color: #7f8b9f;
  font-size: 12px;
  line-height: 1.6;
}

/* header styles (Home-identical) */
.home-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e9edf5;
  backdrop-filter: blur(16px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand-logo {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  color: #fff;
  font-size: 19px;
  font-weight: 900;
  background: linear-gradient(135deg, #5263f4, #7b61ef);
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(82, 99, 244, 0.25);
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.brand-copy strong {
  overflow: hidden;
  font-size: 17px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy span {
  overflow: hidden;
  color: #8a96aa;
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.language-switch {
  display: flex;
  padding: 3px;
  background: #f1f3f8;
  border: 1px solid #e4e8f1;
  border-radius: 999px;
}

.language-switch button {
  width: 36px;
  height: 30px;
  padding: 0;
  color: #8b96a9;
  font-size: 11px;
  font-weight: 800;
  background: transparent;
  border: 0;
  border-radius: 999px;
}

.language-switch button.active {
  color: #fff;
  background: #5362ee;
  box-shadow: 0 4px 10px rgba(83, 98, 238, 0.23);
}

/* Home.vue와 동일한 푸터 */
.site-footer {
  padding: 20px 4px 30px;
  color: #97a1b1;
  font-size: 10px;
  line-height: 1.6;
}

.site-footer .container {
  margin: 0;
  padding: 0;
}

.site-footer strong {
  color: #6e7a90;
  font-size: 12px;
}

.site-footer p {
  margin: 3px 0 0;
}

@media (min-width: 640px) {
  .community-hero {
    padding-right: 30px;
    padding-left: 30px;
  }

  .community-content {
    padding-right: 28px;
    padding-left: 28px;
  }

  .desktop-write-button {
    display: inline-flex;
  }

  .write-button {
    display: none;
  }
}

@media (min-width: 900px) {
  .community-hero {
    padding-top: 78px;
    padding-bottom: 95px;
  }

  .community-hero p {
    font-size: 15px;
  }

  .community-content {
    margin-top: -34px;
  }
}
</style>