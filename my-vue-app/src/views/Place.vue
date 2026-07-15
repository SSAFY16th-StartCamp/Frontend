<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'

import {
  useRoute,
  useRouter
} from 'vue-router'

import { useI18n } from 'vue-i18n'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import useApi from '../composables/useApi'
import useLocations from '../composables/useLocations'
import { useSettings } from '../stores/settings'

const route = useRoute()
const router = useRouter()

const { locale } = useI18n()

const settings = useSettings()
const api = useApi()
const locationApi = useLocations()

const place = ref(null)
const relatedPosts = ref([])

const loading = ref(true)
const error = ref('')

const activeImageIndex = ref(0)
const copySuccess = ref(false)

const mapElement = ref(null)

let mapInstance = null
let markerInstance = null
let copyTimer = null

const text = computed(() => {
  const english = locale.value === 'en'

  return english
    ? {
        brandSubtitle:
          'Local tips for global travelers',

        back:
          'Back to places',

        loading:
          'Loading place information...',

        loadFailed:
          'Could not load this place.',

        retry:
          'Try again',

        noImage:
          'No image available',

        address:
          'Address',

        copyAddress:
          'Copy address',

        copied:
          'Copied',

        telephone:
          'Phone',

        zipcode:
          'Postal code',

        category:
          'Category',

        website:
          'Official website',

        openMap:
          'Open in Google Maps',

        showMap:
          'View on Seoul map',

        community:
          'Ask about this place',

        overview:
          'About this place',

        location:
          'Location',

        noCoordinates:
          'Map coordinates are not available for this place.',

        relatedPosts:
          'Questions about this place',

        relatedDescription:
          'See what travelers and Seoul locals are discussing.',

        viewCommunity:
          'View all community posts',

        noPosts:
          'No community posts are connected to this place yet.',

        replies:
          'replies',

        dataSource:
          'Tourism data provided by Korea Tourism Organization TourAPI 4.0.',

        categories: {
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
        brandSubtitle:
          '외국인을 위한 서울 로컬 정보',

        back:
          '장소 목록으로',

        loading:
          '장소 정보를 불러오고 있어요...',

        loadFailed:
          '장소 정보를 불러오지 못했습니다.',

        retry:
          '다시 시도',

        noImage:
          '등록된 이미지가 없습니다',

        address:
          '주소',

        copyAddress:
          '주소 복사',

        copied:
          '복사 완료',

        telephone:
          '전화번호',

        zipcode:
          '우편번호',

        category:
          '카테고리',

        website:
          '공식 홈페이지',

        openMap:
          'Google 지도에서 열기',

        showMap:
          '서울 지도에서 보기',

        community:
          '이 장소 질문하기',

        overview:
          '장소 소개',

        location:
          '위치',

        noCoordinates:
          '이 장소의 지도 좌표가 등록되어 있지 않습니다.',

        relatedPosts:
          '이 장소에 관한 질문',

        relatedDescription:
          '여행자와 서울 주민이 나눈 질문을 확인해 보세요.',

        viewCommunity:
          '커뮤니티 전체 보기',

        noPosts:
          '아직 이 장소와 연결된 커뮤니티 글이 없습니다.',

        replies:
          '개의 답변',

        dataSource:
          '한국관광공사 TourAPI 4.0 관광정보 데이터를 활용했습니다.',

        categories: {
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

const categoryIcons = {
  attraction: '🏛️',
  culture: '🎨',
  festival: '🎉',
  course: '🚶',
  leisure: '🚲',
  accommodation: '🛏️',
  shopping: '🛍️',
  restaurant: '🍽️'
}

const placeImages = computed(() => {
  if (!place.value) {
    return []
  }

  const raw = place.value.raw || {}

  const candidates = [
    place.value.image,
    place.value.thumbnail,
    raw.image_url,
    raw.image_url2,
    raw.thumbnail_url,
    raw.firstimage,
    raw.firstimage2,
    ...(Array.isArray(raw.images)
      ? raw.images
      : []),
    ...(Array.isArray(raw.photos)
      ? raw.photos
      : [])
  ]

  return [
    ...new Set(
      candidates.filter(
        (image) =>
          typeof image === 'string' &&
          image.trim()
      )
    )
  ]
})

const activeImage = computed(() => {
  return (
    placeImages.value[
      activeImageIndex.value
    ] || ''
  )
})

const latitude = computed(() => {
  if (!place.value) {
    return null
  }

  return toValidNumber(
    place.value.lat ??
      place.value.latitude ??
      place.value.raw?.mapy ??
      place.value.raw?.y
  )
})

const longitude = computed(() => {
  if (!place.value) {
    return null
  }

  return toValidNumber(
    place.value.lng ??
      place.value.longitude ??
      place.value.raw?.mapx ??
      place.value.raw?.x
  )
})

const hasCoordinates = computed(() => {
  return (
    Number.isFinite(latitude.value) &&
    Number.isFinite(longitude.value)
  )
})

const googleMapsUrl = computed(() => {
  if (!hasCoordinates.value) {
    return '#'
  }

  return (
    'https://www.google.com/maps/search/' +
    '?api=1&query=' +
    `${latitude.value},${longitude.value}`
  )
})

const displayTitle = computed(() => {
  if (!place.value) {
    return ''
  }

  const raw = place.value.raw || {}

  if (locale.value === 'en') {
    return (
      place.value.titleEn ||
      raw.title_en ||
      raw.name_en ||
      raw.EN_NAME ||
      place.value.title ||
      raw.title ||
      raw.name ||
      ''
    )
  }

  return (
    place.value.title ||
    raw.title ||
    raw.name ||
    raw.KO_NAME ||
    place.value.titleEn ||
    ''
  )
})

const displayAddress = computed(() => {
  if (!place.value) {
    return ''
  }

  const raw =
    place.value.raw || {}

  if (locale.value === 'en') {
    return (
      place.value.addressEn ||
      place.value.enAddress ||
      raw.en_address ||
      raw.address_en ||
      raw.addr1_en ||
      place.value.address ||
      place.value.koAddress ||
      raw.ko_address ||
      raw.address ||
      raw.addr1 ||
      ''
    )
  }

  return (
    place.value.address ||
    place.value.koAddress ||
    raw.ko_address ||
    raw.address ||
    raw.addr1 ||
    place.value.addressEn ||
    place.value.enAddress ||
    raw.en_address ||
    raw.address_en ||
    ''
  )
})

const displayDescription = computed(() => {
  if (!place.value) {
    return ''
  }

  const raw = place.value.raw || {}

  if (locale.value === 'en') {
    return (
      place.value.descriptionEn ||
      raw.description_en ||
      raw.overview_en ||
      place.value.description ||
      raw.description ||
      raw.overview ||
      ''
    )
  }

  return (
    place.value.description ||
    raw.description ||
    raw.overview ||
    place.value.descriptionEn ||
    ''
  )
})

const telephone = computed(() => {
  if (!place.value) {
    return ''
  }

  const raw = place.value.raw || {}

  return (
    place.value.telephone ||
    raw.telephone ||
    raw.tel ||
    raw.TEL ||
    ''
  )
})

const zipcode = computed(() => {
  if (!place.value) {
    return ''
  }

  const raw = place.value.raw || {}

  return (
    place.value.zipcode ||
    raw.zipcode ||
    raw.postal_code ||
    raw.postal ||
    ''
  )
})

const website = computed(() => {
  if (!place.value) {
    return ''
  }

  const raw = place.value.raw || {}

  const value =
    place.value.homepageUrl ||
    raw.homepage_url ||
    raw.homepage ||
    raw.website ||
    raw.url ||
    ''

  return sanitizeWebsite(value)
})

const categoryName = computed(() => {
  const category = place.value?.category

  return (
    text.value.categories[category] ||
    category ||
    '-'
  )
})

const categoryIcon = computed(() => {
  return (
    categoryIcons[
      place.value?.category
    ] || '📍'
  )
})

const tags = computed(() => {
  const values =
    place.value?.tags ||
    place.value?.raw?.tags ||
    []

  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((tag) => {
      if (typeof tag === 'string') {
        return tag
      }

      return (
        tag.name ||
        tag.code ||
        tag.label ||
        tag.label_ko ||
        tag.label_en ||
        ''
      )
    })
    .filter(Boolean)
})

function toValidNumber(value) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

function sanitizeWebsite(value) {
  if (!value) {
    return ''
  }

  const plainText = String(value)
    .replace(/<[^>]*>/g, '')
    .trim()

  if (!plainText) {
    return ''
  }

  if (
    plainText.startsWith('http://') ||
    plainText.startsWith('https://')
  ) {
    return plainText
  }

  return `https://${plainText}`
}

function normalizePlace(data, requestedId) {
  const raw = data.raw || data

  return {
    ...data,

    id: String(
      data.id ??
        data.location_id ??
        raw.id ??
        raw.location_id ??
        raw.contentid ??
        raw.source_id ??
        requestedId
    ),

    title:
      data.title ||
      raw.title ||
      raw.name ||
      raw.KO_NAME ||
      '',

    titleEn:
      data.titleEn ||
      raw.title_en ||
      raw.name_en ||
      raw.EN_NAME ||
      '',

    address:
        data.address ||
        data.koAddress ||
        raw.ko_address ||
        raw.address ||
        raw.addr1 ||
        '',

        addressEn:
        data.addressEn ||
        data.enAddress ||
        raw.en_address ||
        raw.address_en ||
        raw.addr1_en ||
        '',

        koAddress:
        data.koAddress ||
        data.address ||
        raw.ko_address ||
        raw.address ||
        raw.addr1 ||
        '',

        enAddress:
        data.enAddress ||
        data.addressEn ||
        raw.en_address ||
        raw.address_en ||
        raw.addr1_en ||
        '',

    description:
      data.description ||
      raw.description ||
      raw.overview ||
      '',

    descriptionEn:
      data.descriptionEn ||
      raw.description_en ||
      raw.overview_en ||
      '',

    category:
      data.category ||
      raw.category ||
      convertContentType(
        raw.content_type_id ??
          raw.contenttypeid
      ),

    lat:
      data.lat ??
      data.latitude ??
      raw.mapy ??
      raw.y ??
      null,

    lng:
      data.lng ??
      data.longitude ??
      raw.mapx ??
      raw.x ??
      null,

    image:
      data.image ||
      raw.image_url ||
      raw.firstimage ||
      '',

    thumbnail:
      data.thumbnail ||
      raw.thumbnail_url ||
      raw.firstimage2 ||
      '',

    tags:
      Array.isArray(data.tags)
        ? data.tags
        : Array.isArray(raw.tags)
          ? raw.tags
          : [],

    raw
  }
}

function convertContentType(contentTypeId) {
  const categoryMap = {
    12: 'attraction',
    14: 'culture',
    15: 'festival',
    25: 'course',
    28: 'leisure',
    32: 'accommodation',
    38: 'shopping',
    39: 'restaurant'
  }

  return (
    categoryMap[
      Number(contentTypeId)
    ] || 'attraction'
  )
}

function changeLanguage(language) {
  locale.value = language
  settings.setLang(language)

  localStorage.setItem(
    'welcome-seoul-language',
    language
  )

  document.documentElement.lang =
    language === 'en'
      ? 'en'
      : 'ko'

  updateMapMarker()
}

function selectImage(index) {
  activeImageIndex.value = index
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/location')
}

function goToSeoulMap() {
  if (!place.value) {
    return
  }

  router.push({
    path: '/map',
    query: {
      place: place.value.id,
      category: place.value.category
    }
  })
}

function goToCommunity() {
  if (!place.value) {
    router.push('/community')
    return
  }

  router.push({
    path: '/community',
    query: {
      location: place.value.id
    }
  })
}

function openPost(post) {
  router.push({
    path: '/community',
    query: {
      post: post.id,
      location: place.value?.id
    }
  })
}

function displayPostTitle(post) {
  if (locale.value === 'en') {
    return (
      post.title_en ||
      post.titleEn ||
      post.title ||
      ''
    )
  }

  return (
    post.title ||
    post.title_ko ||
    ''
  )
}

async function copyAddress() {
  if (!displayAddress.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(
      displayAddress.value
    )

    copySuccess.value = true

    if (copyTimer) {
      clearTimeout(copyTimer)
    }

    copyTimer = setTimeout(() => {
      copySuccess.value = false
    }, 1800)
  } catch (copyError) {
    console.error(
      '주소 복사 실패:',
      copyError
    )
  }
}

async function loadRelatedPosts(locationId) {
  try {
    const [postError, postData] =
      await api.safe(() =>
        api.fetchPosts({
          page: 1,
          size: 4,
          location_id: locationId,
          sort: 'latest'
        })
      )

    if (postError) {
      console.error(
        '관련 게시글 조회 실패:',
        postError
      )

      relatedPosts.value = []
      return
    }

    relatedPosts.value =
      Array.isArray(postData)
        ? postData.slice(0, 4)
        : (postData?.items || []).slice(0, 4)
  } catch (postError) {
    console.error(
      '관련 게시글 조회 오류:',
      postError
    )

    relatedPosts.value = []
  }
}

async function loadPlace() {
  const locationId =
    route.params.location_id ||
    route.params.id ||
    route.params.locationId

  if (!locationId) {
    error.value =
      'Location ID is missing.'

    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  activeImageIndex.value = 0

  destroyMap()

  try {
    const response =
      await locationApi.fetchLocation(
        locationId
      )

    place.value = normalizePlace(
      response,
      locationId
    )

    await loadRelatedPosts(
      place.value.id
    )

    await nextTick()
    initializeMap()
  } catch (loadError) {
    console.error(
      '장소 상세 조회 실패:',
      loadError
    )

    place.value = null

    error.value =
      loadError.message ||
      text.value.loadFailed
  } finally {
    loading.value = false
  }
}

function initializeMap() {
  if (
    !mapElement.value ||
    !hasCoordinates.value
  ) {
    return
  }

  destroyMap()

  mapInstance = L.map(
    mapElement.value,
    {
      zoomControl: false,
      scrollWheelZoom: false
    }
  ).setView(
    [
      latitude.value,
      longitude.value
    ],
    15
  )

  L.control
    .zoom({
      position: 'bottomright'
    })
    .addTo(mapInstance)

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; OpenStreetMap contributors'
    }
  ).addTo(mapInstance)

  const markerIcon = L.divIcon({
    className: 'place-marker-wrapper',

    html: `
      <div class="place-marker">
        <span>${categoryIcon.value}</span>
      </div>
    `,

    iconSize: [46, 52],
    iconAnchor: [23, 50],
    popupAnchor: [0, -48]
  })

  markerInstance = L.marker(
    [
      latitude.value,
      longitude.value
    ],
    {
      icon: markerIcon
    }
  )
    .addTo(mapInstance)
    .bindPopup(displayTitle.value)

  setTimeout(() => {
    mapInstance?.invalidateSize()
  }, 100)
}

function updateMapMarker() {
  if (!markerInstance) {
    return
  }

  markerInstance.setPopupContent(
    displayTitle.value
  )
}

function destroyMap() {
  if (markerInstance) {
    markerInstance.remove()
    markerInstance = null
  }

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
}

watch(
  () => route.params,
  () => {
    loadPlace()
  },
  {
    deep: true
  }
)

watch(
  () => locale.value,
  (language) => {
    document.documentElement.lang =
      language === 'en'
        ? 'en'
        : 'ko'

    updateMapMarker()
  },
  {
    immediate: true
  }
)

onMounted(() => {
  loadPlace()
})

onBeforeUnmount(() => {
  destroyMap()

  if (copyTimer) {
    clearTimeout(copyTimer)
  }
})
</script>

<template>
  <div class="place-page">
    <!-- Home.vue와 동일한 헤더 -->
    <header class="home-header">
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
          <strong>
            Welcome Seoul
          </strong>

          <span>
            {{ text.brandSubtitle }}
          </span>
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

    <main class="place-main">
      <button
        type="button"
        class="back-button"
        @click="goBack"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>

        {{ text.back }}
      </button>

      <!-- 로딩 -->
      <section
        v-if="loading"
        class="state-panel"
      >
        <span class="loader"></span>

        <strong>
          {{ text.loading }}
        </strong>
      </section>

      <!-- 오류 -->
      <section
        v-else-if="error"
        class="state-panel error-state"
      >
        <span class="state-icon">
          !
        </span>

        <strong>
          {{ text.loadFailed }}
        </strong>

        <p>
          {{ error }}
        </p>

        <button
          type="button"
          class="retry-button"
          @click="loadPlace"
        >
          {{ text.retry }}
        </button>
      </section>

      <template v-else-if="place">
        <!-- 메인 상세 영역 -->
        <section class="place-hero">
          <!-- 이미지 -->
          <div class="gallery-column">
            <div class="main-image-wrap">
              <img
                v-if="activeImage"
                :src="activeImage"
                :alt="displayTitle"
                class="main-image"
              />

              <div
                v-else
                class="image-placeholder"
              >
                <span>
                  {{ categoryIcon }}
                </span>

                <p>
                  {{ text.noImage }}
                </p>
              </div>

              <span class="hero-category">
                {{ categoryIcon }}
                {{ categoryName }}
              </span>
            </div>

            <div
              v-if="placeImages.length > 1"
              class="thumbnail-list"
            >
              <button
                v-for="(image, index) in placeImages"
                :key="image"
                type="button"
                class="thumbnail-button"
                :class="{
                  active:
                    activeImageIndex === index
                }"
                @click="selectImage(index)"
              >
                <img
                  :src="image"
                  :alt="`${displayTitle} ${index + 1}`"
                />
              </button>
            </div>
          </div>

          <!-- 정보 -->
          <aside class="information-panel">
            <span class="place-label">
              {{ categoryIcon }}
              {{ categoryName }}
            </span>

            <h1>
              {{ displayTitle }}
            </h1>

            <div class="address-box">
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
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
                {{ displayAddress || '-' }}
              </span>

              <button
                v-if="displayAddress"
                type="button"
                class="copy-button"
                :title="text.copyAddress"
                @click="copyAddress"
              >
                <svg
                  v-if="!copySuccess"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <rect
                    x="9"
                    y="9"
                    width="11"
                    height="11"
                    rx="2"
                  />

                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  />
                </svg>

                <span v-else>
                  ✓
                </span>
              </button>
            </div>

            <span
              v-if="copySuccess"
              class="copy-message"
            >
              {{ text.copied }}
            </span>

            <div class="information-grid">
              <div class="information-item">
                <span>
                  {{ text.category }}
                </span>

                <strong>
                  {{ categoryName }}
                </strong>
              </div>

              <div class="information-item">
                <span>
                  {{ text.zipcode }}
                </span>

                <strong>
                  {{ zipcode || '-' }}
                </strong>
              </div>

              <div class="information-item phone-item">
                <span>
                  {{ text.telephone }}
                </span>

                <a
                  v-if="telephone"
                  :href="`tel:${telephone}`"
                >
                  {{ telephone }}
                </a>

                <strong v-else>
                  -
                </strong>
              </div>
            </div>

            <div
              v-if="tags.length"
              class="tag-list"
            >
              <span
                v-for="tag in tags"
                :key="tag"
              >
                #{{ tag }}
              </span>
            </div>

            <div class="main-actions">
              <button
                type="button"
                class="primary-button"
                @click="goToSeoulMap"
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
                    d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                  />

                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                  />
                </svg>

                {{ text.showMap }}
              </button>

              <button
                type="button"
                class="secondary-button"
                @click="goToCommunity"
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
                    d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"
                  />
                </svg>

                {{ text.community }}
              </button>
            </div>

            <div class="external-actions">
              <a
                v-if="website"
                :href="website"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ text.website }}
                <span aria-hidden="true">
                  ↗
                </span>
              </a>

              <a
                v-if="hasCoordinates"
                :href="googleMapsUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ text.openMap }}
                <span aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>
          </aside>
        </section>

        <!-- 장소 설명 -->
        <section
          v-if="displayDescription"
          class="detail-card"
        >
          <div class="section-title">
            <span class="section-icon">
              ℹ️
            </span>

            <div>
              <h2>
                {{ text.overview }}
              </h2>

              <p>
                {{
                  locale === 'en'
                    ? 'Learn more about this Seoul place.'
                    : '이 장소에 대한 상세 정보를 확인하세요.'
                }}
              </p>
            </div>
          </div>

          <div
            class="description"
            v-html="displayDescription"
          ></div>
        </section>

        <!-- 지도 -->
        <section class="detail-card">
          <div class="section-title">
            <span class="section-icon">
              📍
            </span>

            <div>
              <h2>
                {{ text.location }}
              </h2>

              <p>
                {{ displayAddress }}
              </p>
            </div>
          </div>

          <div
            v-if="hasCoordinates"
            ref="mapElement"
            class="place-map"
          ></div>

          <div
            v-else
            class="no-map"
          >
            <span>🗺️</span>

            <p>
              {{ text.noCoordinates }}
            </p>
          </div>
        </section>

        <!-- 관련 커뮤니티 -->
        <section class="detail-card">
          <div class="community-heading">
            <div class="section-title">
              <span class="section-icon">
                💬
              </span>

              <div>
                <h2>
                  {{ text.relatedPosts }}
                </h2>

                <p>
                  {{ text.relatedDescription }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="community-more"
              @click="goToCommunity"
            >
              {{ text.viewCommunity }}
              <span aria-hidden="true">
                →
              </span>
            </button>
          </div>

          <div
            v-if="relatedPosts.length"
            class="post-list"
          >
            <button
              v-for="post in relatedPosts"
              :key="post.id"
              type="button"
              class="post-item"
              @click="openPost(post)"
            >
              <span class="post-language">
                {{
                  String(
                    post.language || 'ko'
                  ).toUpperCase()
                }}
              </span>

              <div class="post-content">
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

          <div
            v-else
            class="empty-posts"
          >
            <span>💭</span>

            <p>
              {{ text.noPosts }}
            </p>

            <button
              type="button"
              @click="goToCommunity"
            >
              {{ text.community }}
            </button>
          </div>
        </section>

        <!-- 푸터 -->
        <footer class="home-footer">
          <strong>
            Welcome Seoul
          </strong>

          <p>
            {{ text.dataSource }}
          </p>

          <p>
            License: 공공누리 제3유형
          </p>
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
.place-page {
  min-height: 100vh;
  color: #162037;
  background: #f7f8fc;
}

/* Home.vue와 동일한 헤더 */
.home-header {
  position: sticky;
  top: 0;
  z-index: 1000;
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
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.brand-logo {
  display: grid;
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  place-items: center;
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
  cursor: pointer;
}

.language-switch button.active {
  color: #fff;
  background: #5362ee;
  box-shadow:
    0 4px 10px
    rgba(83, 98, 238, 0.23);
}

/* 본문 */
.place-main {
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px 17px 45px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 38px;
  margin-bottom: 15px;
  padding: 0 10px;
  color: #5362ee;
  font-size: 11px;
  font-weight: 850;
  background: transparent;
  border: 0;
  cursor: pointer;
}

/* 메인 장소 영역 */
.place-hero {
  display: grid;
  grid-template-columns:
    minmax(0, 1.45fr)
    minmax(320px, 0.7fr);
  gap: 18px;
}

.gallery-column {
  min-width: 0;
}

.main-image-wrap {
  position: relative;
  min-height: 500px;
  overflow: hidden;
  background: #e9edf4;
  border: 1px solid #e3e7ef;
  border-radius: 24px;
  box-shadow:
    0 12px 30px
    rgba(25, 37, 64, 0.1);
}

.main-image {
  display: block;
  width: 100%;
  height: 500px;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  min-height: 500px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8893a5;
  background:
    linear-gradient(
      145deg,
      #eef0ff,
      #e7eaf4
    );
}

.image-placeholder span {
  font-size: 53px;
}

.image-placeholder p {
  margin: 11px 0 0;
  font-size: 12px;
}

.hero-category {
  position: absolute;
  top: 15px;
  left: 15px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  color: #5362ee;
  font-size: 10px;
  font-weight: 850;
  background:
    rgba(255, 255, 255, 0.93);
  border: 1px solid
    rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  box-shadow:
    0 7px 17px
    rgba(25, 37, 64, 0.12);
  backdrop-filter: blur(10px);
}

.thumbnail-list {
  display: flex;
  gap: 9px;
  overflow-x: auto;
  margin-top: 10px;
  padding: 2px;
  scrollbar-width: none;
}

.thumbnail-list::-webkit-scrollbar {
  display: none;
}

.thumbnail-button {
  width: 84px;
  height: 63px;
  flex-shrink: 0;
  overflow: hidden;
  padding: 0;
  background: #e9edf4;
  border: 2px solid transparent;
  border-radius: 11px;
  cursor: pointer;
}

.thumbnail-button.active {
  border-color: #5362ee;
  box-shadow:
    0 5px 14px
    rgba(83, 98, 238, 0.24);
}

.thumbnail-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 우측 정보 */
.information-panel {
  align-self: start;
  padding: 23px;
  background: #fff;
  border: 1px solid #e4e8f0;
  border-radius: 24px;
  box-shadow:
    0 10px 28px
    rgba(25, 37, 64, 0.08);
}

.place-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  color: #5362ee;
  font-size: 10px;
  font-weight: 850;
  background: #eef0ff;
  border-radius: 999px;
}

.information-panel h1 {
  margin: 14px 0 0;
  color: #19243a;
  font-size:
    clamp(25px, 4vw, 37px);
  font-weight: 900;
  line-height: 1.22;
  letter-spacing: -0.04em;
  word-break: keep-all;
}

.address-box {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 18px;
  padding: 13px;
  color: #657187;
  background: #f6f7fb;
  border: 1px solid #e5e8ef;
  border-radius: 14px;
}

.address-box > svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #5362ee;
}

.address-box > span {
  min-width: 0;
  flex: 1;
  font-size: 12px;
  line-height: 1.55;
}

.copy-button {
  display: grid;
  width: 31px;
  height: 31px;
  flex-shrink: 0;
  place-items: center;
  padding: 0;
  color: #5362ee;
  background: #fff;
  border: 1px solid #dfe3fa;
  border-radius: 9px;
  cursor: pointer;
}

.copy-message {
  display: block;
  margin-top: 6px;
  color: #3d9b67;
  font-size: 9px;
  font-weight: 800;
  text-align: right;
}

.information-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 15px;
}

