<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow
})

const router = useRouter()
const { locale } = useI18n()

const mapElement = ref(null)

const keyword = ref('')
const selectedCategory = ref('all')
const selectedDistrict = ref('all')
const selectedPlace = ref(null)

const loading = ref(false)
const apiError = ref(false)
const places = ref([])

let mapInstance = null
let markerLayer = null

const SEOUL_CENTER = [37.5665, 126.978]
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000/api/v1'

const text = computed(() => {
  const english = locale.value === 'en'

  return english
    ? {
        brandSubtitle: 'Local tips for global travelers',
        pageBadge: 'Seoul place map',
        pageTitle: 'Explore Seoul on the map',
        pageDescription:
          'Find attractions, festivals, cultural facilities and local travel information across Seoul.',
        searchPlaceholder: 'Search places or districts',
        search: 'Search',
        all: 'All',
        district: 'District',
        category: 'Category',
        result: 'places found',
        mapLoading: 'Loading Seoul places...',
        resetMap: 'Reset map',
        currentResults: 'Current results',
        apiNotice:
          'The server could not be reached, so sample Seoul data is displayed.',
        viewDetails: 'View details',
        relatedCommunity: 'Community posts',
        close: 'Close',
        dataSource: 'Data source: Korea Tourism Organization TourAPI 4.0',
        categories: {
          all: 'All',
          attraction: 'Attractions',
          culture: 'Culture',
          festival: 'Festivals',
          course: 'Courses',
          leisure: 'Leisure',
          accommodation: 'Stay',
          shopping: 'Shopping'
        }
      }
    : {
        brandSubtitle: '외국인을 위한 서울 로컬 정보',
        pageBadge: '서울 장소 지도',
        pageTitle: '지도에서 서울을 둘러보세요',
        pageDescription:
          '서울의 관광지, 축제, 문화시설과 외국인 여행자를 위한 지역 정보를 한눈에 확인하세요.',
        searchPlaceholder: '장소명이나 자치구를 검색하세요',
        search: '검색',
        all: '전체',
        district: '자치구',
        category: '카테고리',
        result: '개의 장소',
        mapLoading: '서울 장소를 불러오고 있어요...',
        resetMap: '지도 초기화',
        currentResults: '현재 검색 결과',
        apiNotice:
          '백엔드 서버에 연결하지 못해 서울 샘플 데이터를 표시하고 있습니다.',
        viewDetails: '상세 보기',
        relatedCommunity: '관련 커뮤니티 글',
        close: '닫기',
        dataSource: '데이터 출처: 한국관광공사 TourAPI 4.0',
        categories: {
          all: '전체',
          attraction: '관광지',
          culture: '문화시설',
          festival: '축제',
          course: '여행코스',
          leisure: '레포츠',
          accommodation: '숙박',
          shopping: '쇼핑'
        }
      }
})

const categoryOptions = [
  { id: 'all', icon: '✨' },
  { id: 'attraction', icon: '🏛️' },
  { id: 'culture', icon: '🎨' },
  { id: 'festival', icon: '🎉' },
  { id: 'course', icon: '🚶' },
  { id: 'leisure', icon: '🚲' },
  { id: 'accommodation', icon: '🛏️' },
  { id: 'shopping', icon: '🛍️' }
]

const result =
  await locationApi.fetchAllLocations({
    pageSize: 10,
    maxItems: 20
  })

places.value = result.items.filter(
  (place) =>
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
)

const districts = computed(() => {
  return [...new Set(places.value.map((place) => place.district))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'ko'))
})

const filteredPlaces = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()

  return places.value.filter((place) => {
    const matchesCategory =
      selectedCategory.value === 'all' ||
      place.category === selectedCategory.value

    const matchesDistrict =
      selectedDistrict.value === 'all' ||
      place.district === selectedDistrict.value

    const searchableText = [
      place.title,
      place.titleEn,
      place.address,
      place.district
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesKeyword =
      !normalizedKeyword ||
      searchableText.includes(normalizedKeyword)

    return matchesCategory && matchesDistrict && matchesKeyword
  })
})

function displayTitle(place) {
  if (locale.value === 'en') {
    return place.titleEn || place.title
  }

  return place.title
}

function changeLanguage(language) {
  locale.value = language
  localStorage.setItem('welcome-seoul-language', language)
}

function categoryIcon(category) {
  return (
    categoryOptions.find((item) => item.id === category)?.icon ||
    '📍'
  )
}

