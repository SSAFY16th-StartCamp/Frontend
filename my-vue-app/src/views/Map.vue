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
let routeLayer = null
let userMarker = null

const ODSAY_API_KEY =
  import.meta.env.VITE_ODSAY_API_KEY || ''

const ODSAY_API_BASE =
  'https://api.odsay.com/v1/api'

const transitPanelOpen = ref(false)
const transitLoading = ref(false)
const transitError = ref('')

const transitRoutes = ref([])
const selectedTransitRouteIndex = ref(0)

const selectedTransitRoute = computed(() => {
  return (
    transitRoutes.value[
      selectedTransitRouteIndex.value
    ] || null
  )
})

const userLocation = ref(null)
const locationPermissionError = ref('')
const routeStart = ref(null)
const routeDestination = ref(null)

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
        },

        myLocation: 'My location',
        transitDirections: 'Public transit directions',
        findTransitRoute: 'Find transit route',
        routeLoading: 'Finding public transit routes...',
        routeNotFound: 'No public transit route was found.',
        routeOptions: 'Recommended routes',
        minutes: 'min',
        fare: 'Fare',
        transfers: 'transfers',
        walking: 'Walk',
        walk: 'Walk',
        bus: 'Bus',
        subway: 'Subway',
        clearRoute: 'Clear route',
        startPoint: 'Start',
        destinationPoint: 'Destination',
        locationRequired:
          'Location permission is required to find a route.',
        odsayKeyMissing:
          'The ODsay API key is missing.',
        nearbyRouteError:
          'The destination is too close for a public transit route.',

        start: 'Start',
        destination: 'Destination',

        setAsStart:
          'Set as start',

        setAsDestination:
          'Set as destination',

        selectStart:
          'Select a starting point',

        selectDestination:
          'Select a destination',

        swapRoute:
          'Swap',

        clearSelection:
          'Clear',

        locateMe:
          'Find my location',

        currentLocationReady:
          'Your current location is ready.',

        samePointError:
          'Start and destination must be different.',

        routePointRequired:
          'Select both a start and destination.',

        setCurrentAsStart:
          'Use as start',

        setCurrentAsDestination:
          'Use as destination',
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
        },

        myLocation: '내 위치',
        transitDirections: '대중교통 길찾기',
        findTransitRoute: '대중교통 길찾기',
        routeLoading: '대중교통 경로를 찾고 있어요...',
        routeNotFound: '이동 가능한 대중교통 경로가 없습니다.',
        routeOptions: '추천 경로',
        minutes: '분',
        fare: '요금',
        transfers: '회 환승',
        walking: '도보',
        walk: '도보',
        bus: '버스',
        subway: '지하철',
        clearRoute: '경로 지우기',
        startPoint: '출발지',
        destinationPoint: '도착지',
        locationRequired:
          '길찾기를 위해 현재 위치 권한이 필요합니다.',
        odsayKeyMissing:
          'ODsay API 키가 등록되지 않았습니다.',
        nearbyRouteError:
          '목적지가 너무 가까워 대중교통 경로를 제공하지 않습니다.',

        start: '출발',
        destination: '도착',

        setAsStart:
          '출발지로',

        setAsDestination:
          '도착지로',

        selectStart:
          '출발지를 선택하세요',

        selectDestination:
          '도착지를 선택하세요',

        swapRoute:
          '순서 변경',

        clearSelection:
          '초기화',

        locateMe:
          '내 위치 확인',

        currentLocationReady:
          '현재 위치를 확인했습니다.',

        samePointError:
          '출발지와 도착지는 달라야 합니다.',

        routePointRequired:
          '출발지와 도착지를 모두 선택해 주세요.',

        setCurrentAsStart:
          '출발지로',

        setCurrentAsDestination:
          '도착지로',
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
  if (
    selectedPlace.value &&
    !transitPanelOpen.value
  ) {
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

function createPlaceRoutePoint(place) {
  if (
    !place ||
    !Number.isFinite(place.lat) ||
    !Number.isFinite(place.lng)
  ) {
    return null
  }

  return {
    type: 'place',
    id: String(place.id),
    lat: Number(place.lat),
    lng: Number(place.lng),
    place
  }
}

function createCurrentRoutePoint(location) {
  if (
    !location ||
    !Number.isFinite(location.lat) ||
    !Number.isFinite(location.lng)
  ) {
    return null
  }

  return {
    type: 'current',
    id: 'current-location',
    lat: Number(location.lat),
    lng: Number(location.lng)
  }
}

function routePointName(point) {
  if (!point) {
    return ''
  }

  if (point.type === 'current') {
    return text.value.myLocation
  }

  return displayTitle(point.place)
}

function routePointAddress(point) {
  if (!point) {
    return ''
  }

  if (point.type === 'current') {
    return text.value.currentLocationReady
  }

  return displayAddress(point.place)
}

function isRouteStart(place) {
  return (
    routeStart.value?.type === 'place' &&
    String(routeStart.value.id) ===
      String(place?.id)
  )
}

function isRouteDestination(place) {
  return (
    routeDestination.value?.type === 'place' &&
    String(routeDestination.value.id) ===
      String(place?.id)
  )
}

function setPlaceAsStart(place) {
  const point =
    createPlaceRoutePoint(place)

  if (!point) {
    return
  }

  clearTransitResult()

  routeStart.value = point

  /*
   * 같은 장소가 도착지였다면
   * 도착지 선택은 해제
   */
  if (
    routeDestination.value?.type === 'place' &&
    String(routeDestination.value.id) ===
      String(point.id)
  ) {
    routeDestination.value = null
  }

  renderMarkers()
}

function setPlaceAsDestination(place) {
  const point =
    createPlaceRoutePoint(place)

  if (!point) {
    return
  }

  clearTransitResult()

  routeDestination.value = point

  /*
   * 같은 장소가 출발지였다면
   * 출발지 선택은 해제
   */
  if (
    routeStart.value?.type === 'place' &&
    String(routeStart.value.id) ===
      String(point.id)
  ) {
    routeStart.value = null
  }

  renderMarkers()
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

  /*
  * 노선은 장소 핀과 별도 레이어로 관리한다.
  */
  routeLayer =
    L.layerGroup().addTo(
      mapInstance
    )

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

  const placesToRender = [
    ...visiblePlaces.value
  ]

  /*
   * 선택 카드와 길찾기 출발·도착 장소는
   * 현재 반경 밖이어도 지도에 계속 표시한다.
   */
  const fixedPlaces = [
    selectedPlace.value,
    routeStart.value?.type === 'place'
      ? routeStart.value.place
      : null,
    routeDestination.value?.type === 'place'
      ? routeDestination.value.place
      : null
  ].filter(Boolean)

  fixedPlaces.forEach((place) => {
    const alreadyIncluded =
      placesToRender.some(
        (item) =>
          String(item.id) ===
          String(place.id)
      )

    if (!alreadyIncluded) {
      placesToRender.push(place)
    }
  })

  placesToRender.forEach(
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

function getOdsayLanguage() {
  return locale.value === 'en'
    ? 1
    : 0
}

function getOdsayErrorMessage(
  code,
  originalMessage = ''
) {
  const normalizedCode =
    String(code || '')

  const english =
    locale.value === 'en'

  const messages = english
    ? {
        '3':
          'No public transit stop was found near your location.',
        '4':
          'No public transit stop was found near the destination.',
        '5':
          'No public transit stops were found near either point.',
        '6':
          'Public transit routing is not supported in this area.',
        '-98':
          'The destination is within 700 m. Walking may be faster.',
        '-99':
          'No public transit route was found.',
        '-8':
          'Some route coordinates are invalid.',
        '-9':
          'Required route information is missing.'
      }
    : {
        '3':
          '현재 위치 주변에 대중교통 정류장이 없습니다.',
        '4':
          '도착지 주변에 대중교통 정류장이 없습니다.',
        '5':
          '출발지와 도착지 주변에 대중교통 정류장이 없습니다.',
        '6':
          '대중교통 길찾기를 지원하지 않는 지역입니다.',
        '-98':
          '목적지가 700m 이내라 대중교통 경로를 제공하지 않습니다.',
        '-99':
          '검색된 대중교통 경로가 없습니다.',
        '-8':
          '출발지 또는 도착지 좌표가 올바르지 않습니다.',
        '-9':
          '길찾기에 필요한 정보가 누락되었습니다.'
      }

  return (
    messages[normalizedCode] ||
    originalMessage ||
    text.value.routeNotFound
  )
}

async function requestOdsay(
  endpoint,
  query = {}
) {
  if (!ODSAY_API_KEY) {
    throw new Error(
      text.value.odsayKeyMissing
    )
  }

  const url = new URL(
    `${ODSAY_API_BASE}/${endpoint}`
  )

  Object.entries(query).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        url.searchParams.set(
          key,
          String(value)
        )
      }
    }
  )

  /*
   * URLSearchParams가 인코딩하므로
   * API 키를 별도로 encodeURIComponent 하지 않는다.
   */
  url.searchParams.set(
    'apiKey',
    ODSAY_API_KEY
  )

  const response = await fetch(
    url.toString(),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    }
  )

  let data

  try {
    data = await response.json()
  } catch {
    throw new Error(
      `ODsay HTTP ${response.status}`
    )
  }

  const apiError =
    Array.isArray(data?.error)
      ? data.error[0]
      : data?.error

  if (!response.ok || apiError) {
    const error = new Error(
      getOdsayErrorMessage(
        apiError?.code,
        apiError?.message ||
          `ODsay HTTP ${response.status}`
      )
    )

    error.odsayCode =
      String(apiError?.code || '')

    error.odsayMessage =
      apiError?.message || ''

    throw error
  }

  return data
}

