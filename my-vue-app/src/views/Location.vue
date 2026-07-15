<script setup>
import {
  computed,
  onMounted,
  ref,
  watch
} from 'vue'
import {
  useRoute,
  useRouter
} from 'vue-router'
import { useI18n } from 'vue-i18n'

import useLocations from '../composables/useLocations'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const api = useLocations()

const allItems = ref([])
const loading = ref(true)
const error = ref('')

const progress = ref({
  loaded: 0,
  total: 0
})

const keyword = ref(
  String(route.query.q || '')
)

const category = ref(
  String(route.query.category || 'all')
)

const district = ref('all')
const page = ref(1)

const pageSize = 24

const categories = [
  ['all', '✨'],
  ['attraction', '🏛️'],
  ['culture', '🎨'],
  ['festival', '🎉'],
  ['course', '🚶'],
  ['leisure', '🚲'],
  ['accommodation', '🛏️'],
  ['shopping', '🛍️'],
  ['restaurant', '🍽️']
]

const labels = computed(() => {
  const isEnglish = locale.value === 'en'

  return isEnglish
    ? {
        brandSubtitle: 'Browse every Seoul place',
        title: 'All Seoul places',
        description:
          'Browse attractions, festivals, cultural facilities, accommodations and restaurants loaded from the Seoul tourism API.',
        search: 'Search place name or address',
        district: 'District',
        all: 'All',
        loading: 'Loading Seoul tourism data',
        loaded: 'loaded',
        noResult: 'No matching places found.',
        loadFailed: 'Could not load location data.',
        retry: 'Try again',
        map: 'View on map',
        community: 'Community',
        previous: 'Previous',
        next: 'Next',
        count: 'places',
        page: 'Page',
        source:
          'Data: Korea Tourism Organization TourAPI 4.0',
        category: {
          all: 'All',
          attraction: 'Attractions',
          culture: 'Culture',
          festival: 'Festivals',
          course: 'Travel courses',
          leisure: 'Leisure',
          accommodation: 'Stay',
          shopping: 'Shopping',
          restaurant: 'Restaurants'
        }
      }
    : {
        brandSubtitle: '서울 전체 장소 둘러보기',
        title: '서울 장소 목록',
        description:
          '서울 관광 API에서 불러온 관광지, 축제, 문화시설, 숙박, 음식점 정보를 한 번에 확인하세요.',
        search: '장소명 또는 주소를 검색하세요',
        district: '자치구',
        all: '전체',
        loading: '서울 관광 데이터를 불러오고 있어요',
        loaded: '불러옴',
        noResult: '조건에 맞는 장소가 없습니다.',
        loadFailed: '장소 데이터를 불러오지 못했습니다.',
        retry: '다시 시도',
        map: '지도에서 보기',
        community: '커뮤니티',
        previous: '이전',
        next: '다음',
        count: '개의 장소',
        page: '페이지',
        source:
          '데이터: 한국관광공사 TourAPI 4.0',
        category: {
          all: '전체',
          attraction: '관광지',
          culture: '문화시설',
          festival: '축제',
          course: '여행코스',
          leisure: '레포츠',
          accommodation: '숙박',
          shopping: '쇼핑',
          restaurant: '음식점'
        }
      }
})

const districts = computed(() => {
  return [
    ...new Set(
      allItems.value
        .map((item) => item.district)
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, 'ko')
  )
})

const filteredItems = computed(() => {
  const normalizedKeyword =
    keyword.value.trim().toLowerCase()

  return allItems.value.filter((item) => {
    const categoryMatched =
      category.value === 'all' ||
      item.category === category.value

    const districtMatched =
      district.value === 'all' ||
      item.district === district.value

    const searchTarget = [
      item.title,
      item.titleEn,
      item.address,
      item.district,
      ...(item.tags || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const keywordMatched =
      !normalizedKeyword ||
      searchTarget.includes(
        normalizedKeyword
      )

    return (
      categoryMatched &&
      districtMatched &&
      keywordMatched
    )
  })
})

const totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(
      filteredItems.value.length /
        pageSize
    )
  )
})