.information-item {
  min-width: 0;
  padding: 11px;
  background: #fafbfe;
  border: 1px solid #e8ebf1;
  border-radius: 12px;
}

.information-item span {
  display: block;
  color: #909aac;
  font-size: 9px;
  font-weight: 750;
}

.information-item strong,
.information-item a {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #354057;
  font-size: 11px;
  font-weight: 850;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-item {
  grid-column: 1 / -1;
}

.phone-item a {
  color: #5362ee;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 15px;
}

.tag-list span {
  padding: 5px 8px;
  color: #5c68db;
  font-size: 9px;
  font-weight: 750;
  background: #f0f2ff;
  border-radius: 999px;
}

.main-actions {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 8px;
  margin-top: 19px;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  font-size: 10px;
  font-weight: 850;
  border-radius: 13px;
  cursor: pointer;
}

.primary-button {
  color: #fff;
  background:
    linear-gradient(
      135deg,
      #5362ee,
      #735be8
    );
  border: 0;
  box-shadow:
    0 8px 18px
    rgba(83, 98, 238, 0.23);
}

.secondary-button {
  color: #5362ee;
  background: #fff;
  border: 1px solid #dfe3fa;
}

.external-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 11px;
}

.external-actions a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 39px;
  padding: 0 11px;
  color: #66738a;
  font-size: 10px;
  font-weight: 750;
  text-decoration: none;
  background: #f8f9fc;
  border: 1px solid #e7eaf0;
  border-radius: 11px;
}

