const CACHE_VERSION = "v4";
const STATIC_CACHE = `edu-static-${CACHE_VERSION}`;
const PAGE_CACHE   = `edu-pages-${CACHE_VERSION}`;
const ALL_CACHES   = [STATIC_CACHE, PAGE_CACHE];

const PRECACHE_URLS = ["/"];

// ── Fully self-contained offline HTML ─────────────────────────────────────────
// No external JS, no chunks, no React. Reads localStorage directly.
// This is returned by the SW when any page fetch fails offline.
function buildOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline – Educational Platform</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#fff;color:#111827;min-height:100vh}
  .dark-body{background:#0d0d1a;color:#f3f4f6}
  /* Header */
  .hdr{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid #f3f4f6;padding:12px 16px}
  .hdr-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .logo-pill{display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:12px;border:1px solid #e5e7eb;font-weight:700;font-size:14px}
  .off-badge{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid #fecaca;background:#fef2f2;font-size:12px;font-weight:700;color:#dc2626}
  .reconnect-btn{font-size:12px;font-weight:600;padding:6px 14px;border-radius:10px;border:1px solid #e5e7eb;background:none;cursor:pointer;color:#374151}
  /* Hero */
  .hero{max-width:900px;margin:0 auto;padding:32px 16px 16px;text-align:center}
  .off-mode-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;border:1px solid #fecaca;background:#fef2f2;margin-bottom:20px}
  .off-dot{width:8px;height:8px;border-radius:50%;background:#ef4444}
  .hero h1{font-size:clamp(1.75rem,5vw,3rem);font-weight:800;margin-bottom:12px}
  .hero h1 span{color:#ef4444}
  .hero p{font-size:16px;color:#6b7280;max-width:480px;margin:0 auto 24px;line-height:1.6}
  .try-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:12px;border:none;background:linear-gradient(90deg,#7a12fa,#b614ef);color:#fff;font-size:14px;font-weight:700;cursor:pointer}
  /* Downloads */
  .section{max-width:900px;margin:0 auto;padding:16px 16px 60px}
  .section-hdr{display:flex;align-items:center;gap:10px;margin-bottom:20px}
  .section-hdr h2{font-size:24px;font-weight:800}
  .section-hdr h2 span{color:#7c3aed}
  .count-pill{padding:2px 10px;border-radius:20px;background:#ede9fe;font-size:12px;font-weight:700;color:#6d28d9}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
  /* Card */
  .card{border-radius:16px;border:1px solid #e5e7eb;padding:16px;cursor:pointer;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:border-color .15s}
  .card:hover{border-color:#a78bfa}
  .card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}
  .card-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#7a12fa,#b614ef);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .card-title{font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .card-sub{font-size:12px;color:#6b7280;margin-top:2px}
  .readable-badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;background:#dcfce7;color:#15803d}
  .text-badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px;background:#fef3c7;color:#92400e}
  .topic-row{display:flex;align-items:center;gap:8px;padding:4px 8px}
  .topic-dot{width:6px;height:6px;border-radius:50%;background:#a78bfa;flex-shrink:0}
  .topic-name{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
  .topic-type{font-size:10px;color:#9ca3af;text-transform:uppercase}
  .more-link{font-size:12px;color:#7c3aed;font-weight:600;margin:6px 0 0 8px;cursor:pointer}
  .card-footer{margin-top:12px;padding-top:10px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center}
  .card-date{font-size:11px;color:#9ca3af}
  .open-btn{font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;border:none;background:linear-gradient(90deg,#7a12fa,#b614ef);color:#fff;cursor:pointer}
  /* Empty */
  .empty{text-align:center;padding:60px 16px}
  .empty-icon{font-size:48px;margin-bottom:16px}
  .empty h3{font-size:20px;font-weight:700;margin-bottom:8px}
  .empty p{color:#6b7280;font-size:14px;max-width:300px;margin:0 auto;line-height:1.6}
  /* Reader */
  .reader{min-height:100vh;display:flex;flex-direction:column}
  .reader-hdr{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;align-items:center;gap:12px}
  .back-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;border:1px solid #e5e7eb;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#374151;white-space:nowrap}
  .reader-title{flex:1;font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mob-toggle{padding:10px 16px;border-bottom:1px solid #f3f4f6}
  .mob-toggle button{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#374151;background:none;border:none;cursor:pointer}
  .reader-body{display:flex;flex:1}
  .sidebar{width:240px;padding:20px 12px;border-right:1px solid #f3f4f6;background:#f9fafb;flex-shrink:0}
  .sidebar-inner{background:#d4d4d4;border-radius:16px;padding:10px}
  .sidebar-label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding:0 4px;display:block}
  .topic-btn{width:100%;text-align:left;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:500;margin-bottom:4px;display:flex;align-items:center;gap:8px;border:none}
  .topic-btn.active{border:1px solid #c4b5fd !important;background:#ede9fe;color:#6d28d9}
  .topic-btn.inactive{border:1px solid transparent;background:#fff;color:#374151}
  .t-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .main-content{flex:1;padding:24px 20px;overflow-x:hidden;max-width:740px}
  .breadcrumb{font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
  .content-title{font-size:22px;font-weight:800;color:#111827;margin-bottom:16px}
  /* ai-content styles inline */
  .ai p{font-size:.95rem;line-height:1.6;margin-bottom:.75rem;color:#374151}
  .ai h1,.ai h2{font-weight:800;color:#111827;margin-bottom:.5rem}
  .ai h1{font-size:1.5rem}
  .ai h2{font-size:1.25rem;margin-top:1.5rem}
  .ai h3{font-size:1rem;font-weight:700;margin-top:1rem;margin-bottom:.25rem}
  .ai ul{list-style:disc;margin-left:1.5rem;margin-bottom:.75rem}
  .ai ol{list-style:decimal;margin-left:1.5rem;margin-bottom:.75rem}
  .ai li{font-size:.95rem;line-height:1.6;margin-bottom:.25rem}
  .ai code{background:#f3f4f6;color:#1f2937;padding:.1em .3em;border-radius:3px;font-size:.875em}
  .ai pre{background:#1f2937;color:#e5e7eb;padding:1rem;border-radius:.5rem;overflow-x:auto;font-size:.875rem;margin-bottom:1rem}
  /* Nav */
  .nav-row{display:flex;align-items:center;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb}
  .prev-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1px solid #e5e7eb;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#374151}
  .next-btn{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:none;background:linear-gradient(90deg,#7a12fa,#b614ef);cursor:pointer;font-size:13px;font-weight:600;color:#fff}
  .nav-count{font-size:12px;color:#9ca3af}
  @media(max-width:768px){.sidebar{display:none}.mob-sidebar{display:block !important}}
  .mob-sidebar{display:none;background:#f9fafb;border-bottom:1px solid #f3f4f6;padding:12px}
</style>
</head>
<body>
<div id="app"></div>
<script>
(function(){
// ── Read userId from cookie ──
function getLastUserId(){
  try{
    var c=document.cookie.split(';');
    for(var i=0;i<c.length;i++){
      var t=c[i].trim();
      if(t.startsWith('edu_last_user_id=')){
        return decodeURIComponent(t.slice('edu_last_user_id='.length));
      }
    }
  }catch(e){}
  return null;
}

// ── Read downloads from localStorage ──
function loadDownloads(){
  var userId=getLastUserId();
  if(userId){
    try{
      var r=localStorage.getItem('edu_downloads_'+userId);
      if(r) return JSON.parse(r);
    }catch(e){}
  }
  // Scan all keys
  var all=[];
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k&&k.startsWith('edu_downloads_')){
        var raw=localStorage.getItem(k);
        if(raw) all=all.concat(JSON.parse(raw));
      }
    }
  }catch(e){}
  return all;
}

function groupByModule(downloads){
  var map={};
  downloads.forEach(function(d){
    var key=d.submoduleId!=null?String(d.submoduleId):d.moduleName;
    if(!map[key]) map[key]={submoduleId:d.submoduleId||null,moduleName:d.moduleName,topics:[]};
    map[key].topics.push(d);
  });
  return Object.values(map);
}

function buildTopics(records){
  var byId={};
  records.forEach(function(r){
    if(!byId[r.topicId]||r.fileType==='html') byId[r.topicId]=r;
  });
  return Object.values(byId).sort(function(a,b){return a.topicId-b.topicId;});
}

function parseTxt(content){
  var SEP='================================================================';
  var THIN='----------------------------------------------------------------';
  var safe=function(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
  var sections=content.split(/={10,}/).map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
  var raw=sections.length>=3?sections[2]:(sections[sections.length-1]||content);
  var parts=raw.split(/-{10,}/).map(function(s){return s.trim();}).filter(function(s){return s.length>0;});
  var title='',desc='';
  if(parts.length>=2){title=parts[0].replace(/\\n/g,' ').trim();desc=parts.slice(1).join('\\n\\n').trim();}
  else desc=(parts[0]||raw).trim();
  var body=desc.split(/\\n{2,}/).map(function(p){return p.replace(/\\n/g,' ').trim();}).filter(function(p){return p.length>0;}).map(function(p){return '<p>'+safe(p)+'</p>';}).join('');
  return{title:title,body:body||'<p>'+safe(desc)+'</p>'};
}

function getContent(topic){
  if(topic.fileType==='html'){
    try{
      var p=JSON.parse(topic.content);
      return{title:p.title||null,html:p.description||null,plain:false};
    }catch(e){return{title:null,html:topic.content,plain:false};}
  }
  var r=parseTxt(topic.content);
  return{title:r.title,html:r.body,plain:true};
}

// ── State ──
var downloads=loadDownloads();
var groups=groupByModule(downloads);
var currentGroup=null;
var currentTopicIdx=0;
var sidebarOpen=false;

// ── Render ──
function render(){
  var app=document.getElementById('app');
  if(currentGroup) renderReader(app);
  else renderList(app);
}

function esc(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):''}

function renderList(app){
  var html='<header class="hdr"><div class="hdr-inner">'
    +'<div class="logo-pill">&#128218; Educational Platform</div>'
    +'<div class="off-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> You\'re offline</div>'
    +'<button class="reconnect-btn" onclick="location.reload()">Reconnect</button>'
    +'</div></header>'
    +'<div class="hero">'
    +'<div class="off-mode-pill"><span class="off-dot"></span><span style="font-size:13px;font-weight:700;color:#dc2626">Offline Mode</span></div>'
    +'<h1>You\'re <span>offline</span> right now</h1>'
    +'<p>No internet connection detected. Read any content you downloaded while online.</p>'
    +'<button class="try-btn" onclick="location.reload()">&#8635; Try reconnecting</button>'
    +'</div>'
    +'<div class="section"><div class="section-hdr"><h2>Downloaded <span>Content</span></h2>';
  if(downloads.length>0) html+='<span class="count-pill">'+downloads.length+' file'+(downloads.length!==1?'s':'')+'</span>';
  html+='</div>';

  if(groups.length===0){
    html+='<div class="empty"><div class="empty-icon">&#128218;</div><h3>No downloaded content</h3>'
      +'<p>Go online, open a module, and use the Download Module button to save topics for offline reading.</p></div>';
  } else {
    html+='<div class="grid">';
    groups.forEach(function(g,gi){
      var topics=buildTopics(g.topics);
      var hasHtml=g.topics.some(function(t){return t.fileType==='html';});
      html+='<div class="card" onclick="openGroup('+gi+')">'
        +'<div class="card-top"><div style="display:flex;align-items:center;gap:10px;min-width:0">'
        +'<div class="card-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>'
        +'<div style="min-width:0"><div class="card-title">'+esc(g.moduleName)+'</div><div class="card-sub">'+topics.length+' topic'+(topics.length!==1?'s':'')+'</div></div>'
        +'</div><div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'
        +'<span class="'+(hasHtml?'readable-badge':'text-badge')+'">'+(hasHtml?'Readable':'Text')+'</span>'
        +'<span style="font-size:16px;color:#9ca3af">&rsaquo;</span>'
        +'</div></div>';
      topics.slice(0,2).forEach(function(t){
        html+='<div class="topic-row"><span class="topic-dot"></span>'
          +'<span class="topic-name">'+esc(t.topicName)+'</span>'
          +'<span class="topic-type">'+esc(t.fileType)+'</span></div>';
      });
      if(topics.length>2) html+='<div class="more-link">+'+(topics.length-2)+' more</div>';
      html+='<div class="card-footer"><span class="card-date">Saved '+new Date(g.topics[0].downloadedAt).toLocaleDateString()+'</span>'
        +'<button class="open-btn" onclick="event.stopPropagation();openGroup('+gi+')">Open module</button>'
        +'</div></div>';
    });
    html+='</div>';
  }
  html+='</div></div>';
  app.innerHTML=html;
}

function renderReader(app){
  var g=currentGroup;
  var topics=buildTopics(g.topics);
  var topic=topics[currentTopicIdx];
  var c=topic?getContent(topic):{title:null,html:null,plain:false};

  var html='<div class="reader">'
    +'<header class="reader-hdr">'
    +'<button class="back-btn" onclick="goBack()">&#8592; Downloads</button>'
    +'<span class="reader-title">'+esc(g.moduleName)+'</span>'
    +'<div class="off-badge" style="flex-shrink:0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> Offline</div>'
    +'</header>'
    +'<div class="mob-toggle"><button onclick="toggleSidebar()">&#9776; Topics ('+topics.length+')</button></div>'
    +'<div id="mob-sidebar" class="mob-sidebar" style="display:'+(sidebarOpen?'block':'none')+'">'
    +'<div class="sidebar-inner"><span class="sidebar-label">Topics</span>';
  topics.forEach(function(t,i){
    html+='<button class="topic-btn '+(i===currentTopicIdx?'active':'inactive')+'" onclick="selectTopic('+i+')">'
      +'<span class="t-dot" style="background:'+(i===currentTopicIdx?'#8b5cf6':'#d1d5db')+'"></span>'+esc(t.topicName)+'</button>';
  });
  html+='</div></div>'
    +'<div class="reader-body">'
    +'<aside class="sidebar"><div class="sidebar-inner"><span class="sidebar-label">Topics</span>';
  topics.forEach(function(t,i){
    html+='<button class="topic-btn '+(i===currentTopicIdx?'active':'inactive')+'" onclick="selectTopic('+i+')">'
      +'<span class="t-dot" style="background:'+(i===currentTopicIdx?'#8b5cf6':'#d1d5db')+'"></span>'+esc(t.topicName)+'</button>';
  });
  html+='</div></aside>'
    +'<main class="main-content">';

  if(topic){
    html+='<p class="breadcrumb">'+esc(g.moduleName)+'</p>';
    var titleHtml=c.title?('<h2 class="content-title">'+esc(c.title)+'</h2>'):('<h2 class="content-title">'+esc(topic.topicName)+'</h2>');
    // For html fileType, title may itself contain HTML
    if(!c.plain&&c.title) titleHtml='<div class="ai" style="margin-bottom:16px">'+c.title+'</div>';
    html+=titleHtml;
    if(c.html) html+='<div class="ai">'+c.html+'</div>';
    else html+='<p style="color:#9ca3af;font-style:italic">No content available.</p>';
    html+='<div class="nav-row">'
      +'<button class="prev-btn" onclick="prevTopic()" '+(currentTopicIdx===0?'disabled style="opacity:.4;cursor:not-allowed"':'')+'>&#8592; Previous</button>'
      +'<span class="nav-count">'+(currentTopicIdx+1)+' / '+topics.length+'</span>'
      +'<button class="next-btn" onclick="nextTopic()" '+(currentTopicIdx===topics.length-1?'disabled style="opacity:.4;cursor:not-allowed;background:#e5e7eb"':'')+'>Next &#8594;</button>'
      +'</div>';
  } else {
    html+='<p style="color:#9ca3af">No topics found.</p>';
  }
  html+='</main></div></div>';
  app.innerHTML=html;
  window.scrollTo(0,0);
}

// ── Actions ──
window.openGroup=function(idx){currentGroup=groups[idx];currentTopicIdx=0;sidebarOpen=false;render();};
window.goBack=function(){currentGroup=null;render();};
window.selectTopic=function(idx){currentTopicIdx=idx;sidebarOpen=false;render();};
window.prevTopic=function(){if(currentTopicIdx>0){currentTopicIdx--;render();}};
window.nextTopic=function(){var topics=buildTopics(currentGroup.topics);if(currentTopicIdx<topics.length-1){currentTopicIdx++;render();}};
window.toggleSidebar=function(){sidebarOpen=!sidebarOpen;render();};

render();
})();
</script>
</body>
</html>`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(names.filter((n) => !ALL_CACHES.includes(n)).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Real connectivity checks — bypass SW entirely
  if (url.searchParams.has("_swbypass")) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip HMR and auth
  if (url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/api/auth")) return;

  // API: network-only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => Response.json({ error: "offline" }, { status: 503 }))
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Pages: network-first.
  // On ANY failure, return the self-contained offline HTML directly.
  // NEVER serve stale cached pages — they have broken chunk references
  // after a Vercel deploy and cause "Application error".
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(PAGE_CACHE).then((c) => c.put(request, clone));
        return response;
      })
      .catch(() => new Response(buildOfflineHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }))
  );
});
