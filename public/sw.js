const CACHE = 'wc26-v7'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  var url = e.request.url
  // NEVER intercept auth, Supabase, or API calls - these must always hit the network
  // directly so token refresh and live data work correctly.
  if (
    url.includes('supabase.co') ||
    url.includes('/auth/') ||
    url.includes('/api/') ||
    url.includes('/rest/') ||
    e.request.method !== 'GET'
  ) {
    return // let the browser handle it normally, no SW involvement
  }

  // For everything else (app shell, assets): network first, cache fallback when offline
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        var clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return res
    }).catch(() => caches.match(e.request))
  )
})
