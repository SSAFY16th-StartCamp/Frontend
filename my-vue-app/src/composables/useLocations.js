// src/composables/useLocations.js

import axios from 'axios'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:8000'
).replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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

async function requestGet(path, params = {}) {
  const requestUrl = `/api/v1${path}`

  try {
    console.log('장소 API 요청:', {
      baseURL: API_BASE_URL,
      url: requestUrl,
      params
    })

    const response = await api.get(
      requestUrl,
      {
        params
      }
    )

    console.log('장소 API 응답:', response.data)

    return response.data
  } catch (error) {
    const status =
      error.response?.status

    const responseData =
      error.response?.data

    console.error('장소 API 요청 실패:', {
      fullUrl:
        `${API_BASE_URL}${requestUrl}`,
      status,
      params,
      responseData,
      message: error.message
    })

    let message =
      responseData?.detail ||
      responseData?.message ||
      error.message ||
      '장소 API 요청에 실패했습니다.'

    if (
      Array.isArray(
        responseData?.detail
      )
    ) {
      message = responseData.detail
        .map((detail) => {
          const field =
            detail.loc?.join('.') ||
            'request'

          return `${field}: ${detail.msg}`
        })
        .join('\n')
    }

    const requestError =
      new Error(message)

    requestError.status = status
    requestError.responseData =
      responseData

    throw requestError
  }
}

function toNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number)
    ? number
    : null
}

function extractDistrict(address = '') {
  const match = String(address).match(
    /서울(?:특별시)?\s+([가-힣]+구)/
  )

  return match?.[1] || ''
}

function extractEnglishDistrict(address = '') {
  const match = String(address).match(
    /([A-Za-z]+(?:-[A-Za-z]+)*-gu)/i
  )

  return match?.[1] || ''
}

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

export function normalizeLocation(
  item,
  index = 0
) {
  if (!item || typeof item !== 'object') {
    return {
      id: `location-${index}`,
      sourceId: `location-${index}`,
      category: 'attraction',
      contentTypeId: null,
      title: '',
      titleEn: '',
      address: '',
      addressEn: '',
      addressDetail: '',
      district: '',
      districtEn: '',
      lat: null,
      lng: null,
      image: '',
      thumbnail: '',
      description: '',
      descriptionEn: '',
      telephone: '',
      zipcode: '',
      homepageUrl: '',
      tags: [],
      viewCount: 0,
      raw: {}
    }
  }

  const contentTypeId = Number(
    item.content_type_id ??
      item.contenttypeid ??
      item.contentTypeId
  )

  const koAddress =
    item.ko_address ||
    item.address ||
    item.addr1 ||
    item.addr ||
    ''

  const enAddress =
    item.en_address ||
    item.address_en ||
    item.addr1_en ||
    item.addressEn ||
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
      item.KO_NAME ||
      item.EN_NAME ||
      '',

    titleEn:
      item.title_en ||
      item.name_en ||
      item.EN_NAME ||
      item.titleEn ||
      '',

    address: koAddress,

    addressEn: enAddress,

    koAddress,

    enAddress,

    addressDetail:
      item.address_detail ||
      item.addr2 ||
      '',

    district:
      item.district ||
      extractDistrict(koAddress),

    districtEn:
      item.district_en ||
      item.districtEn ||
      extractEnglishDistrict(enAddress),

    lat: toNumber(
      item.lat ??
        item.latitude ??
        item.mapy ??
        item.LAT ??
        item.latitude_gps
    ),

    lng: toNumber(
      item.lng ??
        item.longitude ??
        item.mapx ??
        item.LON ??
        item.longitude_gps
    ),

    image:
      item.image_url ||
      item.image_url2 ||
      item.firstimage ||
      item.thumbnail_url ||
      '',

    thumbnail:
      item.thumbnail_url ||
      item.firstimage2 ||
      item.image_url2 ||
      item.image_url ||
      item.firstimage ||
      '',

    description:
      item.description ||
      item.overview ||
      '',

    descriptionEn:
      item.description_en ||
      item.overview_en ||
      '',

    telephone:
      item.telephone ||
      item.tel ||
      item.TEL ||
      '',

    zipcode:
      item.zipcode ||
      item.postal_code ||
      item.postal ||
      '',

    homepageUrl:
      item.homepage_url ||
      item.homepage ||
      item.website ||
      item.url ||
      '',

    tags: normalizeTags(
      item.tags
    ),

    viewCount: Number(
      item.view_count ??
        item.views ??
        0
    ),

    raw: item
  }
}

function findRawItems(responseData) {
  if (Array.isArray(responseData)) {
    return responseData
  }

  if (
    Array.isArray(
      responseData?.items
    )
  ) {
    return responseData.items
  }

  if (
    Array.isArray(
      responseData?.results
    )
  ) {
    return responseData.results
  }

  if (
    Array.isArray(
      responseData?.locations
    )
  ) {
    return responseData.locations
  }

  if (
    Array.isArray(
      responseData?.data
    )
  ) {
    return responseData.data
  }

  if (
    Array.isArray(
      responseData?.data?.items
    )
  ) {
    return responseData.data.items
  }

  if (
    Array.isArray(
      responseData?.data?.results
    )
  ) {
    return responseData.data.results
  }

  return []
}

