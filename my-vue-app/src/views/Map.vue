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

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import useLocations from '../composables/useLocations'
import { useSettings } from '../stores/settings'

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow
})

const route = useRoute()
const router = useRouter()

const { locale } = useI18n()

const settings = useSettings()
const locationApi = useLocations()

const mapElement = ref(null)

const keyword = ref(
  String(route.query.q || '')
)

const selectedCategory = ref(
  String(
    route.query.category ||
    'all'
  )
)

const selectedDistrict = ref('all')
const selectedPlace = ref(null)

const loading = ref(true)
const apiError = ref(false)
const errorMessage = ref('')

const places = ref([])

let mapInstance = null
let markerLayer = null
let userMarker = null

const userLocation = ref(null)
const locationPermissionError = ref('')

const SEOUL_CENTER = [
  37.5665,
  126.978
]

const DEFAULT_ZOOM = 16
const CAMERA_RADIUS_METERS = 1500

const cameraCenter = ref({
  lat: SEOUL_CENTER[0],
  lng: SEOUL_CENTER[1]
})

const CATEGORY_COLORS = {
  attraction: '#5362ee',
  culture: '#9c5de8',
  festival: '#f04464',
  course: '#f59e0b',
  leisure: '#10a878',
  accommodation: '#168fe3',
  shopping: '#ec4899',
  restaurant: '#f97316'
}

function categoryColor(category) {
  return (
    CATEGORY_COLORS[category] ||
    '#64748b'
  )
}