function normalizeTransitStep(
  step,
  index
) {
  const trafficType =
    Number(step.trafficType)

  const firstLane =
    Array.isArray(step.lane)
      ? step.lane[0] || {}
      : {}

  if (trafficType === 1) {
    return {
      id: `subway-${index}`,
      mode: 'subway',
      icon: '🚇',

      line:
        firstLane.name ||
        firstLane.subwayCode ||
        text.value.subway,

      start:
        step.startName || '',

      end:
        step.endName || '',

      time:
        Number(step.sectionTime || 0),

      stationCount:
        Number(step.stationCount || 0),

      distance:
        Number(step.distance || 0)
    }
  }

  if (trafficType === 2) {
    return {
      id: `bus-${index}`,
      mode: 'bus',
      icon: '🚌',

      line:
        firstLane.busNo ||
        firstLane.name ||
        text.value.bus,

      start:
        step.startName || '',

      end:
        step.endName || '',

      time:
        Number(step.sectionTime || 0),

      stationCount:
        Number(step.stationCount || 0),

      distance:
        Number(step.distance || 0)
    }
  }

  return {
    id: `walk-${index}`,
    mode: 'walk',
    icon: '🚶',

    line:
      text.value.walk,

    start: '',
    end: '',

    time:
      Number(step.sectionTime || 0),

    stationCount: 0,

    distance:
      Number(step.distance || 0)
  }
}