function extractDistrict(address = '') {
  const matched = address.match(
    /서울(?:특별시)?\s+([가-힣]+구)/
  )

  return matched?.[1] || ''
}

function convertCategory(contentTypeId) {
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

  return categoryMap[Number(contentTypeId)] || 'attraction'
}

function normalizePlace(item) {
  const lat = Number(
    item.lat ??
      item.latitude ??
      item.mapy
  )

  const lng = Number(
    item.lng ??
      item.longitude ??
      item.mapx
  )

  return {
    id: String(
      item.id ??
        item.contentid ??
        item.source_id ??
        crypto.randomUUID()
    ),
    category:
      item.category ||
      convertCategory(
        item.content_type_id ??
          item.contenttypeid
      ),
    title:
      item.title ||
      item.name ||
      '',
    titleEn:
      item.title_en ||
      item.name_en ||
      '',
    address:
      item.address ||
      item.addr1 ||
      '',
    district:
      item.district ||
      extractDistrict(
        item.address ||
          item.addr1 ||
          ''
      ),
    lat,
    lng,
    image:
      item.image_url ||
      item.firstimage ||
      item.thumbnail_url ||
      ''
  }
}

async function loadPlaces() {
  loading.value = true
  apiError.value = false

  try {
    const response = await fetch(
      `${API_BASE_URL}/locations?page=1&size=500`
    )

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      )
    }

    const data = await response.json()
    const items = Array.isArray(data)
      ? data
      : data.items || []

    const normalizedItems = items
      .map(normalizePlace)
      .filter(
        (place) =>
          Number.isFinite(place.lat) &&
          Number.isFinite(place.lng)
      )

    places.value =
      normalizedItems.length > 0
        ? normalizedItems
        : samplePlaces
  } catch (error) {
    console.error(
      '장소 데이터 로딩 실패:',
      error
    )

    places.value = samplePlaces
    apiError.value = true
  } finally {
    loading.value = false
  }
}

function initializeMap() {
  mapInstance = L.map(mapElement.value, {
    zoomControl: false,
    minZoom: 10,
    maxZoom: 19
  }).setView(SEOUL_CENTER, 12)

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

  markerLayer = L.layerGroup().addTo(mapInstance)
}

function createPlaceIcon(place, isSelected = false) {
  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `
      <div class="place-marker ${
        isSelected ? 'selected' : ''
      }">
        <span>${categoryIcon(place.category)}</span>
      </div>
    `,
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -48]
  })
}

function renderMarkers(fitBounds = false) {
  if (!mapInstance || !markerLayer) {
    return
  }

  markerLayer.clearLayers()

  const validPlaces = filteredPlaces.value.filter(
    (place) =>
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng)
  )

  const bounds = []

  validPlaces.forEach((place) => {
    const marker = L.marker(
      [place.lat, place.lng],
      {
        icon: createPlaceIcon(
          place,
          selectedPlace.value?.id === place.id
        )
      }
    )

    marker.on('click', () => {
      selectPlace(place)
    })

    marker.bindTooltip(
      displayTitle(place),
      {
        direction: 'top',
        offset: [0, -40],
        className: 'place-tooltip'
      }
    )

    marker.addTo(markerLayer)
    bounds.push([place.lat, place.lng])
  })

  if (fitBounds && bounds.length > 0) {
    mapInstance.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 14
    })
  }
}

function selectPlace(place) {
  selectedPlace.value = place

  mapInstance?.flyTo(
    [place.lat, place.lng],
    Math.max(
      mapInstance.getZoom(),
      15
    ),
    {
      duration: 0.7
    }
  )

  renderMarkers(false)
}

function closeSelectedPlace() {
  selectedPlace.value = null
  renderMarkers(false)
}

function applySearch() {
  closeSelectedPlace()
  renderMarkers(true)
}

function selectCategory(category) {
  selectedCategory.value = category
  selectedPlace.value = null
  nextTick(() => renderMarkers(true))
}

function resetMap() {
  keyword.value = ''
  selectedCategory.value = 'all'
  selectedDistrict.value = 'all'
  selectedPlace.value = null

  nextTick(() => {
    renderMarkers(false)

    mapInstance?.flyTo(
      SEOUL_CENTER,
      12,
      {
        duration: 0.7
      }
    )
  })
}

function openCommunity(place) {
  router.push({
    path: '/community',
    query: {
      location: place.id
    }
  })
}

watch(
  selectedDistrict,
  () => {
    selectedPlace.value = null
    nextTick(() => renderMarkers(true))
  }
)

