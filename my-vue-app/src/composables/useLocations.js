// src/composables/useLocations.js

import axios from 'axios'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json'
  }
})

const CATEGORY_BY_CONTENT_TYPE = {
  12: 'attraction',
  14: 'culture',
  15: 'festival',
  25: 'course',
  28: 'leisure',
  32: 'accommodation',
  38: 'shopping',
  39: 'restaurant'
}

async function requestGet(
  path,
  params = {}
) {
  try {
    const response = await api.get(
      `/api/v1${path}`,
      {
        params
      }
    )

    return response.data
  } catch (error) {
    console.error(
      '장소 API 요청 실패:',
      {
        url: `${API_BASE_URL}/api/v1${path}`,
        params,
        error
      }
    )

    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      '장소 API 요청에 실패했습니다.'

    throw new Error(message)
  }
}

/**
 * 숫자로 변환할 수 없으면 null 반환
 */
function toNumber(value) {
  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

/**
 * 주소에서 서울 자치구 추출
 *
 * 예:
 * 서울특별시 종로구 인사동길 10
 * -> 종로구
 */
function extractDistrict(address = '') {
  const match = String(address).match(
    /서울(?:특별시)?\s+([가-힣]+구)/
  )

  return match?.[1] || ''
}

/**
 * 태그 데이터 형식 통일
 */
function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .map((tag) => {
      if (typeof tag === 'string') {
        return tag
      }

      return (
        tag.code ||
        tag.name ||
        tag.label ||
        tag.label_ko ||
        tag.label_en ||
        ''
      )
    })
    .filter(Boolean)
}

/**
 * 백엔드 장소 데이터를
 * 프론트엔드 공통 형식으로 변환
 *
 * 백엔드 정규화 필드와
 * TourAPI 원본 필드를 모두 지원한다.
 */
export function normalizeLocation(
  item,
  index = 0
) {
  const contentTypeId = Number(
    item.content_type_id ??
      item.contenttypeid ??
      item.contentTypeId
  )

  const address =
    item.address ||
    item.addr1 ||
    ''

  const id =
    item.id ??
    item.location_id ??
    item.contentid ??
    item.source_id ??
    `location-${index}`

  return {
    id: String(id),

    sourceId: String(
      item.source_id ??
      item.contentid ??
      id
    ),

    category:
      item.category ||
      CATEGORY_BY_CONTENT_TYPE[
        contentTypeId
      ] ||
      'attraction',

    contentTypeId,

    title:
      item.title ||
      item.name ||
      '',

    titleEn:
      item.title_en ||
      item.name_en ||
      '',

    address,

    addressDetail:
      item.address_detail ||
      item.addr2 ||
      '',

    district:
      item.district ||
      extractDistrict(address),

    lat: toNumber(
      item.lat ??
        item.latitude ??
        item.mapy
    ),

    lng: toNumber(
      item.lng ??
        item.longitude ??
        item.mapx
    ),

    image:
      item.image_url ||
      item.firstimage ||
      item.thumbnail_url ||
      '',

    thumbnail:
      item.thumbnail_url ||
      item.firstimage2 ||
      item.image_url ||
      item.firstimage ||
      '',

    description:
      item.description ||
      item.overview ||
      '',

    telephone:
      item.telephone ||
      item.tel ||
      '',

    homepageUrl:
      item.homepage_url ||
      item.homepage ||
      '',

    tags: normalizeTags(item.tags),

    viewCount: Number(
      item.view_count ??
        item.views ??
        0
    ),

    raw: item
  }
}

/**
 * 목록 API 응답 형식 통일
 *
 * 다음 형태를 모두 지원한다.
 *
 * 1. { items: [...] }
 * 2. { results: [...] }
 * 3. { data: [...] }
 * 4. [...]
 */