function normalizeTransitRoute(
  path,
  index
) {
  const info = path.info || {}

  const busRideCount =
    Number(
      info.busTransitCount || 0
    )

  const subwayRideCount =
    Number(
      info.subwayTransitCount || 0
    )

  const rideCount =
    busRideCount +
    subwayRideCount

  return {
    id: `transit-route-${index}`,

    totalTime:
      Number(info.totalTime || 0),

    payment:
      Number(info.payment || 0),

    totalWalk:
      Number(info.totalWalk || 0),

    transferCount:
      Math.max(
        rideCount - 1,
        0
      ),

    mapObj:
      info.mapObj || '',

    steps:
      (path.subPath || []).map(
        normalizeTransitStep
      ),

    raw: path
  }
}

function formatFare(value) {
  const amount =
    Number(value || 0)

  if (!amount) {
    return '-'
  }

  return `₩${amount.toLocaleString(
    locale.value === 'en'
      ? 'en-US'
      : 'ko-KR'
  )}`
}

function formatWalkDistance(value) {
  const distance =
    Number(value || 0)

  if (distance >= 1000) {
    return `${(
      distance / 1000
    ).toFixed(1)} km`
  }

  return `${Math.round(distance)} m`
}

function getTransitLineColor(
  lane
) {
  /*
   * loadLane의 class:
   * 1 = 버스
   * 2 = 지하철
   */
  if (Number(lane.class) === 1) {
    return '#2563eb'
  }

  if (Number(lane.class) === 2) {
    return '#7c3aed'
  }

  return '#64748b'
}

function clearTransitLine() {
  routeLayer?.clearLayers()
}

function clearTransitResult() {
  /*
   * 지도에 그려진 노선과
   * ODsay 검색 결과만 초기화한다.
   *
   * 출발지와 도착지는 유지한다.
   */
  clearTransitLine()

  transitRoutes.value = []
  selectedTransitRouteIndex.value = 0
  transitPanelOpen.value = false
  transitError.value = ''
}

function clearRouteSelection() {
  /*
   * 노선 결과와 출발·도착 선택을
   * 모두 초기화한다.
   */
  clearTransitResult()

  routeStart.value = null
  routeDestination.value = null

  renderMarkers()
}

function clearTransitRoute() {
  clearRouteSelection()
}

function drawWalkingConnector(
  start,
  end
) {
  if (
    !routeLayer ||
    !start ||
    !end
  ) {
    return
  }

  const coordinates = [
    [
      Number(start.lat),
      Number(start.lng)
    ],
    [
      Number(end.lat),
      Number(end.lng)
    ]
  ]

  const valid =
    coordinates.every(
      ([lat, lng]) =>
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    )

  if (!valid) {
    return
  }

  L.polyline(
    coordinates,
    {
      color: '#64748b',
      weight: 4,
      opacity: 0.8,
      dashArray: '5 7'
    }
  ).addTo(routeLayer)
}

