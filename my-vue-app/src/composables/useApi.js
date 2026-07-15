// src/composables/useApi.js
// src/composables/useApi.js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  // Log helpful hint so frontend shows where requests will go
  // If this is empty, axios will send requests relative to the current origin.
  // Place a `.env` with `VITE_API_BASE_URL` inside `my-vue-app/` and restart Vite.
  console.warn('VITE_API_BASE_URL is not defined — requests will use the current origin.')
} else {
  console.debug('VITE_API_BASE_URL=', API_BASE_URL)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
})
// 공통 에러/응답 처리 훅
async function safe(fn) {
  try {
    const r = await fn()
    return [null, r]
  } catch (err) {
    return [err, null]
  }
}

export default function useApi() {
  // Locations
  const fetchLocations = (params) => api.get('/api/v1/locations', { params }).then(r => r.data)
  const fetchLocation = (id) => api.get(`/api/v1/locations/${id}`).then(r => r.data)

  // Posts (커뮤니티)
  const fetchPosts = (params) => api.get('/api/v1/posts', { params }).then(r => r.data)
  const fetchPost = (id) => api.get(`/api/v1/posts/${id}`).then(r => r.data)
  const createPost = (body) => api.post('/api/v1/posts', body).then(r => r.data)
  const updatePost = (id, body) => api.put(`/api/v1/posts/${id}`, body).then(r => r.data)
  const deletePost = (id, body) => api.delete(`/api/v1/posts/${id}`, { data: body }).then(r => r.data)

  // Tags
  const fetchTags = () => api.get('/api/v1/tags').then(r => r.data)

  // Chat
  const postChat = (body) => api.post('/api/v1/chat', body).then(r => r.data)

  // Comments
  const createComment = (postId, body) => api.post(`/api/v1/posts/${postId}/comments`, body).then(r => r.data)
  const updateComment = (postId, commentId, body) => api.put(`/api/v1/posts/${postId}/comments/${commentId}`, body).then(r => r.data)
  const deleteComment = (postId, commentId, body) => api.delete(`/api/v1/posts/${postId}/comments/${commentId}`, { data: body }).then(r => r.data)

  // Health
  const health = () => api.get('/api/v1/health').then(r => r.data)

  return {
    // safe wrappers
    safe,
    baseURL: API_BASE_URL,
    fetchLocations, fetchLocation,
    fetchPosts, fetchPost, createPost, updatePost, deletePost,
    fetchTags,
    postChat,
    createComment, updateComment, deleteComment,
    health
  }
}