const visibleItems = computed(() => {
  const start =
    (page.value - 1) * pageSize

  return filteredItems.value.slice(
    start,
    start + pageSize
  )
})

function titleOf(item) {
  if (locale.value === 'en') {
    return item.titleEn || item.title
  }

  return item.title
}

function categoryIcon(categoryId) {
  return (
    categories.find(
      ([id]) => id === categoryId
    )?.[1] || '📍'
  )
}

function changeLanguage(language) {
  locale.value = language

  localStorage.setItem(
    'welcome-seoul-language',
    language
  )
}

function goMap(item) {
  router.push({
    path: '/map',
    query: {
      place: item.id,
      category: item.category
    }
  })
}

function goCommunity(item) {
  router.push({
    path: '/community',
    query: {
      location: item.id
    }
  })
}

function goPage(nextPage) {
  page.value = Math.min(
    Math.max(nextPage, 1),
    totalPages.value
  )

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function clearFilters() {
  keyword.value = ''
  category.value = 'all'
  district.value = 'all'
  page.value = 1

  router.replace({
    path: '/location'
  })
}

async function loadLocations() {
  loading.value = true
  error.value = ''

  progress.value = {
    loaded: 0,
    total: 0
  }

  try {
    const result =
      await api.fetchAllLocations({
        pageSize: 500,
        maxItems: 10000,

        onProgress(value) {
          progress.value = value
        }
      })

    allItems.value = result.items
  } catch (loadError) {
    console.error(
      '장소 목록 조회 실패:',
      loadError
    )

    error.value =
      loadError.message ||
      labels.value.loadFailed
  } finally {
    loading.value = false
  }
}

watch(
  [
    keyword,
    category,
    district
  ],
  () => {
    page.value = 1
  }
)

watch(
  () => route.query.q,
  (query) => {
    keyword.value = String(
      query || ''
    )
  }
)

watch(
  () => route.query.category,
  (queryCategory) => {
    category.value = String(
      queryCategory || 'all'
    )
  }
)

watch(
  () => locale.value,
  (language) => {
    document.documentElement.lang =
      language === 'en'
        ? 'en'
        : 'ko'
  },
  {
    immediate: true
  }
)

onMounted(loadLocations)
</script>

<template>
  <div class="locations-page">
    <!-- 헤더 -->
    <header class="page-header">
      <button
        type="button"
        class="brand"
        aria-label="홈으로 이동"
        @click="router.push('/')"
      >
        <span class="brand-logo">
          W
        </span>

        <span class="brand-copy">
          <strong>Welcome Seoul</strong>
          <small>
            {{ labels.brandSubtitle }}
          </small>
        </span>
      </button>

      <div
        class="language-switch"
        aria-label="언어 선택"
      >
        <button
          type="button"
          :class="{
            active: locale === 'ko'
          }"
          @click="changeLanguage('ko')"
        >
          KO
        </button>

        <button
          type="button"
          :class="{
            active: locale === 'en'
          }"
          @click="changeLanguage('en')"
        >
          EN
        </button>
      </div>
    </header>

    <!-- 상단 히어로 -->
    <section class="page-hero">
      <div class="hero-content">
        <span class="hero-eyebrow">
          SEOUL PLACE DIRECTORY
        </span>

        <h1>
          {{ labels.title }}
        </h1>

        <p>
          {{ labels.description }}
        </p>
      </div>
    </section>

    <main class="page-content">
      <!-- 검색 및 필터 -->
      <section class="filter-panel">
        <label class="search-box">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />

            <path d="m20 20-3.7-3.7" />
          </svg>

          <input
            v-model="keyword"
            type="search"
            :placeholder="labels.search"
            :aria-label="labels.search"
          />

          <button
            v-if="keyword"
            type="button"
            class="clear-search"
            aria-label="검색어 지우기"
            @click="keyword = ''"
          >
            ×
          </button>
        </label>

        <label class="district-select">
          <span>
            {{ labels.district }}
          </span>

          <select v-model="district">
            <option value="all">
              {{ labels.all }}
            </option>

            <option
              v-for="value in districts"
              :key="value"
              :value="value"
            >
              {{ value }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="reset-button"
          @click="clearFilters"
        >
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M3 12a9 9 0 1 0 3-6.7"
            />

            <path d="M3 4v6h6" />
          </svg>

          Reset
        </button>

        <div class="category-scroll">
          <button
            v-for="[id, icon] in categories"
            :key="id"
            type="button"
            class="category-chip"
            :class="{
              active: category === id
            }"
            @click="category = id"
          >
            <span>
              {{ icon }}
            </span>

            {{ labels.category[id] }}
          </button>
        </div>
      </section>

      <!-- 로딩 -->
      <section
        v-if="loading"
        class="state-panel"
      >
        <span class="loader"></span>

        <strong>
          {{ labels.loading }}
        </strong>

        <p>
          {{
            progress.loaded.toLocaleString()
          }}
          /
          {{
            progress.total
              ? progress.total.toLocaleString()
              : '...'
          }}
          {{ labels.loaded }}
        </p>
      </section>

      <!-- 에러 -->
      <section
        v-else-if="error"
        class="state-panel error-state"
      >
        <span class="state-icon">
          !
        </span>

        <strong>
          {{ labels.loadFailed }}
        </strong>

        <p>
          {{ error }}
        </p>

        <button
          type="button"
          class="retry-button"
          @click="loadLocations"
        >
          {{ labels.retry }}
        </button>
      </section>

      <template v-else>
        <!-- 검색 결과 요약 -->
        <div class="result-summary">
          <p>
            <strong>
              {{
                filteredItems.length.toLocaleString()
              }}
            </strong>

            {{ labels.count }}
          </p>

          <span>
            {{ labels.page }}
            {{ page }}
            /
            {{ totalPages }}
          </span>
        </div>

        <!-- 장소 카드 -->
        <section
          v-if="visibleItems.length"
          class="location-grid"
        >
          <article
            v-for="item in visibleItems"
            :key="item.id"
            class="location-card"
          >
            <div class="image-wrap">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="titleOf(item)"
                loading="lazy"
              />

              <div
                v-else
                class="image-placeholder"
              >
                {{
                  categoryIcon(
                    item.category
                  )
                }}
              </div>

              <span class="category-badge">
                {{
                  labels.category[
                    item.category
                  ] || item.category
                }}
              </span>
            </div>

            <div class="card-content">
              <h2>
                {{ titleOf(item) }}
              </h2>

              <p class="address">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                  />

                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                  />
                </svg>

                <span>
                  {{ item.address }}
                </span>
              </p>

              <div
                v-if="item.tags?.length"
                class="tags"
              >
                <span
                  v-for="tag in item.tags.slice(0, 3)"
                  :key="tag"
                >
                  #{{ tag }}
                </span>
              </div>

              <div class="card-actions">
                <button
                  type="button"
                  class="map-button"
                  @click="goMap(item)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                    />

                    <circle
                      cx="12"
                      cy="10"
                      r="2.5"
                    />
                  </svg>

                  {{ labels.map }}
                </button>

                <button
                  type="button"
                  class="community-button"
                  @click="goCommunity(item)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"
                    />
                  </svg>

                  {{ labels.community }}
                </button>
              </div>
            </div>
          </article>
        </section>

        <!-- 검색 결과 없음 -->
        <section
          v-else
          class="state-panel"
        >
          <span class="state-icon">
            🔎
          </span>

          <strong>
            {{ labels.noResult }}
          </strong>

          <button
            type="button"
            class="retry-button"
            @click="clearFilters"
          >
            Reset
          </button>
        </section>

        <!-- 페이지네이션 -->
        <nav
          v-if="visibleItems.length && totalPages > 1"
          class="pagination"
          aria-label="장소 목록 페이지"
        >
          <button
            type="button"
            :disabled="page === 1"
            @click="goPage(page - 1)"
          >
            ← {{ labels.previous }}
          </button>

          <span>
            {{ page }} / {{ totalPages }}
          </span>

          <button
            type="button"
            :disabled="page === totalPages"
            @click="goPage(page + 1)"
          >
            {{ labels.next }} →
          </button>
        </nav>
      </template>

      <footer class="data-source">
        {{ labels.source }}
      </footer>
    </main>
  </div>
</template>

<style scoped>
.locations-page {
  min-height: 100vh;
  color: #172137;
  background: #f6f8fc;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 70px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.93);
  border-bottom: 1px solid #e8ecf3;
  backdrop-filter: blur(16px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
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
  background:
    linear-gradient(
      135deg,
      #5263f4,
      #7b61ef
    );
  border-radius: 14px;
  box-shadow:
    0 8px 20px
    rgba(82, 99, 244, 0.25);
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.brand-copy strong {
  font-size: 17px;
  font-weight: 900;
}

.brand-copy small {
  overflow: hidden;
  color: #8a96aa;
  font-size: 10px;
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
  box-shadow:
    0 4px 10px
    rgba(83, 98, 238, 0.23);
}

.page-hero {
  padding: 50px 18px 72px;
  color: #fff;
  background:
    radial-gradient(
      circle at 90% 10%,
      rgba(255, 255, 255, 0.2),
      transparent 27%
    ),
    linear-gradient(
      140deg,
      #5061ec,
      #7658e8
    );
}

.hero-content {
  max-width: 1180px;
  margin: 0 auto;
}

.hero-eyebrow {
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.hero-content h1 {
  margin: 9px 0 0;
  font-size:
    clamp(32px, 7vw, 50px);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.04em;
}

.hero-content p {
  max-width: 690px;
  margin: 12px 0 0;
  color:
    rgba(255, 255, 255, 0.82);
  font-size: 13px;
  line-height: 1.7;
}

.page-content {
  position: relative;
  z-index: 2;
  max-width: 1180px;
  margin: -32px auto 0;
  padding: 0 17px 45px;
}

.filter-panel {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(165px, 0.35fr)
    auto;
  gap: 9px;
  padding: 11px;
  background:
    rgba(255, 255, 255, 0.97);
  border: 1px solid #e4e8f1;
  border-radius: 21px;
  box-shadow:
    0 15px 38px
    rgba(25, 37, 64, 0.13);
  backdrop-filter: blur(14px);
}

.search-box,
.district-select {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 13px;
  background: #f6f7fb;
  border: 1px solid #e4e8ef;
  border-radius: 14px;
}

.search-box {
  color: #5362ee;
}

.search-box input {
  min-width: 0;
  height: 46px;
  flex: 1;
  padding: 0;
  color: #243047;
  background: transparent;
  border: 0;
  outline: none;
}

.search-box input::placeholder {
  color: #a0a9b8;
}

.clear-search {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  flex-shrink: 0;
  padding: 0;
  color: #8792a4;
  font-size: 18px;
  background: #e9ecf3;
  border: 0;
  border-radius: 50%;
}

.district-select span {
  flex-shrink: 0;
  color: #778398;
  font-size: 10px;
  font-weight: 850;
}

.district-select select {
  min-width: 0;
  height: 46px;
  flex: 1;
  color: #354057;
  background: transparent;
  border: 0;
  outline: none;
}

.reset-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 13px;
  color: #5362ee;
  font-size: 10px;
  font-weight: 850;
  background: #f0f2ff;
  border: 1px solid #dfe3fa;
  border-radius: 14px;
}

.category-scroll {
  display: flex;
  grid-column: 1 / -1;
  gap: 7px;
  overflow-x: auto;
  padding: 1px;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 37px;
  flex-shrink: 0;
  padding: 0 11px;
  color: #657187;
  font-size: 10px;
  font-weight: 750;
  background: #fff;
  border: 1px solid #dfe4ed;
  border-radius: 999px;
}

.category-chip.active {
  color: #fff;
  background:
    linear-gradient(
      135deg,
      #5362ee,
      #735be8
    );
  border-color: transparent;
  box-shadow:
    0 7px 16px
    rgba(83, 98, 238, 0.22);
}

.result-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 2px 13px;
  color: #7d899b;
  font-size: 11px;
}

.result-summary p {
  margin: 0;
}

.result-summary strong {
  color: #5362ee;
  font-size: 17px;
}

.location-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 13px;
}

.location-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e4e8f0;
  border-radius: 18px;
  box-shadow:
    0 6px 18px
    rgba(25, 37, 64, 0.06);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.location-card:hover {
  box-shadow:
    0 12px 28px
    rgba(25, 37, 64, 0.11);
  transform: translateY(-3px);
}

.image-wrap {
  position: relative;
  display: grid;
  aspect-ratio: 4 / 3;
  place-items: center;
  overflow: hidden;
  background: #eef0ff;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform 0.4s ease;
}

.location-card:hover .image-wrap img {
  transform: scale(1.045);
}

.image-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  font-size: 38px;
}

.category-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 5px 8px;
  color: #5362ee;
  font-size: 9px;
  font-weight: 850;
  background:
    rgba(255, 255, 255, 0.93);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}

.card-content {
  padding: 13px;
}

.card-content h2 {
  margin: 0;
  overflow: hidden;
  color: #202a40;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.address {
  display: flex;
  min-height: 38px;
  align-items: flex-start;
  gap: 5px;
  margin: 7px 0 0;
  color: #78859a;
  font-size: 11px;
  line-height: 1.55;
}

.address svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.address span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}

.tags span {
  padding: 3px 6px;
  color: #5966df;
  font-size: 8px;
  font-weight: 700;
  background: #f0f2ff;
  border-radius: 999px;
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-top: 12px;
}