async function drawTransitRoute(
  route
) {
  clearTransitLine()

  if (
    !routeLayer ||
    !route?.mapObj
  ) {
    return
  }

  /*
   * ODsay 공식 예제는 길찾기 응답의
   * mapObj 앞에 0:0@를 붙여 loadLane을 호출한다.
   */
  const mapObject =
    route.mapObj.startsWith(
      '0:0@'
    )
      ? route.mapObj
      : `0:0@${route.mapObj}`

  const laneData =
    await requestOdsay(
      'loadLane',
      {
        mapObject,
        lang:
          getOdsayLanguage()
      }
    )

  const lanes =
    laneData?.result?.lane || []

  const allCoordinates = []

  lanes.forEach((lane) => {
    const color =
      getTransitLineColor(lane)

    const sections =
      lane.section || []

    sections.forEach(
      (section) => {
        const coordinates =
          (
            section.graphPos || []
          )
            .map((position) => [
              Number(position.y),
              Number(position.x)
            ])
            .filter(
              ([lat, lng]) =>
                Number.isFinite(lat) &&
                Number.isFinite(lng)
            )

        if (
          coordinates.length < 2
        ) {
          return
        }

        L.polyline(
          coordinates,
          {
            color,
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }
        ).addTo(routeLayer)

        allCoordinates.push(
          ...coordinates
        )
      }
    )
  })

  /*
   * 출발 위치 → 첫 대중교통 승차 지점
   */
  const transitSteps =
    route.raw?.subPath?.filter(
      (step) =>
        Number(step.trafficType) !==
        3
    ) || []

  const firstTransitStep =
    transitSteps[0]

  const lastTransitStep =
    transitSteps[
      transitSteps.length - 1
    ]

  if (
    routeStart.value &&
    firstTransitStep
  ) {
    drawWalkingConnector(
      routeStart.value,
      {
        lat:
          Number(
            firstTransitStep.startY
          ),

        lng:
          Number(
            firstTransitStep.startX
          )
      }
    )
  }

  /*
   * 마지막 하차 지점 → 선택 장소
   */
  if (
    routeDestination.value &&
    lastTransitStep
  ) {
    drawWalkingConnector(
      {
        lat:
          Number(
            lastTransitStep.endY
          ),

        lng:
          Number(
            lastTransitStep.endX
          )
      },
      routeDestination.value
    )
  }

  if (routeStart.value) {
    allCoordinates.push([
      routeStart.value.lat,
      routeStart.value.lng
    ])
  }

  if (routeDestination.value) {
    allCoordinates.push([
      routeDestination.value.lat,
      routeDestination.value.lng
    ])
  }

  if (
    mapInstance &&
    allCoordinates.length > 1
  ) {
    mapInstance.fitBounds(
      allCoordinates,
      {
        padding: [55, 55],
        maxZoom: 16
      }
    )
  }
}

async function selectTransitRoute(
  index
) {
  const route =
    transitRoutes.value[index]

  if (!route) {
    return
  }

  selectedTransitRouteIndex.value =
    index

  transitError.value = ''

  try {
    await drawTransitRoute(route)
  } catch (error) {
    console.error(
      '대중교통 노선 그리기 실패:',
      error
    )

    transitError.value =
      error.message
  }
}

async function searchTransitRoutes() {
  transitError.value = ''

  if (
    !routeStart.value ||
    !routeDestination.value
  ) {
    transitPanelOpen.value = true

    transitError.value =
      text.value.routePointRequired

    return
  }

  const start =
    routeStart.value

  const destination =
    routeDestination.value

  const distance =
    L.latLng(
      start.lat,
      start.lng
    ).distanceTo(
      L.latLng(
        destination.lat,
        destination.lng
      )
    )

  if (distance < 10) {
    transitPanelOpen.value = true

    transitError.value =
      text.value.samePointError

    return
  }

  transitPanelOpen.value = true
  transitLoading.value = true
  transitError.value = ''
  transitRoutes.value = []

  clearTransitLine()

  try {
    const requestRoutes =
      (language) =>
        requestOdsay(
          'searchPubTransPathT',
          {
            /*
             * SX, EX는 경도
             * SY, EY는 위도
             */
            SX: start.lng,
            SY: start.lat,

            EX: destination.lng,
            EY: destination.lat,

            OPT: 0,
            SearchType: 0,
            SearchPathType: 0,
            lang: language
          }
        )

    let routeData

    try {
      routeData =
        await requestRoutes(
          getOdsayLanguage()
        )
    } catch (error) {
      const languageError =
        String(
          error.odsayMessage || ''
        ).includes(
          'LanguageAuthFailed'
        )

      if (
        locale.value === 'en' &&
        languageError
      ) {
        routeData =
          await requestRoutes(0)
      } else {
        throw error
      }
    }

    const paths =
      routeData?.result?.path || []

    if (!paths.length) {
      throw new Error(
        text.value.routeNotFound
      )
    }

    transitRoutes.value =
      paths
        .slice(0, 3)
        .map(
          normalizeTransitRoute
        )

    await selectTransitRoute(0)
  } catch (error) {
    console.error(
      '대중교통 길찾기 실패:',
      error
    )

    transitError.value =
      error.message ||
      text.value.routeNotFound
  } finally {
    transitLoading.value = false
  }
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

    mapInstance?.flyTo(
      [
        location.lat,
        location.lng
      ],
      DEFAULT_ZOOM,
      {
        duration: 0.8
      }
    )
  } catch (error) {
    console.warn(
      '현재 위치 조회 실패:',
      error
    )

    locationPermissionError.value =
      error.message
  }
}

function setCurrentLocationAsStart() {
  if (!userLocation.value) {
    locationPermissionError.value =
      text.value.locationRequired

    return
  }

  clearTransitResult()

  routeStart.value =
    createCurrentRoutePoint(
      userLocation.value
    )

  if (
    routeDestination.value?.type ===
      'current'
  ) {
    routeDestination.value = null
  }
}