.external-actions a:hover {
  color: #5362ee;
  border-color: #d9defb;
}

/* 일반 카드 */
.detail-card {
  margin-top: 20px;
  padding: 21px;
  background: #fff;
  border: 1px solid #e4e8f0;
  border-radius: 22px;
  box-shadow:
    0 7px 21px
    rgba(25, 37, 64, 0.06);
}

.section-title {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.section-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  place-items: center;
  font-size: 19px;
  background: #eef0ff;
  border-radius: 13px;
}

.section-title h2 {
  margin: 0;
  color: #253047;
  font-size: 20px;
  font-weight: 900;
}

.section-title p {
  margin: 5px 0 0;
  color: #8994a7;
  font-size: 11px;
  line-height: 1.5;
}

.description {
  margin-top: 19px;
  color: #57657a;
  font-size: 13px;
  line-height: 1.85;
  word-break: keep-all;
}

.description :deep(p) {
  margin: 0 0 12px;
}

.description :deep(img) {
  max-width: 100%;
  border-radius: 12px;
}

/* 지도 */
.place-map {
  width: 100%;
  height: 420px;
  margin-top: 17px;
  overflow: hidden;
  background: #e9edf4;
  border-radius: 16px;
}

.no-map {
  display: flex;
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 17px;
  color: #8a95a7;
  background: #f6f7fb;
  border: 1px dashed #d4dae5;
  border-radius: 16px;
}