function normalizeLocationPage(
  responseData,
  requestedPage,
  requestedSize
) {
  const rawItems = Array.isArray(
    responseData
  )
    ? responseData
    : responseData.items ||
      responseData.results ||
      responseData.data ||
      []

  const items = rawItems.map(
    (item, index) =>
      normalizeLocation(item, index)
  )

  const page = Number(
    responseData.page ??
      requestedPage
  )

  const size = Number(
    responseData.size ??
      responseData.page_size ??
      requestedSize
  )

  const hasTotal =
    responseData.total !== undefined

  const total = Number(
    responseData.total ??
      items.length
  )

  const explicitTotalPages =
    responseData.total_pages ??
    responseData.totalPages

  const totalPages =
    explicitTotalPages !== undefined
      ? Number(explicitTotalPages)
      : hasTotal
        ? Math.max(
            1,
            Math.ceil(
              total / Math.max(size, 1)
            )
          )
        : page

  let hasNext = false

  if (
    responseData.has_next !==
    undefined
  ) {
    hasNext = Boolean(
      responseData.has_next
    )
  } else if (
    responseData.next_page !==
    undefined
  ) {
    hasNext = Boolean(
      responseData.next_page
    )
  } else if (
    explicitTotalPages !== undefined
  ) {
    hasNext =
      page < Number(explicitTotalPages)
  } else if (hasTotal) {
    hasNext =
      page * size < total
  } else {
    // 전체 개수 정보가 없으면
    // 요청한 개수만큼 반환됐을 때
    // 다음 페이지가 있다고 판단한다.
    hasNext =
      rawItems.length === requestedSize
  }

  return {
    items,
    page,
    size,
    total,
    totalPages,
    hasNext
  }
}

export default function useLocations() {
  /**
   * 장소 목록 한 페이지 조회
   *
   * GET /api/v1/locations
   */
  async function fetchLocations(
    params = {}
  ) {
    const page = Number(
      params.page || 1
    )

    const size = Number(
      params.size || 24
    )

    const responseData =
      await requestGet(
        '/locations',
        {
          district: params.district,
          q: params.q,
          page,
          size,
          tag: params.tag,

          // 백엔드가 category를 지원하면 사용되고,
          // 현재 지원하지 않으면 FastAPI에서 무시된다.
          category: params.category
        }
      )

    return normalizeLocationPage(
      responseData,
      page,
      size
    )
  }

  /**
   * 전체 장소를 페이지별로 반복 조회
   *
   * Locations.vue에서 전체 데이터를
   * 불러올 때 사용한다.
   */
  async function fetchAllLocations({
    district,
    q,
    tag,
    category,
    pageSize = 500,
    maxItems = 10000,
    onProgress
  } = {}) {
    const collectedItems = []
    const usedIds = new Set()

    let currentPage = 1
    let total = 0
    let hasNext = true

    while (
      hasNext &&
      collectedItems.length < maxItems
    ) {
      const result =
        await fetchLocations({
          district,
          q,
          tag,
          category,
          page: currentPage,
          size: pageSize
        })

      total = result.total

      result.items.forEach(
        (item) => {
          if (!usedIds.has(item.id)) {
            usedIds.add(item.id)
            collectedItems.push(item)
          }
        }
      )

      onProgress?.({
        loaded:
          collectedItems.length,
        total,
        page: currentPage,
        totalPages:
          result.totalPages
      })

      hasNext =
        result.hasNext &&
        result.items.length > 0

      currentPage += 1
    }

    return {
      items: collectedItems.slice(
        0,
        maxItems
      ),

      loaded: Math.min(
        collectedItems.length,
        maxItems
      ),

      total,

      truncated:
        total > maxItems ||
        collectedItems.length >
          maxItems
    }
  }

  /**
   * 장소 상세 조회
   *
   * GET /api/v1/locations/{location_id}
   */
  async function fetchLocation(
    locationId
  ) {
    if (!locationId) {
      throw new Error(
        'locationId가 필요합니다.'
      )
    }

    const responseData =
      await requestGet(
        `/locations/${locationId}`
      )

    return normalizeLocation(
      responseData
    )
  }

  return {
    fetchLocations,
    fetchAllLocations,
    fetchLocation
  }
}