function setCurrentLocationAsDestination() {
  if (!userLocation.value) {
    locationPermissionError.value =
      text.value.locationRequired

    return
  }

  clearTransitResult()

  routeDestination.value =
    createCurrentRoutePoint(
      userLocation.value
    )

  if (
    routeStart.value?.type ===
      'current'
  ) {
    routeStart.value = null
  }
}

function swapRoutePoints() {
  clearTransitResult()

  const previousStart =
    routeStart.value

  routeStart.value =
    routeDestination.value

  routeDestination.value =
    previousStart
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

  routeLayer?.clearLayers()
  routeLayer = null 

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
            class="current-location-button"
            @click="focusOnCurrentLocation"
          >
            <svg
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle
                cx="12"
                cy="12"
                r="3"
              />

              <circle
                cx="12"
                cy="12"
                r="8"
              />

              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
            </svg>

            <span>
              {{ text.locateMe }}
            </span>
          </button>

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

        <div
          v-if="userLocation"
          class="current-location-route"
        >
          <div class="current-location-label">
            <span class="current-location-dot">
            </span>

            <div>
              <strong>
                {{ text.myLocation }}
              </strong>

              <small>
                {{
                  userLocation.lat.toFixed(5)
                }},
                {{
                  userLocation.lng.toFixed(5)
                }}
              </small>
            </div>
          </div>

          <div class="current-location-actions">
            <button
              type="button"
              :class="{
                active:
                  routeStart?.type ===
                  'current'
              }"
              @click="
                setCurrentLocationAsStart
              "
            >
              {{ text.setCurrentAsStart }}
            </button>

            <button
              type="button"
              :class="{
                active:
                  routeDestination?.type ===
                  'current'
              }"
              @click="
                setCurrentLocationAsDestination
              "
            >
              {{
                text.setCurrentAsDestination
              }}
            </button>
          </div>
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

      <section class="route-selection-panel">
        <div class="route-point-row">
          <span class="route-point-dot start">
          </span>

          <div class="route-point-copy">
            <small>
              {{ text.start }}
            </small>

            <strong>
              {{
                routeStart
                  ? routePointName(
                      routeStart
                    )
                  : '-'
              }}
            </strong>

            <p v-if="routeStart">
              {{
                routePointAddress(
                  routeStart
                )
              }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="swap-route-button"
          :disabled="
            !routeStart ||
            !routeDestination
          "
          :aria-label="text.swapRoute"
          @click="swapRoutePoints"
        >
          ⇅
        </button>

        <div class="route-point-row">
          <span
            class="
              route-point-dot
              destination
            "
          ></span>

          <div class="route-point-copy">
            <small>
              {{ text.destination }}
            </small>

            <strong>
              {{
                routeDestination
                  ? routePointName(
                      routeDestination
                    )
                  : '-'
              }}
            </strong>

            <p v-if="routeDestination">
              {{
                routePointAddress(
                  routeDestination
                )
              }}
            </p>
          </div>
        </div>

        <div class="route-main-actions">
          <button
            type="button"
            class="clear-route-selection"
            :disabled="
              !routeStart &&
              !routeDestination
            "
            @click="clearRouteSelection"
          >
            {{ text.clearSelection }}
          </button>

          <button
            type="button"
            class="find-route-button"
            :disabled="
              transitLoading ||
              !routeStart ||
              !routeDestination
            "
            @click="searchTransitRoutes"
          >
            <span
              v-if="transitLoading"
              class="button-spinner"
            ></span>

            <span v-else>
              🚇
            </span>

            {{
              transitLoading
                ? text.routeLoading
                : text.findTransitRoute
            }}
          </button>
        </div>
      </section>

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
                  ] ||
                  text.categories.attraction
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

              {{ displayAddress(selectedPlace) }}
            </p>

            <!-- 출발·도착 선택 버튼 -->
            <div class="route-place-buttons">
              <button
                type="button"
                class="route-place-button"
                :class="{
                  active: isRouteStart(
                    selectedPlace
                  )
                }"
                @click.stop="
                  setPlaceAsStart(
                    selectedPlace
                  )
                "
              >
                <span
                  class="
                    route-button-dot
                    start
                  "
                ></span>

                {{
                  locale === 'en'
                    ? 'Set as start'
                    : '출발지로'
                }}
              </button>

              <button
                type="button"
                class="route-place-button"
                :class="{
                  active:
                    isRouteDestination(
                      selectedPlace
                    )
                }"
                @click.stop="
                  setPlaceAsDestination(
                    selectedPlace
                  )
                "
              >
                <span
                  class="
                    route-button-dot
                    destination
                  "
                ></span>

                {{
                  locale === 'en'
                    ? 'Set as destination'
                    : '도착지로'
                }}
              </button>
            </div>

            <!-- 선택 상태 표시 -->
            <div
              v-if="
                isRouteStart(selectedPlace) ||
                isRouteDestination(
                  selectedPlace
                )
              "
              class="route-selected-message"
            >
              <span
                v-if="
                  isRouteStart(
                    selectedPlace
                  )
                "
              >
                🔵
                {{
                  locale === 'en'
                    ? 'Selected as start'
                    : '출발지로 선택됨'
                }}
              </span>

              <span
                v-if="
                  isRouteDestination(
                    selectedPlace
                  )
                "
              >
                🔴
                {{
                  locale === 'en'
                    ? 'Selected as destination'
                    : '도착지로 선택됨'
                }}
              </span>
            </div>

            <!-- 기존 카드 버튼 유지 -->
            <div class="place-actions">
              <button
                type="button"
                class="primary-place-button"
                @click="
                  openCommunity(
                    selectedPlace
                  )
                "
              >
                💬
                {{ text.relatedCommunity }}
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
      
      <section
        v-if="transitPanelOpen"
        class="transit-results-panel"
      >
        <div class="transit-panel-header">
          <div>
            <span class="transit-panel-badge">
              🚇
              {{ text.transitDirections }}
            </span>

            <h2>
              {{
                routeStart
                  ? routePointName(routeStart)
                  : text.selectStart
              }}

              <span>→</span>

              {{
                routeDestination
                  ? routePointName(
                      routeDestination
                    )
                  : text.selectDestination
              }}
            </h2>
          </div>

          <button
            type="button"
            class="clear-route-button"
            @click="clearTransitRoute"
          >
            {{ text.clearRoute }}
            <span aria-hidden="true">
              ×
            </span>
          </button>
        </div>

        <div
          v-if="transitLoading"
          class="transit-state"
        >
          <span class="loading-spinner"></span>

          <p>
            {{ text.routeLoading }}
          </p>
        </div>

        <div
          v-else-if="transitError"
          class="transit-state transit-error"
        >
          <span>!</span>

          <p>
            {{ transitError }}
          </p>
        </div>

        <template
          v-else-if="
            transitRoutes.length
          "
        >
          <div class="transit-route-tabs">
            <button
              v-for="
                (routeOption, index)
                in transitRoutes
              "
              :key="routeOption.id"
              type="button"
              class="transit-route-tab"
              :class="{
                active:
                  selectedTransitRouteIndex ===
                  index
              }"
              @click="
                selectTransitRoute(index)
              "
            >
              <span class="route-rank">
                {{ index + 1 }}
              </span>

              <strong>
                {{
                  routeOption.totalTime
                }}
                {{ text.minutes }}
              </strong>

              <small>
                {{
                  formatFare(
                    routeOption.payment
                  )
                }}
                ·
                {{
                  routeOption.transferCount
                }}
                {{ text.transfers }}
              </small>

              <small>
                {{ text.walking }}
                {{
                  formatWalkDistance(
                    routeOption.totalWalk
                  )
                }}
              </small>
            </button>
          </div>

          <div
            v-if="selectedTransitRoute"
            class="transit-route-detail"
          >
            <div class="transit-summary">
              <div>
                <span>
                  {{ text.minutes }}
                </span>

                <strong>
                  {{
                    selectedTransitRoute
                      .totalTime
                  }}
                </strong>
              </div>

              <div>
                <span>
                  {{ text.fare }}
                </span>

                <strong>
                  {{
                    formatFare(
                      selectedTransitRoute
                        .payment
                    )
                  }}
                </strong>
              </div>

              <div>
                <span>
                  {{ text.transfers }}
                </span>

                <strong>
                  {{
                    selectedTransitRoute
                      .transferCount
                  }}
                </strong>
              </div>

              <div>
                <span>
                  {{ text.walking }}
                </span>

                <strong>
                  {{
                    formatWalkDistance(
                      selectedTransitRoute
                        .totalWalk
                    )
                  }}
                </strong>
              </div>
            </div>

            <div class="transit-step-list">
              <div class="transit-end-point">
                <span class="endpoint-dot start"></span>

                <div>
                  <small>
                    {{ text.startPoint }}
                  </small>

                  <strong>
                    {{
                      routeStart
                        ? routePointName(
                            routeStart
                          )
                        : '-'
                    }}
                  </strong>
                </div>
              </div>

              <article
                v-for="
                  step in
                  selectedTransitRoute.steps
                "
                :key="step.id"
                class="transit-step"
                :class="
                  `mode-${step.mode}`
                "
              >
                <span class="step-icon">
                  {{ step.icon }}
                </span>

                <div class="step-content">
                  <div class="step-heading">
                    <strong>
                      {{ step.line }}
                    </strong>

                    <span>
                      {{ step.time }}
                      {{ text.minutes }}
                    </span>
                  </div>

                  <p
                    v-if="
                      step.start ||
                      step.end
                    "
                  >
                    {{ step.start }}
                    <span>→</span>
                    {{ step.end }}
                  </p>

                  <p
                    v-if="
                      step.mode === 'walk'
                    "
                  >
                    {{
                      formatWalkDistance(
                        step.distance
                      )
                    }}
                  </p>

                  <small
                    v-if="
                      step.stationCount
                    "
                  >
                    {{
                      step.stationCount
                    }}
                    {{
                      locale === 'en'
                        ? 'stops'
                        : '개 정류장'
                    }}
                  </small>
                </div>
              </article>

              <div class="transit-end-point">
                <span class="endpoint-dot end"></span>

                <div>
                  <small>
                    {{ text.destinationPoint }}
                  </small>

                  <strong>
                    {{
                      routeDestination
                        ? routePointName(
                            routeDestination
                          )
                        : '-'
                    }}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </template>
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
  height: 145px;
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

