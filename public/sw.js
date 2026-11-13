self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'AXIOM OS', body: event.data.text() }
  }

  const title = typeof payload.title === 'string' ? payload.title.slice(0, 80) : 'AXIOM OS'
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 240) : 'Ada pembaruan di AXIOM OS.'
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/#notifications'

  event.waitUntil(self.registration.showNotification(title, {
    body,
    data: { url },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/#notifications', self.location.origin).href

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
    if (existing) {
      existing.navigate(target)
      return existing.focus()
    }
    return self.clients.openWindow(target)
  }))
})
