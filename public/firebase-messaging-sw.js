// This file must be named firebase-messaging-sw.js and be in the public directory.

// Give the service worker access to the Firebase App and Messaging products.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// IMPORTANT: Replace with your project's config. These values are public.
const firebaseConfig = {
  apiKey: "AIzaSyAQKQbRtvvPsuNlCHE0LVGWDyjJfq7hK90",
  authDomain: "bytechat-ffb7c.firebaseapp.com",
  projectId: "bytechat-ffb7c",
  storageBucket: "bytechat-ffb7c.appspot.com",
  messagingSenderId: "681650489425",
  appId: "1:681650489425:web:7cc11609a3afd6ad201070",
  measurementId: "G-S24SSEB19S"
};

firebase.initializeApp(firebaseConfig);


const messaging = firebase.messaging();

// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: '/icon-192x192.png',
    tag: payload.data.chatId, // Use chatId to group notifications
    data: {
        url: payload.data.url // e.g., /chat/chatId
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });
