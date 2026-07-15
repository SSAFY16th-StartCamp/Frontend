<script setup>
import {
  computed,
  onMounted,
  ref,
  watch
} from 'vue'

import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import useApi from '../composables/useApi'
import useLocations from '../composables/useLocations'
import { useSettings } from '../stores/settings'

const router = useRouter()
const { locale } = useI18n()

const settings = useSettings()
const api = useApi()
const locationApi = useLocations()

/* 검색어 */
const keyword = ref('')

/* 백엔드 장소 데이터 */
const homeLocations = ref([])
const loadingLocations = ref(true)
const locationError = ref('')

/* 백엔드 커뮤니티 데이터 */
const communityPosts = ref([])

/* 한·영 문구 */
const text = computed(() => {
  const isEnglish = locale.value === 'en'

  return isEnglish
    ? {
        brandSubtitle:
          'Local tips for global travelers',

        heroBadge:
          'Welcome to Seoul',

        heroTitle:
          'Discover Seoul\nlike a local',

        heroDescription:
          'Explore trusted public tourism data and real local tips shared by Seoul residents.',

        searchPlaceholder:
          'Search attractions, festivals or local tips',

        searchButton:
          'Search',

        categoryTitle:
          'Explore Seoul',

        categoryDescription:
          'Choose what you want to discover today.',

        categories: {
          all: 'All',
          map: 'Map',
          attraction: 'Attractions',
          culture: 'Culture',
          festival: 'Festivals',
          leisure: 'Leisure',
          accommodation: 'Stay',
          shopping: 'Shopping',
        },

        rankingTitle:
          'Trending places now',

        rankingDescription:
          'Places loaded from the Seoul tourism API.',

        viewAll:
          'View all',

        localPickTitle:
          'Local picks for you',

        localPickDescription:
          'Discover more places for your Seoul trip.',

        communityTitle:
          'Ask Seoul locals',

        communityDescription:
          'Ask questions anonymously and get practical travel tips from local residents.',

        writePost:
          'Ask a question',

        recentQuestions:
          'Recent questions',

        loading:
          'Loading Seoul places...',

        loadFailed:
          'Could not load Seoul places.',

        noPlaces:
          'No place data is available.',

        replies:
          'replies',

        dataSource:
          'Tourism data provided by Korea Tourism Organization TourAPI 4.0.'
      }
    : {
        brandSubtitle:
          '외국인을 위한 서울 로컬 정보',

        heroBadge:
          '서울에 오신 것을 환영합니다',

        heroTitle:
          '현지인처럼\n서울을 발견하세요',

        heroDescription:
          '신뢰할 수 있는 서울 공공 관광정보와 지역 주민이 직접 공유한 여행 팁을 함께 확인하세요.',

        searchPlaceholder:
          '관광지, 축제, 로컬 여행 팁을 검색해 보세요',

        searchButton:
          '검색',

        categoryTitle:
          '서울 둘러보기',

        categoryDescription:
          '오늘 발견하고 싶은 서울을 선택해 보세요.',

        categories: {
          all: '전체',
          map: '지도',
          attraction: '관광지',
          culture: '문화시설',
          festival: '축제',
          leisure: '레포츠',
          accommodation: '숙박',
          shopping: '쇼핑',
        },

        rankingTitle:
          '지금 뜨는 서울',

        rankingDescription:
          '서울 관광 API에서 불러온 장소예요.',

        viewAll:
          '전체 보기',

        localPickTitle:
          '외국인 여행자를 위한 추천',

        localPickDescription:
          '서울 여행에 도움이 되는 장소를 모았어요.',

        communityTitle:
          '서울 주민에게 물어보세요',

        communityDescription:
          '로그인 없이 익명으로 질문하고 현지 주민의 실용적인 여행 팁을 확인하세요.',

        writePost:
          '질문 작성하기',

        recentQuestions:
          '최근 질문',

        loading:
          '서울 장소를 불러오고 있어요...',

        loadFailed:
          '서울 장소를 불러오지 못했습니다.',

        noPlaces:
          '표시할 장소 데이터가 없습니다.',

        replies:
          '개의 답변',

        dataSource:
          '한국관광공사 TourAPI 4.0 관광정보 데이터를 활용했습니다.'
      }
})

/* 홈 카테고리 */
const categories = [
  {
    id: 'all',
    icon: '✨',
    route: '/location'
  },
  {
    id: 'map',
    icon: '🗺️',
    route: '/map'
  },
  {
    id: 'attraction',
    icon: '🏛️',
    route: '/location',
    query: {
      category: 'attraction'
    }
  },
  {
    id: 'culture',
    icon: '🎨',
    route: '/location',
    query: {
      category: 'culture'
    }
  },
  {
    id: 'festival',
    icon: '🎉',
    route: '/location',
    query: {
      category: 'festival'
    }
  },
  {
    id: 'leisure',
    icon: '🚲',
    route: '/location',
    query: {
      category: 'leisure'
    }
  },
  {
    id: 'accommodation',
    icon: '🛏️',
    route: '/location',
    query: {
      category: 'accommodation'
    }
  },
  {
    id: 'shopping',
    icon: '🛍️',
    route: '/location',
    query: {
      category: 'shopping'
    }
  }
]

/* 첫 4개는 랭킹 */
const rankings = computed(() => {
  return homeLocations.value.slice(0, 4)
})

/* 나머지는 추가 추천 */
const localPicks = computed(() => {
  return homeLocations.value.slice(4, 12)
})

function displayTitle(item) {
  if (locale.value === 'en') {
    return item.titleEn || item.title
  }

  return item.title
}

function displayDistrict(item) {
  if (!item) {
    return ''
  }

  if (locale.value === 'en') {
    return (
      item.addressEn ||
      item.enAddress ||
      item.raw?.en_address ||
      item.districtEn ||
      item.address ||
      item.raw?.ko_address ||
      ''
    )
  }

  return (
    item.address ||
    item.koAddress ||
    item.raw?.ko_address ||
    item.district ||
    item.addressEn ||
    item.raw?.en_address ||
    ''
  )
}

function displayPostTitle(post) {
  if (locale.value === 'en') {
    return (
      post.title_en ||
      post.titleEn ||
      post.title
    )
  }

  return post.title
}

function changeLanguage(language) {
  locale.value = language
  settings.setLang(language)

  localStorage.setItem(
    'welcome-seoul-language',
    language
  )
}

/* 홈 검색 → 전체 장소 목록 */
function searchPlaces() {
  const trimmedKeyword =
    keyword.value.trim()

  router.push({
    path: '/location',
    query: trimmedKeyword
      ? {
          q: trimmedKeyword
        }
      : {}
  })
}

/* 카테고리 이동 */
function openCategory(category) {
  router.push({
    path: category.route,
    query: category.query || {}
  })
}

/* 장소 클릭 → 지도 */
function openPlace(place) {
  router.push({
    path: `/place/${place.id}`,
    query: {
      place: place.id,
      category: place.category
    }
  })
}

function goToCommunity() {
  router.push('/community')
}

/* 홈 데이터 조회 */
async function loadHomeData() {
  loadingLocations.value = true
  locationError.value = ''

  try {
    const locationResult =
      await locationApi.fetchLocations({
        page: 1,
        size: 12
      })

    homeLocations.value =
      locationResult.items || []
  } catch (error) {
    console.error(
      '홈 장소 조회 실패:',
      error
    )

    locationError.value =
      error.message ||
      text.value.loadFailed

    homeLocations.value = []
  } finally {
    loadingLocations.value = false
  }

  /* 커뮤니티 최근 글 조회 */
  try {
    const [postError, postData] =
      await api.safe(() =>
        api.fetchPosts({
          page: 1,
          size: 3,
          sort: 'latest'
        })
      )

    if (postError) {
      console.error(
        '최근 게시글 조회 실패:',
        postError
      )

      communityPosts.value = []
      return
    }

    communityPosts.value =
      Array.isArray(postData)
        ? postData.slice(0, 3)
        : (postData?.items || []).slice(0, 3)
  } catch (error) {
    console.error(
      '최근 게시글 조회 오류:',
      error
    )

    communityPosts.value = []
  }
}

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

onMounted(() => {
  loadHomeData()
})
</script>

<template>
  <div class="home-page">
    <!-- 상단 헤더 -->
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
          <span>{{ text.brandSubtitle }}</span>
        </span>
      </button>

      <div
        class="language-switch"
        aria-label="언어 선택"
      >
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

    <main>
      <!-- 메인 관광지 이미지 -->
      <section class="hero-section">
        <img
          class="hero-background"
          :src="
            homeLocations[0]?.image ||
            'https://images.unsplash.com/photo-1538485399081-7c897b0e2f8b?auto=format&fit=crop&w=1600&q=80'
          "
          :alt="
            homeLocations[0]
              ? displayTitle(homeLocations[0])
              : 'Seoul'
          "
        />

        <div class="hero-overlay"></div>

        <div class="hero-content">
          <span class="hero-badge">
            {{ text.heroBadge }}
          </span>

          <h1>{{ text.heroTitle }}</h1>

          <p>{{ text.heroDescription }}</p>
        </div>
      </section>

      <!-- 장소 검색 -->
      <section class="search-section">
        <form
          class="search-box"
          @submit.prevent="searchPlaces"
        >
          <svg
            class="search-icon"
            viewBox="0 0 24 24"
            width="23"
            height="23"
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
            :placeholder="text.searchPlaceholder"
            :aria-label="text.searchPlaceholder"
          />

          <button type="submit">
            {{ text.searchButton }}
          </button>
        </form>
      </section>

      <div class="home-content">
        <!-- 카테고리 -->
        <section class="home-section category-section">
          <div class="section-heading">
            <div>
              <h2>{{ text.categoryTitle }}</h2>

              <p>{{ text.categoryDescription }}</p>
            </div>
          </div>

          <div class="category-grid">
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="category-button"
              @click="openCategory(category)"
            >
              <span class="category-icon">
                {{ category.icon }}
              </span>

              <span>
                {{ text.categories[category.id] }}
              </span>
            </button>
          </div>
        </section>

        <!-- API 장소 로딩 상태 -->
        <section class="home-section">
          <div class="section-heading">
            <div>
              <h2>{{ text.rankingTitle }}</h2>

              <p>{{ text.rankingDescription }}</p>
            </div>

            <button
              type="button"
              class="section-more-button"
              @click="router.push('/location')"
            >
              {{ text.viewAll }}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div
            v-if="loadingLocations"
            class="home-state"
          >
            <span class="home-loader"></span>

            <p>{{ text.loading }}</p>
          </div>

          <div
            v-else-if="locationError"
            class="home-state error"
          >
            <strong>{{ text.loadFailed }}</strong>

            <p>{{ locationError }}</p>
          </div>

          <!-- 추천 장소 순위 -->
          <div
            v-else-if="rankings.length"
            class="ranking-list"
          >
            <button
              v-for="(place, index) in rankings"
              :key="place.id"
              type="button"
              class="ranking-card"
              @click="openPlace(place)"
            >
              <span class="ranking-number">
                {{ index + 1 }}
              </span>

              <img
                v-if="place.image"
                :src="place.image"
                :alt="displayTitle(place)"
                class="ranking-image"
                loading="lazy"
              />

              <div
                v-else
                class="ranking-placeholder"
              >
                📍
              </div>

              <div class="ranking-information">
                <span class="ranking-category">
                  {{
                    text.categories[place.category] ||
                    place.category
                  }}
                </span>

                <strong>
                  {{ displayTitle(place) }}
                </strong>

                <span class="ranking-address">
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

                  {{ displayDistrict(place) }}
                </span>
              </div>
            </button>
          </div>

          <div
            v-else
            class="home-state"
          >
            {{ text.noPlaces }}
          </div>
        </section>

        <!-- 추가 장소 카드 -->
        <section
          v-if="!loadingLocations && localPicks.length"
          class="home-section"
        >
          <div class="section-heading">
            <div>
              <h2>{{ text.localPickTitle }}</h2>

              <p>{{ text.localPickDescription }}</p>
            </div>

            <button
              type="button"
              class="section-more-button"
              @click="router.push('/location')"
            >
              {{ text.viewAll }}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div class="place-grid">
            <article
              v-for="place in localPicks"
              :key="place.id"
              class="place-card"
              tabindex="0"
              role="button"
              @click="openPlace(place)"
              @keydown.enter="openPlace(place)"
              @keydown.space.prevent="openPlace(place)"
            >
              <div class="place-image-wrap">
                <img
                  v-if="place.image"
                  :src="place.image"
                  :alt="displayTitle(place)"
                  class="place-image"
                  loading="lazy"
                />

                <div
                  v-else
                  class="place-placeholder"
                >
                  📍
                </div>
              </div>

              <div class="place-content">
                <span class="place-category">
                  {{
                    text.categories[place.category] ||
                    place.category
                  }}
                </span>

                <h3>{{ displayTitle(place) }}</h3>

                <p class="place-location">
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

                  {{ displayDistrict(place) }}
                </p>

                <div
                  v-if="place.tags?.length"
                  class="place-tags"
                >
                  <span
                    v-for="tag in place.tags.slice(0, 3)"
                    :key="tag"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- 커뮤니티 진입 영역 -->
        <section class="home-section community-section">
          <div class="community-banner">
            <div class="community-banner-content">
              <span class="community-emoji">
                💬
              </span>

              <div>
                <h2>{{ text.communityTitle }}</h2>

                <p>{{ text.communityDescription }}</p>
              </div>
            </div>

            <button
              type="button"
              @click="goToCommunity"
            >
              {{ text.writePost }}

              <span aria-hidden="true">→</span>
            </button>
          </div>

          <!-- 최근 게시글 -->
          <div
            v-if="communityPosts.length"
            class="community-preview"
          >
            <div class="community-preview-header">
              <h3>{{ text.recentQuestions }}</h3>

              <button
                type="button"
                @click="goToCommunity"
              >
                {{ text.viewAll }}
              </button>
            </div>

            <button
              v-for="post in communityPosts"
              :key="post.id"
              type="button"
              class="community-post"
              @click="goToCommunity"
            >
              <span class="post-language">
                {{
                  String(
                    post.language || 'ko'
                  ).toUpperCase()
                }}
              </span>

              <div class="post-information">
                <strong>
                  {{ displayPostTitle(post) }}
                </strong>

                <span>
                  <template v-if="post.category">
                    #{{ post.category }} ·
                  </template>

                  {{ post.comment_count || 0 }}
                  {{ text.replies }}
                </span>
              </div>

              <span
                class="post-arrow"
                aria-hidden="true"
              >
                ›
              </span>
            </button>
          </div>

          <!-- 최근 게시글 없음 -->
          <div
            v-else
            class="community-preview empty-community"
          >
            <p>
              {{
                locale === 'en'
                  ? 'No community questions have been posted yet.'
                  : '아직 등록된 커뮤니티 질문이 없습니다.'
              }}
            </p>

            <button
              type="button"
              @click="goToCommunity"
            >
              {{ text.writePost }}
            </button>
          </div>
        </section>

        <!-- 데이터 출처 -->
        <footer class="home-footer">
          <strong>Welcome Seoul</strong>

          <p>{{ text.dataSource }}</p>

          <p>
            License: 공공누리 제3유형
          </p>
        </footer>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  padding-bottom: 32px;
  color: #162037;
  background: #f7f8fc;
}

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
  border: none;
  background: transparent;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.hero-section {
  position: relative;
  min-height: 420px;
  overflow: hidden;
  background: #172035;
}

.hero-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(12, 20, 38, 0.08) 0%,
      rgba(12, 20, 38, 0.2) 40%,
      rgba(12, 20, 38, 0.9) 100%
    );
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 420px;
  flex-direction: column;
  justify-content: flex-end;
  padding: 60px 20px 54px;
  color: #fff;
}

.hero-badge {
  align-self: flex-start;
  margin-bottom: 13px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(16, 24, 43, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  backdrop-filter: blur(10px);
}

.hero-content h1 {
  max-width: 650px;
  margin: 0;
  font-size: clamp(35px, 9vw, 62px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.04em;
  white-space: pre-line;
}

.hero-content p {
  max-width: 620px;
  margin: 15px 0 0;
  color: rgba(255, 255, 255, 0.87);
  font-size: 14px;
  line-height: 1.65;
}

.search-section {
  position: relative;
  z-index: 5;
  padding: 0 16px;
  transform: translateY(-27px);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 61px;
  padding: 7px 7px 7px 17px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e5e9f2;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(22, 32, 55, 0.15);
  backdrop-filter: blur(15px);
}

.search-icon {
  flex-shrink: 0;
  color: #5263f4;
}

.search-box input {
  min-width: 0;
  height: 44px;
  flex: 1;
  padding: 0;
  color: #19243a;
  font-size: 14px;
  background: transparent;
  border: 0;
  outline: none;
}

.search-box input::placeholder {
  color: #a0aabc;
}

.search-box button {
  height: 46px;
  flex-shrink: 0;
  padding: 0 17px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  background: linear-gradient(135deg, #5362ee, #735be8);
  border: 0;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(83, 98, 238, 0.25);
}

.home-content {
  max-width: 1180px;
  margin: -5px auto 0;
  padding: 0 17px;
}

.home-section {
  margin-top: 34px;
}

.category-section {
  margin-top: 4px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 17px;
}

.section-heading h2 {
  margin: 0;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: -0.025em;
}

.section-heading p {
  margin: 5px 0 0;
  color: #78859a;
  font-size: 13px;
  line-height: 1.5;
}

.section-label {
  display: inline-block;
  margin-bottom: 5px;
  color: #5966ed;
  font-size: 12px;
  font-weight: 850;
}

.section-more-button {
  flex-shrink: 0;
  padding: 6px;
  color: #5362ee;
  font-size: 12px;
  font-weight: 800;
  background: transparent;
  border: 0;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}

.category-button {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 9px 3px;
  color: #66738a;
  font-size: 11px;
  font-weight: 750;
  background: transparent;
  border: 0;
}

.category-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  font-size: 23px;
  background: #eef1ff;
  border: 1px solid transparent;
  border-radius: 18px;
  transition: 0.2s ease;
}

.category-button.active {
  color: #4f5de1;
}

.category-button.active .category-icon {
  background: linear-gradient(135deg, #5362ee, #7860ed);
  border-color: rgba(83, 98, 238, 0.2);
  box-shadow: 0 9px 20px rgba(83, 98, 238, 0.24);
  transform: translateY(-2px);
}

.ranking-list {
  display: grid;
  gap: 10px;
}

.ranking-card {
  display: grid;
  grid-template-columns: 36px 78px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px;
  color: inherit;
  text-align: left;
  background: #fff;
  border: 1px solid #e5e9f1;
  border-radius: 17px;
  box-shadow: 0 5px 16px rgba(25, 37, 64, 0.055);
}

.ranking-number {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: #5362ee;
  font-size: 14px;
  font-weight: 900;
  background: #eff1ff;
  border-radius: 11px;
}

.ranking-card:first-child .ranking-number {
  color: #fff;
  background: linear-gradient(135deg, #f5a524, #f97316);
}

.ranking-image {
  width: 78px;
  height: 70px;
  object-fit: cover;
  background: #eef0f5;
  border-radius: 12px;
}

.ranking-information {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.ranking-category {
  margin-bottom: 4px;
  padding: 3px 7px;
  color: #5362ee;
  font-size: 9px;
  font-weight: 800;
  background: #eff1ff;
  border-radius: 999px;
}

.ranking-information strong {
  width: 100%;
  overflow: hidden;
  font-size: 14px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-address {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  color: #8490a3;
  font-size: 11px;
}

.ranking-view {
  color: #98a3b5;
  font-size: 10px;
  font-weight: 700;
}

.place-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.place-card {
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e9f1;
  border-radius: 17px;
  box-shadow: 0 5px 16px rgba(25, 37, 64, 0.06);
}

.place-image-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #eceff5;
}

.place-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bookmark-button {
  position: absolute;
  top: 9px;
  right: 9px;
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  padding: 0;
  color: #fff;
  background: rgba(20, 29, 49, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  backdrop-filter: blur(8px);
}

.place-content {
  padding: 11px;
}

.place-category {
  display: inline-block;
  padding: 3px 7px;
  color: #5362ee;
  font-size: 9px;
  font-weight: 800;
  background: #eff1ff;
  border-radius: 999px;
}

.place-content h3 {
  margin: 7px 0 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.place-location {
  display: flex;
  align-items: center;
  gap: 3px;
  margin: 5px 0 0;
  color: #78869b;
  font-size: 11px;
}

.place-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}

.place-tags span {
  padding: 3px 6px;
  color: #617087;
  font-size: 8px;
  font-weight: 700;
  background: #f1f3f7;
  border-radius: 999px;
}

.empty-category {
  padding: 30px;
  color: #8490a4;
  font-size: 13px;
  text-align: center;
  background: #fff;
  border: 1px dashed #d3d9e4;
  border-radius: 17px;
}

.community-section {
  margin-bottom: 38px;
}

.community-banner {
  display: flex;
  flex-direction: column;
  gap: 17px;
  padding: 21px;
  background: linear-gradient(135deg, #5865ef, #785cec);
  border-radius: 23px;
  box-shadow: 0 14px 30px rgba(83, 98, 238, 0.22);
}

.community-banner-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #fff;
}

.community-emoji {
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  flex-shrink: 0;
  font-size: 21px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 14px;
}

.community-banner h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

.community-banner p {
  margin: 7px 0 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  line-height: 1.55;
}

.community-banner > button {
  align-self: flex-start;
  height: 42px;
  padding: 0 15px;
  color: #5362ee;
  font-size: 12px;
  font-weight: 850;
  background: #fff;
  border: 0;
  border-radius: 12px;
}

.community-preview {
  margin-top: 13px;
  padding: 15px;
  background: #fff;
  border: 1px solid #e5e9f1;
  border-radius: 20px;
}

.community-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.community-preview-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.community-preview-header button {
  padding: 5px;
  color: #5362ee;
  font-size: 11px;
  font-weight: 800;
  background: transparent;
  border: 0;
}

.community-post {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 2px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #edf0f5;
}

.community-post:last-child {
  border-bottom: 0;
}

.post-language {
  display: grid;
  place-items: center;
  width: 31px;
  height: 24px;
  flex-shrink: 0;
  color: #5362ee;
  font-size: 9px;
  font-weight: 900;
  background: #eff1ff;
  border-radius: 7px;
}

.post-information {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.post-information strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-information span {
  margin-top: 3px;
  color: #919bad;
  font-size: 9px;
}

.post-arrow {
  flex-shrink: 0;
  color: #929caf;
  font-size: 22px;
}

.home-footer {
  padding: 20px 4px 30px;
  color: #97a1b1;
  font-size: 10px;
  line-height: 1.6;
}

.home-footer strong {
  color: #6e7a90;
  font-size: 12px;
}

.home-footer p {
  margin: 3px 0 0;
}

@media (min-width: 640px) {
  .home-header {
    padding-right: 28px;
    padding-left: 28px;
  }

  .hero-content {
    padding-right: 32px;
    padding-left: 32px;
  }

  .search-section {
    padding-right: 28px;
    padding-left: 28px;
  }

  .home-content {
    padding-right: 28px;
    padding-left: 28px;
  }

  .category-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .ranking-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .place-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .community-banner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .community-banner > button {
    flex-shrink: 0;
  }

  .category-button.route-button .category-icon {
    color: #5362ee;
    background: linear-gradient(
      135deg,
      #eef0ff,
      #e5e9ff
    );
    border-color: #dce1fb;
  }

  .category-button.route-button:hover .category-icon {
    color: #fff;
    background: linear-gradient(135deg, #5362ee, #7860ed);
    box-shadow: 0 9px 20px rgba(83, 98, 238, 0.24);
    transform: translateY(-2px);
  }
}

@media (min-width: 900px) {
  .hero-section {
    min-height: 500px;
    border-radius: 0 0 32px 32px;
  }

  .hero-content {
    min-height: 500px;
    padding-right: 52px;
    padding-bottom: 68px;
    padding-left: 52px;
  }

  .search-section {
    max-width: 820px;
    margin: 0 auto;
  }

  .place-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .category-grid {
    grid-template-columns: repeat(9, minmax(0, 1fr));
  }
}

@media (max-width: 390px) {
  .brand-copy span {
    display: none;
  }

  .category-icon {
    width: 49px;
    height: 49px;
  }

  .ranking-card {
    grid-template-columns: 32px 67px minmax(0, 1fr);
  }

  .ranking-image {
    width: 67px;
    height: 63px;
  }

  .ranking-view {
    display: none;
  }
}
</style>