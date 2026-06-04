self.addEventListener('push', e => {
    const data = e.data.json();
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200]
    });
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            if (windowClients.length > 0) return windowClients[0].focus();
            else return clients.openWindow('/');
        })
    );
});