watch(
  () => locale.value,
  (language) => {
    document.documentElement.lang =
      language === 'en' ? 'en' : 'ko'

    renderMarkers(false)
  }
)

onMounted(async () => {
  await nextTick()
  initializeMap()
  await loadPlaces()
  renderMarkers(true)

  setTimeout(() => {
    mapInstance?.invalidateSize()
  }, 100)
})

onBeforeUnmount(() => {
  mapInstance?.remove()
  mapInstance = null
  markerLayer = null
})
</script>

<template>
  <div class="map-page">
    <header class="map-header">
      <button
        type="button"
        class="brand"
        @click="router.push('/')"
      >
        <span class="brand-logo">W</span>

        <span class="brand-copy">
          <strong>Welcome Seoul</strong>
          <small>{{ text.brandSubtitle }}</small>
        </span>
      </button>

      <div class="header-actions">
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
      </div>
    </header>

    <section class="map-intro">
      <span class="page-badge">
        <span>📍</span>
        {{ text.pageBadge }}
      </span>

      <h1>{{ text.pageTitle }}</h1>
      <p>{{ text.pageDescription }}</p>
    </section>

    <main class="map-content">
      <section class="search-panel">
        <form
          class="map-search"
          @submit.prevent="applySearch"
        >
          <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.7-3.7" />
          </svg>

          <input
            v-model="keyword"
            type="search"
            :placeholder="text.searchPlaceholder"
          />

          <button type="submit">
            {{ text.search }}
          </button>
        </form>

        <div class="select-row">
          <label class="select-control">
            <span>{{ text.district }}</span>

            <select v-model="selectedDistrict">
              <option value="all">
                {{ text.all }}
              </option>

              <option
                v-for="district in districts"
                :key="district"
                :value="district"
              >
                {{ district }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="reset-button"
            @click="resetMap"
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M3 12a9 9 0 1 0 3-6.7"
              />
              <path d="M3 4v6h6" />
            </svg>

            {{ text.resetMap }}
          </button>
        </div>

        <div class="category-scroll">
          <button
            v-for="category in categoryOptions"
            :key="category.id"
            type="button"
            class="category-chip"
            :class="{
              active:
                selectedCategory === category.id
            }"
            @click="selectCategory(category.id)"
          >
            <span>{{ category.icon }}</span>
            {{ text.categories[category.id] }}
          </button>
        </div>
      </section>

      <div
        v-if="apiError"
        class="api-notice"
      >
        <span>ⓘ</span>
        {{ text.apiNotice }}
      </div>

      <section class="map-card">
        <div class="map-result-badge">
          <strong>{{ filteredPlaces.length }}</strong>
          {{ text.result }}
        </div>

        <div
          v-if="loading"
          class="map-loading"
        >
          <span class="loading-spinner" />
          <p>{{ text.mapLoading }}</p>
        </div>

        <div
          ref="mapElement"
          class="leaflet-map"
        />

        <article
          v-if="selectedPlace"
          class="selected-place-card"
        >
          <button
            type="button"
            class="place-close-button"
            :aria-label="text.close"
            @click="closeSelectedPlace"
          >
            ×
          </button>

          <img
            v-if="selectedPlace.image"
            :src="selectedPlace.image"
            :alt="displayTitle(selectedPlace)"
            class="selected-place-image"
          />

          <div
            v-else
            class="selected-place-placeholder"
          >
            {{ categoryIcon(selectedPlace.category) }}
          </div>

          <div class="selected-place-content">
            <div class="place-top-row">
              <span class="place-category">
                {{ categoryIcon(selectedPlace.category) }}
                {{
                  text.categories[
                    selectedPlace.category
                  ] || text.categories.attraction
                }}
              </span>
            </div>

            <h2>
              {{ displayTitle(selectedPlace) }}
            </h2>

            <p class="place-address">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>

              {{ selectedPlace.address }}
            </p>

            <div class="place-actions">
              <button
                type="button"
                class="primary-place-button"
                @click="openCommunity(selectedPlace)"
              >
                💬 {{ text.relatedCommunity }}
              </button>

              <button
                type="button"
                class="secondary-place-button"
                @click="
                  router.push({
                    path: '/map',
                    query: {
                      place: selectedPlace.id
                    }
                  })
                "
              >
                {{ text.viewDetails }}
              </button>
            </div>
          </div>
        </article>
      </section>

      <p class="data-source">
        {{ text.dataSource }}
      </p>
    </main>
  </div>
</template>

<style scoped>
.map-page {
  min-height: 100vh;
  color: #172137;
  background: #f6f8fc;
}

