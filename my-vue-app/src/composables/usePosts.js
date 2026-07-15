const KEY = 'seoul_posts_v1'
function loadAll() {
  return JSON.parse(localStorage.getItem(KEY) || '[]')
}
function saveAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
export default function usePosts() {
  const list = loadAll()
  const all = () => [...list].sort((a,b)=>b.createdAt-a.createdAt)
  function create(post) {
    const id = Date.now().toString()
    list.push({ id, title: post.title, content: post.content, password: post.password||'', createdAt: Date.now() })
    saveAll(list)
  }
  function update(id, { title, content, password }) {
    const idx = list.findIndex(p=>p.id===id)
    if(idx===-1) throw new Error('not found')
    if(list[idx].password !== password) throw new Error('wrong password')
    list[idx].title = title
    list[idx].content = content
    saveAll(list)
  }
  function remove(id, password) {
    const idx = list.findIndex(p=>p.id===id)
    if(idx===-1) throw new Error('not found')
    if(list[idx].password !== password) throw new Error('wrong password')
    list.splice(idx,1); saveAll(list)
  }
  return { all, create, update, remove }
}