.current-location-button {
  display: inline-flex;
  height: 43px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 12px;
  color: #fff;
  font-size: 10px;
  font-weight: 850;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #5362ee
    );
  border: 0;
  border-radius: 13px;
  box-shadow:
    0 6px 14px
    rgba(37, 99, 235, 0.2);
  cursor: pointer;
}

.transit-search-button {
  display: flex;
  width: 100%;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 11px;
  padding: 0 12px;
  color: #fff;
  font-size: 10px;
  font-weight: 850;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #7c3aed
    );
  border: 0;
  border-radius: 11px;
  box-shadow:
    0 7px 16px
    rgba(83, 98, 238, 0.23);
  cursor: pointer;
}

.transit-search-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.button-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid
    rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation:
    spin 0.7s linear infinite;
}

.transit-results-panel {
  margin-top: 16px;
  padding: 18px;
  background: #fff;
  border: 1px solid #e0e5ed;
  border-radius: 21px;
  box-shadow:
    0 10px 28px
    rgba(24, 35, 59, 0.09);
}

.transit-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.transit-panel-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  color: #5362ee;
  font-size: 9px;
  font-weight: 850;
  background: #eef0ff;
  border-radius: 999px;
}

.transit-panel-header h2 {
  margin: 9px 0 0;
  color: #263149;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.4;
}