function findMeta(responseData) {
  if (
    responseData?.data &&
    !Array.isArray(responseData.data) &&
    typeof responseData.data === 'object'
  ) {
    return {
      ...responseData,
      ...responseData.data
    }
  }

  return responseData || {}
}

function normalizeLocationPage(
  responseData,
  requestedPage,
  requestedSize
) {
  const rawItems =
    findRawItems(responseData)

  const meta =
    findMeta(responseData)

  const pagination =
    meta.pagination ||
    meta.meta ||
    {}

  const items = rawItems.map(
    (item, index) =>
      normalizeLocation(
        item,
        index
      )
  )

  const page = Number(
    meta.page ??
      pagination.page ??
      pagination.current_page ??
      requestedPage
  )

  const size = Number(
    meta.size ??
      meta.page_size ??
      pagination.size ??
      pagination.per_page ??
      requestedSize
  )

  const totalValue =
    meta.total ??
    meta.count ??
    pagination.total ??
    pagination.total_count

  const total =
    totalValue !== undefined
      ? Number(totalValue)
      : items.length

  const explicitTotalPages =
    meta.total_pages ??
    meta.totalPages ??
    pagination.total_pages ??
    pagination.last_page

  const totalPages =
    explicitTotalPages !== undefined
      ? Number(explicitTotalPages)
      : totalValue !== undefined
        ? Math.max(
            1,
            Math.ceil(
              total /
                Math.max(size, 1)
            )
          )
        : page

  let hasNext = false

  if (
    meta.has_next !== undefined
  ) {
    hasNext =
      Boolean(meta.has_next)
  } else if (
    pagination.has_next !==
    undefined
  ) {
    hasNext =
      Boolean(
        pagination.has_next
      )
  } else if (
    meta.next_page !== undefined
  ) {
    hasNext =
      Boolean(meta.next_page)
  } else if (
    explicitTotalPages !== undefined
  ) {
    hasNext =
      page < totalPages
  } else if (
    totalValue !== undefined
  ) {
    hasNext =
      page * size < total
  } else {
    hasNext =
      rawItems.length >=
      requestedSize
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
  async function fetchLocations(
    params = {}
  ) {
    const page = Number(
      params.page || 1
    )

    const size = Number(
      params.size || 24
    )

    const query = {
      page,
      size
    }

    if (
      params.district &&
      params.district !== 'all'
    ) {
      query.district =
        params.district
    }

    if (params.q) {
      query.q = params.q
    }

    if (params.tag) {
      query.tag = params.tag
    }

    /*
     * 현재 API 명세에는 category가 없으므로
     * category는 보내지 않는다.
     *
     * 프론트에서 전체 데이터를 받은 뒤
     * category를 필터링한다.
     */

    const responseData =
      await requestGet(
        '/locations',
        query
      )

    return normalizeLocationPage(
      responseData,
      page,
      size
    )
  }

  async function fetchAllLocations({
    district,
    q,
    tag,

    /*
     * 500이 아니라 100으로 제한한다.
     * FastAPI에서 size 최대값을
     * 100으로 제한한 경우 422를 방지한다.
     */
    pageSize = 100,

    maxItems = 10000,
    onProgress
  } = {}) {
    const collectedItems = []
    const usedIds = new Set()

    let currentPage = 1
    let total = 0
    let hasNext = true
    let safetyCount = 0

    while (
      hasNext &&
      collectedItems.length <
        maxItems &&
      safetyCount < 200
    ) {
      safetyCount += 1

      const result =
        await fetchLocations({
          district,
          q,
          tag,
          page: currentPage,
          size: pageSize
        })

      total = result.total

      let addedCount = 0

      result.items.forEach(
        (item) => {
          if (
            !usedIds.has(item.id)
          ) {
            usedIds.add(item.id)
            collectedItems.push(item)
            addedCount += 1
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

      /*
       * 서버가 매번 같은 페이지를
       * 반환하는 경우 무한 요청 방지
       */
      if (
        result.items.length === 0 ||
        addedCount === 0
      ) {
        hasNext = false
        break
      }

      hasNext = result.hasNext
      currentPage += 1
    }

    return {
      items:
        collectedItems.slice(
          0,
          maxItems
        ),

      loaded: Math.min(
        collectedItems.length,
        maxItems
      ),

      total:
        total || collectedItems.length,

      truncated:
        total > maxItems
    }
  }

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

    /*
     * 상세 응답이
     * { data: {...} }인 경우 처리
     */
    const rawLocation =
      responseData?.data &&
      !Array.isArray(responseData.data)
        ? responseData.data
        : responseData

    return normalizeLocation(
      rawLocation
    )
  }

  return {
    fetchLocations,
    fetchAllLocations,
    fetchLocation
  }
}