const text = computed(() => {
  const english =
    locale.value === 'en'

  return english
    ? {
        brandSubtitle:
          'Local tips for global travelers',

        pageBadge:
          'Seoul place map',

        pageTitle:
          'Explore Seoul on the map',

        pageDescription:
          'Find attractions, festivals, cultural facilities and local travel information across Seoul.',

        searchPlaceholder:
          'Search places or districts',

        search:
          'Search',

        all:
          'All',

        district:
          'District',

        result:
          'places found',

        mapLoading:
          'Loading Seoul places...',

        resetMap:
          'Reset map',

        apiNotice:
          'Could not load location data from the server.',

        viewDetails:
          'View details',

        relatedCommunity:
          'Community posts',

        close:
          'Close',

        dataSource:
          'Data source: Korea Tourism Organization TourAPI 4.0',

        categories: {
          all: 'All',
          attraction: 'Attractions',
          culture: 'Culture',
          festival: 'Festivals',
          course: 'Courses',
          leisure: 'Leisure',
          accommodation: 'Stay',
          shopping: 'Shopping',
          restaurant: 'Restaurants'
        }
      }
    : {
        brandSubtitle:
          '외국인을 위한 서울 로컬 정보',

        pageBadge:
          '서울 장소 지도',

        pageTitle:
          '지도에서 서울을 둘러보세요',

        pageDescription:
          '서울의 관광지, 축제, 문화시설과 외국인 여행자를 위한 지역 정보를 한눈에 확인하세요.',

        searchPlaceholder:
          '장소명이나 자치구를 검색하세요',

        search:
          '검색',

        all:
          '전체',

        district:
          '자치구',

        result:
          '개의 장소',

        mapLoading:
          '서울 장소를 불러오고 있어요...',

        resetMap:
          '지도 초기화',

        apiNotice:
          '백엔드에서 장소 데이터를 불러오지 못했습니다.',

        viewDetails:
          '상세 보기',

        relatedCommunity:
          '관련 커뮤니티 글',

        close:
          '닫기',

        dataSource:
          '데이터 출처: 한국관광공사 TourAPI 4.0',

        categories: {
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

const categoryOptions = [
  {
    id: 'all',
    icon: '✨'
  },
  {
    id: 'attraction',
    icon: '🏛️'
  },
  {
    id: 'culture',
    icon: '🎨'
  },
  {
    id: 'festival',
    icon: '🎉'
  },
  {
    id: 'course',
    icon: '🚶'
  },
  {
    id: 'leisure',
    icon: '🚲'
  },
  {
    id: 'accommodation',
    icon: '🛏️'
  },
  {
    id: 'shopping',
    icon: '🛍️'
  },
  {
    id: 'restaurant',
    icon: '🍽️'
  }
]

const districts = computed(() => {
  return [
    ...new Set(
      places.value
        .map((place) =>
          place.district
        )
        .filter(Boolean)
    )
  ].sort((a, b) =>
    a.localeCompare(b, 'ko')
  )
})

const filteredPlaces = computed(() => {
  const normalizedKeyword =
    keyword.value
      .trim()
      .toLowerCase()

  return places.value.filter(
    (place) => {
      const matchesCategory =
        selectedCategory.value ===
          'all' ||
        place.category ===
          selectedCategory.value

      const matchesDistrict =
        selectedDistrict.value ===
          'all' ||
        place.district ===
          selectedDistrict.value

      const searchableText = [
        place.title,
        place.titleEn,

        place.address,
        place.addressEn,

        place.koAddress,
        place.enAddress,

        place.raw?.KO_NAME,
        place.raw?.EN_NAME,
        place.raw?.ko_address,
        place.raw?.en_address,

        place.district,
        place.districtEn
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesKeyword =
        !normalizedKeyword ||
        searchableText.includes(
          normalizedKeyword
        )

      return (
        matchesCategory &&
        matchesDistrict &&
        matchesKeyword &&
        Number.isFinite(place.lat) &&
        Number.isFinite(place.lng)
      )
    }
  )
})

const visiblePlaces = computed(() => {
  const center = L.latLng(
    cameraCenter.value.lat,
    cameraCenter.value.lng
  )

  return filteredPlaces.value.filter(
    (place) => {
      if (
        !Number.isFinite(place.lat) ||
        !Number.isFinite(place.lng)
      ) {
        return false
      }

      const placePosition = L.latLng(
        place.lat,
        place.lng
      )

      const distance =
        center.distanceTo(placePosition)

      return (
        distance <=
        CAMERA_RADIUS_METERS
      )
    }
  )
})

function updateCameraCenter() {
  if (!mapInstance) {
    return
  }

  const center =
    mapInstance.getCenter()

  cameraCenter.value = {
    lat: center.lat,
    lng: center.lng
  }

  /*
   * 선택된 장소가 카메라 중심에서
   * 5km 밖으로 나가면 카드도 닫는다.
   */
  if (selectedPlace.value) {
    const selectedDistance =
      center.distanceTo(
        L.latLng(
          selectedPlace.value.lat,
          selectedPlace.value.lng
        )
      )

    if (
      selectedDistance >
      CAMERA_RADIUS_METERS
    ) {
      selectedPlace.value = null
    }
  }

  renderMarkers()
}

function displayTitle(place) {
  if (!place) {
    return ''
  }

  if (locale.value === 'en') {
    return (
      place.titleEn ||
      place.raw?.EN_NAME ||
      place.title ||
      place.raw?.KO_NAME ||
      ''
    )
  }

  return (
    place.title ||
    place.raw?.KO_NAME ||
    place.titleEn ||
    place.raw?.EN_NAME ||
    ''
  )
}

function displayAddress(place) {
  if (!place) {
    return ''
  }

  if (locale.value === 'en') {
    return (
      place.addressEn ||
      place.enAddress ||
      place.raw?.en_address ||
      place.address ||
      place.koAddress ||
      place.raw?.ko_address ||
      ''
    )
  }

  return (
    place.address ||
    place.koAddress ||
    place.raw?.ko_address ||
    place.addressEn ||
    place.enAddress ||
    place.raw?.en_address ||
    ''
  )
}

function displayDistrict(place) {
  if (!place) {
    return ''
  }

  if (locale.value === 'en') {
    return (
      place.districtEn ||
      place.district ||
      ''
    )
  }

  return (
    place.district ||
    place.districtEn ||
    ''
  )
}

function changeLanguage(language) {
  locale.value = language
  settings.setLang(language)

  localStorage.setItem(
    'welcome-seoul-language',
    language
  )
}

function categoryIcon(category) {
  return (
    categoryOptions.find(
      (item) =>
        item.id === category
    )?.icon ||
    '📍'
  )
}

function initializeMap() {
  if (
    !mapElement.value ||
    mapInstance
  ) {
    return
  }

  mapInstance = L.map(
    mapElement.value,
    {
      zoomControl: false,
      minZoom: 10,
      maxZoom: 19
    }
  ).setView(
    SEOUL_CENTER,
    DEFAULT_ZOOM
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

  markerLayer =
    L.layerGroup().addTo(
      mapInstance
    )

  const center =
    mapInstance.getCenter()

  cameraCenter.value = {
    lat: center.lat,
    lng: center.lng
  }

  /*
   * 지도 이동 또는 줌 완료 후
   * 현재 카메라 중심 기준으로
   * 5km 이내 핀을 다시 그린다.
   */
  mapInstance.on(
    'moveend',
    updateCameraCenter
  )
}

function createPlaceIcon(
  place,
  isSelected = false
) {
  const markerColor =
    categoryColor(place.category)

  return L.divIcon({
    className: 'custom-marker-wrapper',

    html: `
      <div
        class="place-marker ${
          isSelected
            ? 'selected'
            : ''
        }"
        style="
          --marker-color: ${markerColor};
        "
      ></div>
    `,

    iconSize: [25, 30],
    iconAnchor: [12, 28],
    popupAnchor: [0, -25]
  })
}

function renderMarkers() {
  if (
    !mapInstance ||
    !markerLayer
  ) {
    return
  }

  markerLayer.clearLayers()

  visiblePlaces.value.forEach(
    (place) => {
      const marker = L.marker(
        [
          place.lat,
          place.lng
        ],
        {
          icon: createPlaceIcon(
            place,
            selectedPlace.value?.id ===
              place.id
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
          offset: [0, -28],
          className:
            'place-tooltip'
        }
      )

      marker.addTo(markerLayer)
    }
  )
}

function selectPlace(place) {
  selectedPlace.value = place

  mapInstance?.flyTo(
    [
      place.lat,
      place.lng
    ],
    Math.max(
      mapInstance.getZoom(),
      15
    ),
    {
      duration: 0.7
    }
  )

  renderMarkers()
}

function closeSelectedPlace() {
  selectedPlace.value = null
  renderMarkers()
}

function applySearch() {
  selectedPlace.value = null
  renderMarkers()
}

function selectCategory(category) {
  selectedCategory.value =
    category

  selectedPlace.value = null

  nextTick(() => {
    renderMarkers()
  })
}

function resetMap() {
  keyword.value = ''
  selectedCategory.value = 'all'
  selectedDistrict.value = 'all'
  selectedPlace.value = null

  nextTick(() => {
    renderMarkers()

    mapInstance?.flyTo(
      SEOUL_CENTER,
      DEFAULT_ZOOM,
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

function openPlaceDetail(place) {
  router.push(
    `/place/${place.id}`
  )
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          locale.value === 'en'
            ? 'Geolocation is not supported by this browser.'
            : '현재 브라우저에서는 위치 기능을 지원하지 않습니다.'
        )
      )

      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },

      (error) => {
        let message = ''

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              locale.value === 'en'
                ? 'Location permission was denied.'
                : '위치 권한이 거부되었습니다.'
            break

          case error.POSITION_UNAVAILABLE:
            message =
              locale.value === 'en'
                ? 'Your location is currently unavailable.'
                : '현재 위치 정보를 확인할 수 없습니다.'
            break

          case error.TIMEOUT:
            message =
              locale.value === 'en'
                ? 'The location request timed out.'
                : '위치 요청 시간이 초과되었습니다.'
            break

          default:
            message =
              locale.value === 'en'
                ? 'Could not determine your location.'
                : '현재 위치를 확인하지 못했습니다.'
        }

        reject(new Error(message))
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  })
}

function calculateDistance(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const EARTH_RADIUS_KM = 6371

  const toRadians = (degree) =>
    degree * (Math.PI / 180)

  const latDifference =
    toRadians(lat2 - lat1)

  const lngDifference =
    toRadians(lng2 - lng1)

  const value =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(lngDifference / 2) ** 2

  const angle =
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    )

  return EARTH_RADIUS_KM * angle
}

function findNearestPlace(location) {
  const validPlaces = places.value.filter(
    (place) =>
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng)
  )

  if (!validPlaces.length) {
    return null
  }

  return validPlaces.reduce(
    (nearest, place) => {
      const distance =
        calculateDistance(
          location.lat,
          location.lng,
          place.lat,
          place.lng
        )

      if (
        !nearest ||
        distance < nearest.distance
      ) {
        return {
          place,
          distance
        }
      }

      return nearest
    },
    null
  )
}

function renderUserMarker(location) {
  if (!mapInstance) {
    return
  }

  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }

  userMarker = L.circleMarker(
    [location.lat, location.lng],
    {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2563eb',
      fillOpacity: 1
    }
  )
    .addTo(mapInstance)
    .bindPopup(
      locale.value === 'en'
        ? 'My location'
        : '내 위치'
    )
}

async function focusOnCurrentLocation() {
  locationPermissionError.value = ''

  try {
    const location =
      await getCurrentPosition()

    userLocation.value = location

    renderUserMarker(location)

    const nearest =
      findNearestPlace(location)

    if (!nearest) {
      mapInstance?.flyTo(
        [location.lat, location.lng],
        DEFAULT_ZOOM,
        {
          duration: 0.8
        }
      )

      return
    }

    selectedPlace.value =
      nearest.place

    renderMarkers()

    mapInstance?.fitBounds(
      [
        [
          location.lat,
          location.lng
        ],
        [
          nearest.place.lat,
          nearest.place.lng
        ]
      ],
      {
        padding: [65, 65],
        maxZoom: DEFAULT_ZOOM
      }
    )

    console.log(
      '현재 위치에서 가장 가까운 장소:',
      {
        place: nearest.place,
        distanceKm:
          nearest.distance
      }
    )
  } catch (error) {
    console.warn(
      '현재 위치 조회 실패:',
      error
    )

    locationPermissionError.value =
      error.message

    mapInstance?.flyTo(
      SEOUL_CENTER,
      DEFAULT_ZOOM
    )
  }
}

async function loadPlaces() {
  loading.value = true
  apiError.value = false
  errorMessage.value = ''

  try {
    const result =
      await locationApi
        .fetchAllLocations({
          pageSize: 100,

          // 지도 성능을 위해 제한
          maxItems: 1000
        })

    places.value =
      (result.items || []).filter(
        (place) =>
          Number.isFinite(
            place.lat
          ) &&
          Number.isFinite(
            place.lng
          )
      )

    await nextTick()
    renderMarkers()

    const requestedPlaceId =
      String(
        route.query.place ||
        ''
      )

    if (requestedPlaceId) {
      const target =
        places.value.find(
          (place) =>
            place.id === requestedPlaceId
        )

      if (target) {
        selectPlace(target)
        return
      }
    }

    /*
    * 특정 장소를 지정해서 들어온 것이 아니라면
    * 현재 위치 기준으로 가장 가까운 장소를 연다.
    */
    await focusOnCurrentLocation()
  } catch (error) {
    console.error(
      '지도 장소 조회 실패:',
      error
    )

    places.value = []
    apiError.value = true

    errorMessage.value =
      error.message ||
      text.value.apiNotice
  } finally {
    loading.value = false
  }
}

watch(
  [
    keyword,
    selectedCategory,
    selectedDistrict
  ],
  () => {
    selectedPlace.value = null

    nextTick(() => {
      renderMarkers()
    })
  }
)

watch(
  () => locale.value,
  (language) => {
    document.documentElement.lang =
      language === 'en'
        ? 'en'
        : 'ko'

    renderMarkers()

    if (
      userMarker &&
      userLocation.value
    ) {
      userMarker.bindPopup(
        language === 'en'
          ? 'My location'
          : '내 위치'
      )
    }
  },
  {
    immediate: true
  }
)

onMounted(async () => {
  await nextTick()

  initializeMap()

  await loadPlaces()

  setTimeout(() => {
    mapInstance?.invalidateSize()
  }, 100)
})

onBeforeUnmount(() => {
  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }

  markerLayer?.clearLayers()
  markerLayer = null

  mapInstance?.remove()
  mapInstance = null
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

        <div class="marker-legend">
          <span
            v-for="category in categoryOptions.filter(
              (item) => item.id !== 'all'
            )"
            :key="category.id"
          >
            <i
              :style="{
                backgroundColor:
                  categoryColor(category.id)
              }"
            ></i>

            {{
              text.categories[
                category.id
              ]
            }}
          </span>
        </div>
      </section>

      <div
        v-if="apiError"
        class="api-notice"
      >
        <span>ⓘ</span>
        {{ text.apiNotice }}
      </div>

      <div
        v-if="locationPermissionError"
        class="location-notice"
      >
        <span>📍</span>

        <div>
          <strong>
            {{
              locale === 'en'
                ? 'Location unavailable'
                : '현재 위치를 사용할 수 없어요'
            }}
          </strong>

          <p>
            {{ locationPermissionError }}
          </p>
        </div>
      </div>

      <section class="map-card">
        <div class="map-result-badge">
          <strong>{{ visiblePlaces.length }}</strong>
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

              {{ displayAddress(selectedPlace) }}
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
                  openPlaceDetail(
                    selectedPlace
                  )
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

.marker-legend {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  margin-top: 9px;
  padding: 2px 1px;
  scrollbar-width: none;
}

.marker-legend::-webkit-scrollbar {
  display: none;
}

.marker-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;

  color: #778398;
  font-size: 9px;
  font-weight: 700;
}

.marker-legend i {
  display: block;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
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

.location-notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 11px 13px;
  color: #6c7484;
  background: #fff;
  border: 1px solid #e1e5ed;
  border-radius: 13px;
}

.location-notice > span {
  flex-shrink: 0;
  font-size: 17px;
}

.location-notice strong {
  display: block;
  color: #3d485e;
  font-size: 11px;
}

.location-notice p {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.45;
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
  width: 20px;
  height: 20px;

  background: var(--marker-color);
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 8%;

  box-shadow:
    0 4px 10px
    rgba(30, 41, 59, 0.24);

  transform: rotate(-45deg);

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

:deep(.place-marker.selected) {
  border-width: 3px;

  box-shadow:
    0 0 0 3px
    rgba(83, 98, 238, 0.2),
    0 6px 14px
    rgba(30, 41, 59, 0.3);

  transform:
    rotate(-45deg)
    scale(1.25);
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