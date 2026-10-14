// Cache only this public fault document and three branding assets. Never cache
// API responses, normal HTML, media, credentials, uploads, or patient records.
const CACHE="drz-connection-v2";
const ASSETS=["/offline.html","/img/logo/logo-dark-full.webp","/fonts/optimized/dana-regular.woff2","/fonts/optimized/vazir-bold.woff2"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("drz-connection-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
    const request=event.request,url=new URL(request.url);
    if(request.method!=="GET"||url.origin!==self.location.origin)return;
    if(request.mode==="navigate")event.respondWith(fetch(request).catch(async()=>{const page=await caches.match("/offline.html");return page||Response.error();}));
    else if(ASSETS.includes(url.pathname)&&!url.search)event.respondWith(caches.match(request).then(value=>value||fetch(request)));
});