.transit-panel-header h2 span {
  margin: 0 6px;
  color: #9aa4b5;
}

.clear-route-button {
  display: inline-flex;
  min-height: 35px;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  color: #68758a;
  font-size: 9px;
  font-weight: 800;
  background: #f6f7fa;
  border: 1px solid #e1e5ec;
  border-radius: 10px;
  cursor: pointer;
}

.clear-route-button span {
  font-size: 16px;
}

.transit-state {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #758196;
  font-size: 11px;
}

.transit-state p {
  margin: 0;
}

.transit-error > span {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  color: #d95763;
  font-weight: 900;
  background: #fff0f2;
  border-radius: 11px;
}

.transit-error p {
  color: #d95763;
}

.transit-route-tabs {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-top: 17px;
}

.transit-route-tab {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 103px;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px;
  color: #6e7a8e;
  text-align: left;
  background: #f8f9fc;
  border: 1px solid #e3e7ef;
  border-radius: 14px;
  cursor: pointer;
}

.transit-route-tab.active {
  color: #5362ee;
  background: #f1f3ff;
  border-color: #8993ef;
  box-shadow:
    0 7px 18px
    rgba(83, 98, 238, 0.13);
}

.route-rank {
  position: absolute;
  top: 9px;
  right: 9px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  color: #fff;
  font-size: 8px;
  font-weight: 900;
  background: #5362ee;
  border-radius: 50%;
}

.transit-route-tab strong {
  padding-right: 22px;
  color: #263149;
  font-size: 17px;
  font-weight: 900;
}

.transit-route-tab small {
  margin-top: 5px;
  font-size: 9px;
  line-height: 1.35;
}

.transit-route-detail {
  margin-top: 14px;
  padding: 15px;
  background: #f8f9fc;
  border: 1px solid #e5e8ef;
  border-radius: 16px;
}

