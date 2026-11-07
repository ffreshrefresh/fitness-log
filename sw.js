'use strict';
// Bump this version whenever any shell asset changes.
const CACHE='fitness-log-v2';
const SHELL=['./','./index.html','./app.js','./app.css','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./fonts/barlow-400-latin-ext.woff2','./fonts/barlow-400-latin.woff2','./fonts/barlow-500-latin-ext.woff2','./fonts/barlow-500-latin.woff2','./fonts/barlow-600-latin-ext.woff2','./fonts/barlow-600-latin.woff2','./fonts/barlow-condensed-500-latin-ext.woff2','./fonts/barlow-condensed-500-latin.woff2','./fonts/barlow-condensed-600-latin-ext.woff2','./fonts/barlow-condensed-600-latin.woff2','./fonts/barlow-condensed-700-latin-ext.woff2','./fonts/barlow-condensed-700-latin.woff2','./fonts/jetbrains-mono-400-latin-ext.woff2','./fonts/jetbrains-mono-400-latin.woff2'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(path,{cache:'reload'})))));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fitness-log-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached;
    if(event.request.mode==='navigate'){try{return await fetch(event.request);}catch(_){return cache.match('./index.html');}}
    return fetch(event.request);
  }));
});
