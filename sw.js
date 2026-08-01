/* ==========================================================================
   Djado — Service Worker
   Met l'application en cache pour qu'elle fonctionne sans connexion internet
   après la première ouverture.
   ========================================================================== */

const NOM_CACHE = 'djado-v2';

const FICHIERS_A_METTRE_EN_CACHE = [
  './',
  './index.html',
  './icon-180.png',
  './icon-32.png'
];

// Installation : télécharge et enregistre les fichiers de l'application
self.addEventListener('install', (evenement) => {
  self.skipWaiting();
  evenement.waitUntil(
    caches.open(NOM_CACHE).then((cache) => cache.addAll(FICHIERS_A_METTRE_EN_CACHE))
  );
});

// Activation : supprime les anciennes versions du cache si l'app est mise à jour
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(
        noms.filter((nom) => nom !== NOM_CACHE).map((nom) => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

// Requêtes : sert le cache en priorité (l'app se charge même hors ligne),
// et se met à jour discrètement en arrière-plan si une connexion est disponible.
// Les appels vers Supabase (autre domaine) passent directement par le réseau.
self.addEventListener('fetch', (evenement) => {
  const url = new URL(evenement.request.url);

  // Ne jamais intercepter les appels vers Supabase : ils doivent toujours
  // aller sur le réseau (et échouer proprement si hors ligne).
  if (url.origin !== self.location.origin){
    return;
  }

  evenement.respondWith(
    caches.match(evenement.request).then((reponseEnCache) => {
      const requeteReseau = fetch(evenement.request)
        .then((reponseReseau) => {
          caches.open(NOM_CACHE).then((cache) => {
            cache.put(evenement.request, reponseReseau.clone());
          });
          return reponseReseau;
        })
        .catch(() => reponseEnCache);

      return reponseEnCache || requeteReseau;
    })
  );
});