.no-map span {
  font-size: 37px;
}

.no-map p {
  margin: 10px 0 0;
  font-size: 11px;
}

/* 커뮤니티 */
.community-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.community-more {
  flex-shrink: 0;
  padding: 7px;
  color: #5362ee;
  font-size: 10px;
  font-weight: 850;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.post-list {
  margin-top: 14px;
}

.post-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 13px 3px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #edf0f5;
  cursor: pointer;
}

.post-item:last-child {
  border-bottom: 0;
}

.post-language {
  display: grid;
  width: 34px;
  height: 26px;
  flex-shrink: 0;
  place-items: center;
  color: #5362ee;
  font-size: 9px;
  font-weight: 900;
  background: #eff1ff;
  border-radius: 8px;
}

.post-content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.post-content strong {
  overflow: hidden;
  color: #2b354b;
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-content span {
  margin-top: 4px;
  color: #919bad;
  font-size: 9px;
}

.post-arrow {
  color: #929caf;
  font-size: 22px;
}

.empty-posts {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 15px;
  color: #8a95a7;
  background: #f7f8fc;
  border: 1px dashed #d7dce6;
  border-radius: 15px;
}

.empty-posts > span {
  font-size: 30px;
}

.empty-posts p {
  margin: 9px 0 0;
  font-size: 11px;
}

.empty-posts button {
  min-height: 36px;
  margin-top: 13px;
  padding: 0 13px;
  color: #fff;
  font-size: 10px;
  font-weight: 850;
  background: #5362ee;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

/* 로딩/에러 */
.state-panel {
  display: flex;
  min-height: 420px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 35px;
  color: #7d899c;
  text-align: center;
  background: #fff;
  border: 1px dashed #d5dbe6;
  border-radius: 22px;
}

.state-panel strong {
  margin-top: 13px;
  color: #2d374c;
  font-size: 15px;
}

.state-panel p {
  margin: 8px 0 0;
  font-size: 11px;
}

.loader {
  width: 38px;
  height: 38px;
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

.error-state {
  color: #d95763;
}

.state-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  color: #d95763;
  font-size: 20px;
  font-weight: 900;
  background: #fff0f2;
  border-radius: 15px;
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
  cursor: pointer;
}

/* Leaflet */
:deep(.place-marker-wrapper) {
  background: transparent;
  border: 0;
}

:deep(.place-marker) {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  font-size: 20px;
  background: #fff;
  border: 3px solid #5362ee;
  border-radius:
    15px 15px 15px 3px;
  box-shadow:
    0 8px 19px
    rgba(36, 45, 87, 0.29);
  transform: rotate(-45deg);
}

:deep(.place-marker span) {
  transform: rotate(45deg);
}

:deep(.leaflet-control-zoom) {
  overflow: hidden;
  border: 0 !important;
  border-radius: 11px !important;
  box-shadow:
    0 8px 20px
    rgba(24, 35, 59, 0.16) !important;
}

:deep(.leaflet-control-zoom a) {
  color: #5362ee !important;
  border: 0 !important;
}

/* 푸터 */
.home-footer {
  padding: 27px 4px 18px;
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

/* 반응형 */
@media (min-width: 640px) {
  .home-header {
    padding-right: 28px;
    padding-left: 28px;
  }

  .place-main {
    padding-right: 28px;
    padding-left: 28px;
  }
}

@media (max-width: 900px) {
  .place-hero {
    grid-template-columns: 1fr;
  }

  .main-image-wrap,
  .main-image,
  .image-placeholder {
    min-height: 390px;
    height: 390px;
  }

  .information-panel {
    padding: 20px;
  }
}

@media (max-width: 540px) {
  .brand-copy span {
    display: none;
  }

  .place-main {
    padding-top: 15px;
  }

  .main-image-wrap,
  .main-image,
  .image-placeholder {
    min-height: 290px;
    height: 290px;
  }

  .information-panel h1 {
    font-size: 25px;
  }

  .information-grid {
    grid-template-columns: 1fr;
  }

  .phone-item {
    grid-column: auto;
  }

  .main-actions {
    grid-template-columns: 1fr;
  }

  .detail-card {
    padding: 17px;
  }

  .community-heading {
    flex-direction: column;
  }

  .community-more {
    align-self: flex-end;
  }

  .place-map {
    height: 340px;
  }
}
</style>