.transit-summary {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.transit-summary > div {
  padding: 10px;
  background: #fff;
  border: 1px solid #e5e8ef;
  border-radius: 11px;
}

.transit-summary span {
  display: block;
  color: #929caf;
  font-size: 8px;
  font-weight: 750;
}

.transit-summary strong {
  display: block;
  margin-top: 4px;
  color: #354057;
  font-size: 12px;
  font-weight: 900;
}

.transit-step-list {
  margin-top: 14px;
  padding: 13px;
  background: #fff;
  border: 1px solid #e5e8ef;
  border-radius: 13px;
}

.transit-end-point {
  display: flex;
  align-items: center;
  gap: 9px;
}

.transit-end-point > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.transit-end-point small {
  color: #939daf;
  font-size: 8px;
  font-weight: 750;
}

.transit-end-point strong {
  margin-top: 2px;
  overflow: hidden;
  color: #344057;
  font-size: 11px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endpoint-dot {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  background: #fff;
  border: 4px solid;
  border-radius: 50%;
}

.endpoint-dot.start {
  border-color: #2563eb;
}

.endpoint-dot.end {
  border-color: #ef4444;
}

.transit-step {
  display: grid;
  grid-template-columns:
    34px minmax(0, 1fr);
  gap: 9px;
  margin: 8px 0;
  padding: 10px 0 10px 4px;
  border-left: 2px solid #e0e4ec;
}

.step-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  font-size: 15px;
  background: #f1f3f8;
  border-radius: 9px;
}

.mode-bus .step-icon {
  background: #eaf2ff;
}

.mode-subway .step-icon {
  background: #f2ebff;
}

.mode-walk .step-icon {
  background: #f1f3f5;
}

.step-content {
  min-width: 0;
}

.step-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.step-heading strong {
  overflow: hidden;
  color: #344057;
  font-size: 11px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-heading > span {
  flex-shrink: 0;
  color: #5362ee;
  font-size: 9px;
  font-weight: 850;
}

.step-content p {
  margin: 5px 0 0;
  color: #778398;
  font-size: 9px;
  line-height: 1.45;
}

.step-content p span {
  margin: 0 4px;
  color: #a0a9b8;
}

.step-content small {
  display: block;
  margin-top: 4px;
  color: #9aa4b4;
  font-size: 8px;
}

.route-place-buttons {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 10px;
}

.route-place-buttons button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #657187;
  font-size: 9px;
  font-weight: 850;
  background: #fff;
  border: 1px solid #dfe4ed;
  border-radius: 10px;
  cursor: pointer;
}

.route-place-buttons button.active {
  color: #5362ee;
  background: #eef0ff;
  border-color: #8791ec;
}

.route-button-dot {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border: 3px solid;
  border-radius: 50%;
}

.route-button-dot.start {
  border-color: #2563eb;
}

.route-button-dot.destination {
  border-color: #ef4444;
}

.current-location-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
  padding: 10px 11px;
  background: #f7f9ff;
  border: 1px solid #dfe5fa;
  border-radius: 13px;
}

.current-location-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.current-location-dot {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  background: #2563eb;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow:
    0 0 0 2px
    rgba(37, 99, 235, 0.2);
}

.current-location-label > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.current-location-label strong {
  color: #354057;
  font-size: 10px;
  font-weight: 900;
}

.current-location-label small {
  margin-top: 2px;
  color: #8b96a8;
  font-size: 8px;
}

.current-location-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.current-location-actions button {
  min-height: 31px;
  padding: 0 9px;
  color: #5362ee;
  font-size: 8px;
  font-weight: 850;
  background: #fff;
  border: 1px solid #dfe3fa;
  border-radius: 9px;
  cursor: pointer;
}

.current-location-actions button.active {
  color: #fff;
  background: #5362ee;
  border-color: #5362ee;
}

.route-selection-panel {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto
    minmax(0, 1fr)
    auto;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 13px;
  background: #fff;
  border: 1px solid #e0e5ed;
  border-radius: 17px;
  box-shadow:
    0 8px 22px
    rgba(24, 35, 59, 0.08);
}

.route-point-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.route-point-dot {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  background: #fff;
  border: 4px solid;
  border-radius: 50%;
}

.route-point-dot.start {
  border-color: #2563eb;
}

.route-point-dot.destination {
  border-color: #ef4444;
}

.route-point-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.route-point-copy small {
  color: #939daf;
  font-size: 8px;
  font-weight: 750;
}

.route-point-copy strong {
  margin-top: 2px;
  overflow: hidden;
  color: #354057;
  font-size: 11px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-point-copy p {
  margin: 3px 0 0;
  overflow: hidden;
  color: #929cad;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.swap-route-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  padding: 0;
  color: #5362ee;
  font-size: 17px;
  font-weight: 900;
  background: #eef0ff;
  border: 1px solid #dfe3fa;
  border-radius: 10px;
  cursor: pointer;
}

.swap-route-button:disabled {
  cursor: default;
  opacity: 0.4;
}

.route-main-actions {
  display: flex;
  gap: 7px;
}

.clear-route-selection,
.find-route-button {
  min-height: 38px;
  padding: 0 11px;
  font-size: 9px;
  font-weight: 850;
  border-radius: 10px;
  cursor: pointer;
}

.clear-route-selection {
  color: #657187;
  background: #f6f7fa;
  border: 1px solid #e1e5ec;
}

.find-route-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #fff;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #7c3aed
    );
  border: 0;
}

.clear-route-selection:disabled,
.find-route-button:disabled {
  cursor: default;
  opacity: 0.45;
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
    width: 470px;
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
    grid-template-columns: 82px minmax(0, 1fr);
  }

  .selected-place-image,
  .selected-place-placeholder {
    width: 82px;
    height: 145px;
  }

  .place-actions {
    flex-wrap: wrap;
  }

  .primary-place-button,
  .secondary-place-button {
    flex: 1;
  }

  .current-location-button {
    width: 43px;
    padding: 0;
  }

  .current-location-button span {
    display: none;
  }

  .transit-results-panel {
    padding: 14px;
  }

  .transit-panel-header h2 {
    font-size: 14px;
  }

  .transit-route-tabs {
    display: flex;
    overflow-x: auto;
  }

  .transit-route-tab {
    width: 165px;
    flex-shrink: 0;
  }

  .transit-summary {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}
</style>