.map-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 70px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e8ecf3;
  backdrop-filter: blur(17px);
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

.brand-copy small {
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

.map-intro {
  padding: 42px 18px 55px;
  color: #fff;
  background:
    radial-gradient(
      circle at 90% 5%,
      rgba(255, 255, 255, 0.18),
      transparent 27%
    ),
    linear-gradient(140deg, #5061ec, #7658e8);
}

.map-intro > * {
  max-width: 1160px;
  margin-right: auto;
  margin-left: auto;
}

.page-badge {
  display: flex;
  width: max-content;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 850;
  background: rgba(19, 28, 57, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
}

.map-intro h1 {
  margin-top: 14px;
  margin-bottom: 0;
  font-size: clamp(30px, 7vw, 48px);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.04em;
}

.map-intro p {
  max-width: 690px;
  margin-top: 11px;
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  line-height: 1.65;
}

.map-content {
  position: relative;
  z-index: 2;
  max-width: 1180px;
  margin: -29px auto 0;
  padding: 0 17px 40px;
}

.search-panel {
  padding: 10px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e4e8f1;
  border-radius: 21px;
  box-shadow: 0 15px 38px rgba(25, 37, 64, 0.13);
  backdrop-filter: blur(14px);
}

.map-search {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 49px;
  padding-left: 11px;
  color: #5362ee;
  background: #f6f7fb;
  border: 1px solid #e5e8ef;
  border-radius: 15px;
}

.map-search input {
  min-width: 0;
  height: 47px;
  flex: 1;
  padding: 0;
  color: #202a40;
  font-size: 13px;
  background: transparent;
  border: 0;
  outline: none;
}

.map-search input::placeholder {
  color: #9ea8b8;
}

.map-search button {
  height: 41px;
  margin-right: 4px;
  padding: 0 16px;
  color: #fff;
  font-size: 11px;
  font-weight: 850;
  background: linear-gradient(135deg, #5362ee, #735be8);
  border: 0;
  border-radius: 12px;
}

.select-row {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 9px;
}

.select-control {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-height: 43px;
  padding: 0 11px;
  background: #fff;
  border: 1px solid #e1e5ed;
  border-radius: 13px;
}

.select-control span {
  flex-shrink: 0;
  color: #778398;
  font-size: 10px;
  font-weight: 800;
}

.select-control select {
  min-width: 0;
  height: 41px;
  flex: 1;
  color: #354057;
  font-size: 11px;
  background: transparent;
  border: 0;
  outline: none;
}

.reset-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 43px;
  flex-shrink: 0;
  padding: 0 12px;
  color: #5966e6;
  font-size: 10px;
  font-weight: 850;
  background: #f1f3ff;
  border: 1px solid #dfe3fa;
  border-radius: 13px;
}

.category-scroll {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  margin-top: 10px;
  padding: 2px 1px 3px;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 37px;
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
  background: linear-gradient(135deg, #5362ee, #735be8);
  border-color: transparent;
  box-shadow: 0 7px 16px rgba(83, 98, 238, 0.22);
}

.api-notice {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 10px 12px;
  color: #82670d;
  font-size: 10px;
  background: #fff9df;
  border: 1px solid #f0e2a9;
  border-radius: 12px;
}

.map-card {
  position: relative;
  min-height: 620px;
  margin-top: 14px;
  overflow: hidden;
  background: #e9edf3;
  border: 1px solid #dfe4ed;
  border-radius: 23px;
  box-shadow: 0 12px 32px rgba(24, 35, 59, 0.1);
}

.leaflet-map {
  width: 100%;
  height: 620px;
}

.map-result-badge {
  position: absolute;
  top: 14px;
  left: 50%;
  z-index: 500;
  padding: 8px 12px;
  color: #5f6a7d;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e0e5ed;
  border-radius: 999px;
  box-shadow: 0 7px 18px rgba(24, 35, 59, 0.12);
  backdrop-filter: blur(10px);
  transform: translateX(-50%);
}

.map-result-badge strong {
  color: #5362ee;
  font-size: 12px;
}

.map-loading {
  position: absolute;
  inset: 0;
  z-index: 600;
  display: grid;
  place-content: center;
  justify-items: center;
  color: #6e7a8d;
  font-size: 11px;
  background: rgba(247, 248, 252, 0.9);
}

.loading-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #dfe3fa;
  border-top-color: #5362ee;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.selected-place-card {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 550;
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 13px;
  padding: 13px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e0e5ed;
  border-radius: 19px;
  box-shadow: 0 17px 45px rgba(20, 30, 53, 0.2);
  backdrop-filter: blur(15px);
}

.place-close-button {
  position: absolute;
  top: 7px;
  right: 8px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  padding: 0;
  color: #69758a;
  font-size: 18px;
  background: rgba(244, 246, 250, 0.92);
  border: 0;
  border-radius: 50%;
}

.selected-place-image,
.selected-place-placeholder {
  width: 110px;
  height: 112px;
  border-radius: 14px;
}

.selected-place-image {
  object-fit: cover;
  background: #eceff5;
}

.selected-place-placeholder {
  display: grid;
  place-items: center;
  font-size: 35px;
  background: #eef0ff;
}

.selected-place-content {
  min-width: 0;
  padding-right: 20px;
}

.place-category {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  color: #5362e8;
  font-size: 9px;
  font-weight: 850;
  background: #eef0ff;
  border-radius: 999px;
}

.selected-place-content h2 {
  margin: 7px 0 0;
  overflow: hidden;
  color: #202a40;
  font-size: 16px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.place-address {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin: 6px 0 0;
  color: #7e899c;
  font-size: 10px;
  line-height: 1.45;
}

.place-address svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.place-actions {
  display: flex;
  gap: 7px;
  margin-top: 11px;
}

.primary-place-button,
.secondary-place-button {
  min-height: 34px;
  padding: 0 10px;
  font-size: 9px;
  font-weight: 850;
  border-radius: 10px;
}

.primary-place-button {
  color: #fff;
  background: linear-gradient(135deg, #5362ee, #735be8);
  border: 0;
}

.secondary-place-button {
  color: #5362e8;
  background: #fff;
  border: 1px solid #dfe3fa;
}

.data-source {
  margin: 13px 4px 0;
  color: #9aa4b4;
  font-size: 9px;
  text-align: right;
}

:deep(.leaflet-control-zoom) {
  overflow: hidden;
  border: 0 !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 20px rgba(24, 35, 59, 0.16) !important;
}

:deep(.leaflet-control-zoom a) {
  color: #5362ee !important;
  border: 0 !important;
}

:deep(.custom-marker-wrapper) {
  background: transparent;
  border: 0;
}

:deep(.place-marker) {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  font-size: 19px;
  background: #fff;
  border: 3px solid #5362ee;
  border-radius: 15px 15px 15px 3px;
  box-shadow: 0 8px 18px rgba(36, 45, 87, 0.28);
  transform: rotate(-45deg);
  transition: 0.2s ease;
}

:deep(.place-marker span) {
  transform: rotate(45deg);
}

:deep(.place-marker.selected) {
  color: #fff;
  background: linear-gradient(135deg, #5362ee, #735be8);
  border-color: #fff;
  box-shadow:
    0 0 0 4px rgba(83, 98, 238, 0.22),
    0 10px 22px rgba(36, 45, 87, 0.35);
  transform: rotate(-45deg) scale(1.12);
}

:deep(.place-tooltip) {
  padding: 6px 9px;
  color: #344057;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.96);
  border: 0;
  border-radius: 8px;
  box-shadow: 0 6px 17px rgba(24, 35, 59, 0.16);
}

@media (min-width: 720px) {
  .map-header {
    padding-right: 28px;
    padding-left: 28px;
  }

  .map-intro {
    padding-right: 30px;
    padding-left: 30px;
  }

  .map-content {
    padding-right: 28px;
    padding-left: 28px;
  }

  .search-panel {
    padding: 12px;
  }

  .select-row {
    max-width: 450px;
  }

  .selected-place-card {
    right: 18px;
    bottom: 18px;
    left: auto;
    width: 430px;
  }
}

@media (max-width: 520px) {
  .brand-copy small {
    display: none;
  }

  .map-intro {
    padding-top: 32px;
    padding-bottom: 50px;
  }

  .map-card {
    min-height: calc(100vh - 300px);
    border-radius: 19px;
  }

  .leaflet-map {
    height: calc(100vh - 300px);
    min-height: 510px;
  }

  .reset-button {
    width: 43px;
    padding: 0;
    justify-content: center;
    font-size: 0;
  }

  .selected-place-card {
    grid-template-columns: 86px minmax(0, 1fr);
  }

  .selected-place-image,
  .selected-place-placeholder {
    width: 86px;
    height: 106px;
  }

  .place-actions {
    flex-wrap: wrap;
  }

  .primary-place-button,
  .secondary-place-button {
    flex: 1;
  }
}
</style>