.card-actions button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 7px;
  font-size: 9px;
  font-weight: 850;
  border-radius: 10px;
}

.map-button {
  color: #fff;
  background:
    linear-gradient(
      135deg,
      #5362ee,
      #735be8
    );
  border: 0;
}

.community-button {
  color: #5362ee;
  background: #fff;
  border: 1px solid #dfe3fa;
}

.state-panel {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  padding: 30px;
  color: #7d899c;
  text-align: center;
  background: #fff;
  border: 1px dashed #d5dbe6;
  border-radius: 20px;
}

.state-panel strong {
  margin-top: 12px;
  color: #283249;
  font-size: 16px;
  font-weight: 900;
}

.state-panel p {
  margin: 7px 0 0;
  font-size: 11px;
}

.error-state {
  color: #d95763;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 49px;
  height: 49px;
  color: #5362ee;
  font-size: 21px;
  font-weight: 900;
  background: #eef0ff;
  border-radius: 16px;
}

.error-state .state-icon {
  color: #d95763;
  background: #fff0f2;
}

.retry-button {
  min-height: 38px;
  margin-top: 15px;
  padding: 0 14px;
  color: #fff;
  font-size: 10px;
  font-weight: 850;
  background: #5362ee;
  border: 0;
  border-radius: 10px;
}

.loader {
  width: 35px;
  height: 35px;
  margin-bottom: 12px;
  border: 3px solid #dfe3fa;
  border-top-color: #5362ee;
  border-radius: 50%;
  animation:
    spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  margin-top: 24px;
}

.pagination button {
  min-height: 39px;
  padding: 0 13px;
  color: #5362ee;
  font-size: 10px;
  font-weight: 850;
  background: #fff;
  border: 1px solid #dfe3fa;
  border-radius: 11px;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.pagination span {
  color: #7f8a9e;
  font-size: 10px;
}

.data-source {
  margin-top: 28px;
  color: #9ba4b3;
  font-size: 9px;
  text-align: right;
}

@media (min-width: 700px) {
  .page-header,
  .page-hero {
    padding-right: 28px;
    padding-left: 28px;
  }

  .page-content {
    padding-right: 28px;
    padding-left: 28px;
  }

  .location-grid {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 980px) {
  .location-grid {
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .filter-panel {
    grid-template-columns:
      minmax(0, 1fr)
      auto;
  }

  .search-box {
    grid-column: 1 / -1;
  }

  .district-select {
    min-width: 0;
  }

  .reset-button {
    width: 48px;
    padding: 0;
    font-size: 0;
  }
}

@media (max-width: 430px) {
  .brand-copy small {
    display: none;
  }

  .location-grid {
    grid-template-columns: 1fr;
  }
}
</style>