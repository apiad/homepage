/* =========================================================
   apiad.net — terminal build-up
   Content lives in data.json; this file is presentation only.
   Each section is a "scene": a prompt types in, pauses, runs,
   prints output. First scene runs on load. Each subsequent
   scene runs when it scrolls into view (once).
   ========================================================= */

(async function main(){

  // ---- data load ------------------------------------------------------
  const data = await fetch('./data.json', {cache:'no-cache'})
    .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
    .catch(err => { console.error('apiad: failed to load data.json', err); return null; });

  if(!data){
    const body = document.getElementById('body');
    if(body) body.innerHTML = '<p style="color:var(--warn);padding:40px">Failed to load data.json — site content unavailable.</p>';
    return;
  }

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "speed": "fast"
  }/*EDITMODE-END*/;

  const state = {
    speed: localStorage.getItem('apiad.speed') || TWEAK_DEFAULTS.speed,
    skip: false,
    playing: null,            // promise for current typing op
    playedScenes: new Set(),
  };
  const SPEED = { slow:[22,14], normal:[12,8], fast:[4,3] };

  // ---- scene renderers (pure strings, fed from data) ------------------

  function renderHero(){
    const h = data.hero;
    return `
        <div class="idbox">
          <img class="avatar" alt="${h.name}"
               src="${h.avatarUrl}"
               onerror="this.removeAttribute('src')">
          <div>
            <h1>${h.name}</h1>
            <p class="tag">${h.taglineHtml}</p>
            <a class="pill" href="${h.cta.href}">${h.cta.text}</a>
          </div>
        </div>
      `;
  }

  function renderAbout(){
    const paras = data.about.paragraphs.map((p,i) => i===0
      ? `<p style="margin:10px 0 0;max-width:60ch;color:#d4ddd4">${p}</p>`
      : `<p style="margin:12px 0 0;max-width:60ch;color:var(--muted);font-size:14px">${p}</p>`
    ).join('\n            ');
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">About</span></p>
        <div class="about-grid">
          <div class="about-copy">
            ${paras}
          </div>
          <div class="rain-wrap" aria-hidden="true">
            <canvas id="rain-canvas"></canvas>
            <div class="rain-vignette"></div>
          </div>
        </div>
      `;
  }

  function renderNow(){
    const slides = data.now.items.map(it => `
            <div class="now now-slide">
              <span class="dot"></span>
              <div><span class="hl">${it.headlineHtml}</span>
              ${it.bodyHtml}</div>
            </div>`).join('');
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Now</span> <span class="muted">— <span id="now-stamp">last updated ${data.now.updatedLabel}</span></span></p>
        <div class="now-carousel" id="now-carousel">
          <div class="now-track" id="now-track">${slides}
          </div>
          <div class="now-ctrl">
            <button class="now-btn" data-now="prev" aria-label="Previous">‹</button>
            <div class="now-dots" id="now-dots"></div>
            <button class="now-btn" data-now="next" aria-label="Next">›</button>
            <span class="now-idx" id="now-idx">1/${data.now.items.length}</span>
          </div>
        </div>
      `;
  }

  function renderWriting(){
    const rows = data.writing.posts.map(p => `
          <a class="row" href="${p.url}">
            <span class="date">${p.date}</span>
            <span class="title">${p.title}<small>${p.subtitle}</small></span>
            <span class="arrow">READ →</span>
          </a>`).join('');
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Writing</span> <span class="muted">— <a href="${data.writing.blogUrl}" style="color:var(--accent);text-decoration:none">blog.apiad.net</a> · ${data.writing.subscribersLabel}</span></p>
        <div class="rows">${rows}
        </div>
      `;
  }

  function renderLibrary(){
    const books = data.library.books.map(b => `
          <a class="book" href="${data.library.booksUrl}/books/${b.slug}" target="_blank" rel="noopener">
            <div class="book-head">
              <span class="book-tag" data-status="${b.status}">${b.status} · ${b.progress}%</span>
              <span class="book-aud">${b.audience}</span>
            </div>
            <h3>${b.title}</h3>
            <p>${b.desc}</p>
            <div class="book-bar"><i style="width:${b.progress}%"></i></div>
            <div class="book-foot"><span>${b.pagesDone} / ${b.pagesTotal} pp</span><span class="arrow">READ →</span></div>
          </a>`).join('');
    const backburner = data.library.backburner.map(t => `<span>${t}</span>`).join('\n            ');
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Library</span> <span class="muted">— <a href="${data.library.booksUrl}" style="color:var(--accent);text-decoration:none" target="_blank" rel="noopener">books.apiad.net</a> · free online books · read any chapter as a web page</span></p>
        <p class="muted" style="margin:10px 0 14px;max-width:72ch;font-size:13px">${data.library.descriptionHtml}</p>
        <div class="books-grid">${books}
        </div>
        <details class="backburner">
          <summary><span class="kbd">$</span> cat ~/library/backburner.txt <span class="muted">— ${data.library.backburner.length} titles on the back burner</span></summary>
          <div class="backburner-list">
            ${backburner}
          </div>
        </details>
      `;
  }

  function renderResearch(){
    const links = data.research.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('\n          ');
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Research</span> <span class="muted">— neurosymbolic · NLP · ML democratization</span></p>
        <p style="margin:10px 0 0;max-width:68ch;color:#d4ddd4">${data.research.introHtml}</p>
        <div class="links">
          ${links}
        </div>
      `;
  }

  function renderProjects(){
    const curated = data.projects.curated || [];
    const pageSize = data.projects.pageSize || 6;
    const pages = Math.max(1, Math.ceil(curated.length / pageSize));
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Projects</span> <span class="muted">— <a href="https://github.com/${data.projects.githubUser}" style="color:var(--accent);text-decoration:none">github.com/${data.projects.githubUser}</a> · <span id="gh-count">${curated.length} featured</span></span></p>
        <div class="repo-carousel" id="repo-carousel">
          <div class="grid repo-grid" id="repo-grid" aria-live="polite"></div>
          <div class="now-ctrl">
            <button class="now-btn" data-repo="prev" aria-label="Previous page">‹</button>
            <div class="now-dots" id="repo-dots"></div>
            <button class="now-btn" data-repo="next" aria-label="Next page">›</button>
            <span class="now-idx" id="repo-idx">1/${pages}</span>
          </div>
        </div>
      `;
  }

  function renderPublications(){
    // The list is populated at runtime from OpenAlex (see initPublications
    // below). The initial render is a loading skeleton with a link back to
    // Google Scholar so the reader has somewhere to go if the fetch fails.
    const limit = data.publications.limit || 20;
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Publications</span> <span class="muted">— top ${limit} by citations · via <a href="https://openalex.org/authors/orcid:${data.publications.orcid}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">OpenAlex</a> · <a href="https://scholar.google.com/citations?user=4P9BS6QAAAAJ" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:none">scholar</a></span></p>
        <div class="rows" id="pub-rows" data-pub-loading="1">
          <p class="ln prompt" style="color:var(--muted);margin:8px 0">loading publications…</p>
        </div>
      `;
  }

  function renderElsewhere(){
    const links = data.elsewhere.links.map(l => `<a href="${l.url}">${l.label}</a>`).join('\n          ');
    const f = data.elsewhere.footer;
    const cta = data.elsewhere.followCta;
    return `
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Elsewhere</span> <span class="muted">— the usual suspects</span></p>
        <div class="links">
          ${links}
        </div>
        <div class="foot">
          <span>${f.copy}</span>
          <span>${f.tagline} · <span class="green online-ind">●</span> online</span>
        </div>
        <p class="ln prompt" style="margin-top:24px"><a href="${cta.url}" class="follow-link">${cta.text}</a> for <span class="follow-rot" id="follow-rot" aria-live="polite"></span><span class="caret-blink">_</span></p>
      `;
  }

  // ---- scenes (structure stays; content is data-driven) ---------------

  const scenes = [
    {
      id:'boot',
      lines:[
        { kind:'comment', text: data.hero.bootComment },
        { kind:'prompt',  text: 'whoami' },
        { kind:'out',     text: data.hero.whoami },
        { kind:'prompt',  text: 'uname -a' },
        { kind:'out',     html: data.hero.unameHtml },
      ],
      render: renderHero(),
      crumb: '~'
    },
    { id:'about',    lines:[{kind:'prompt', text:data.about.prompt}],    render:renderAbout(),    crumb:'~/about' },
    { id:'now',      lines:[{kind:'prompt', text:data.now.prompt}],      render:renderNow(),      crumb:'~/now' },
    { id:'writing',  lines:[{kind:'prompt', text:data.writing.prompt}],  render:renderWriting(),  crumb:'~/writing' },
    { id:'library',  lines:[{kind:'prompt', text:data.library.prompt}],  render:renderLibrary(),  crumb:'~/library' },
    { id:'research', lines:[{kind:'prompt', text:data.research.prompt}], render:renderResearch(), crumb:'~/research' },
    { id:'projects', lines:[{kind:'prompt', text:data.projects.prompt}], render:renderProjects(), crumb:'~/projects' },
    { id:'publications', lines:[{kind:'prompt', text:data.publications.prompt}], render:renderPublications(), crumb:'~/publications' },
    { id:'elsewhere',lines:[{kind:'prompt', text:data.elsewhere.prompt}],render:renderElsewhere(),crumb:'~/elsewhere' },
  ];

  // ---- DOM building ----------------------------------------------------
  const bodyEl = document.getElementById('body');
  const pbar = document.getElementById('pbar');
  const crumbEl = document.getElementById('crumb');

  function buildScaffold(){
    bodyEl.innerHTML = '';
    scenes.forEach((sc, i)=>{
      const wrap = document.createElement('div');
      wrap.className = 'scene';
      wrap.dataset.id = sc.id;
      wrap.dataset.idx = i;

      // ASCII rule between scenes (except first)
      if(i>0){
        const rule = document.createElement('span');
        rule.className = 'rule';
        rule.textContent = '─'.repeat(400);
        wrap.appendChild(rule);
      }

      // Line slots (one <span.ln> per scripted line)
      sc.lines.forEach((ln)=>{
        const el = document.createElement('span');
        el.className = 'ln ' + (ln.kind||'out');
        wrap.appendChild(el);
      });

      // Render block (hidden initially)
      const block = document.createElement('div');
      block.className = 'block';
      block.innerHTML = sc.render || '';
      wrap.appendChild(block);

      bodyEl.appendChild(wrap);
    });
  }

  // ---- typing engine ---------------------------------------------------
  function sleep(ms){ return new Promise(r=>{
    if(state.skip){ r(); return; }
    setTimeout(r,ms);
  });}

  function typeInto(el, text, isPrompt){
    return new Promise(res=>{
      if(state.skip){ el.textContent = text; el.classList.remove('typing'); res(); return; }
      const [base, jitter] = SPEED[state.speed] || SPEED.normal;
      el.textContent = '';
      el.classList.add('typing');
      let i=0;
      const tick = ()=>{
        if(state.skip){ el.textContent = text; el.classList.remove('typing'); return res(); }
        if(i<=text.length){
          el.textContent = text.slice(0,i);
          i++;
          const ch = text[i-1] || '';
          const extra = (ch===' '?0:(ch==='.'||ch==='\n'?60:0));
          setTimeout(tick, base + Math.random()*jitter + extra);
        } else {
          el.classList.remove('typing');
          res();
        }
      };
      tick();
    });
  }

  function setHTML(el, html){
    el.innerHTML = html;
    el.classList.remove('typing');
  }

  async function playScene(sceneEl){
    const idx = +sceneEl.dataset.idx;
    const sc = scenes[idx];
    if(state.playedScenes.has(sc.id)) return;
    state.playedScenes.add(sc.id);
    // crumb is driven by scroll position now — see onScroll

    // tiny pause so you *feel* the stop before each section
    await sleep(idx===0 ? 220 : 420);

    // Get line slots (all <span.ln> direct children, in order)
    const lnEls = [...sceneEl.querySelectorAll(':scope > span.ln')];

    for(let i=0;i<sc.lines.length;i++){
      const spec = sc.lines[i];
      const el = lnEls[i];
      if(!el) continue;

      if(spec.kind === 'prompt'){
        // type the command live
        await typeInto(el, spec.text);
        await sleep(160);
      } else if(spec.kind === 'comment'){
        // print comments slightly faster, still typed
        const saved = state.speed; state.speed = state.speed==='slow'?'normal':'fast';
        await typeInto(el, spec.text);
        state.speed = saved;
        await sleep(80);
      } else {
        // output — flash in, no typewriter (keeps output snappy like real CLI)
        if(spec.html){ setHTML(el, spec.html); } else { el.textContent = spec.text || ''; }
        await sleep(120);
      }
    }

    // reveal the rendered block for this scene
    const block = sceneEl.querySelector(':scope > .block');
    if(block){
      await sleep(160);
      block.classList.add('on');
      // bootstrap dynamic sections if this scene contains them
      const car = block.querySelector('.now-carousel');
      if(car && !car.dataset.inited){ initNowCarousel(car); }
      const rc = block.querySelector('.repo-carousel');
      if(rc && !rc.dataset.inited){ initRepoCarousel(rc); }
      const rain = block.querySelector('#rain-canvas');
      if(rain && !rain.dataset.inited){ initMatrixRain(rain); }
      const pubs = block.querySelector('#pub-rows');
      if(pubs && !pubs.dataset.inited){ initPublications(pubs); }
      await sleep(260);
    }
  }

  // ---- matrix grid (about section) ---------------------------------
  // A grid of cells; each glyph blinks in and out on its own schedule.
  // Occasionally a hidden word is written across a random line (H/V/diag)
  // by forcing those cells to hold the word's letters at boosted alpha,
  // then letting them fade back to the idle shimmer.
  function initMatrixRain(canvas){
    canvas.dataset.inited = '1';
    const ctx = canvas.getContext('2d');
    const GLYPHS = (
      'abcdefghijklmnopqrstuvwxyz'+
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'+
      '0123456789'+
      '∫∂∑∏∇ΩλπσμεφθαβγδΔΨΞ'+
      '≈≡⊕⊗¬∧∨∀∃→∈⊂∅∞±√∝'+
      'ℝℕℤℚℂ{}[]()<>=/\\*+-'
    ).split('');
    const WORDS = data.matrixRain.words;

    const cell = 16;
    let cols = 0, rows = 0;
    let grid = [];           // {g,a,target,nextAt,locked,word}
    let dpr = Math.min(window.devicePixelRatio||1, 2);
    let w = 0, h = 0;
    let running = true;
    let nextWordAt = 0;

    function pick(){ return GLYPHS[(Math.random()*GLYPHS.length)|0]; }
    function now(){ return performance.now(); }

    function resize(){
      const r = canvas.parentElement.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = w*dpr; canvas.height = h*dpr;
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      cols = Math.max(1, Math.floor(w/cell));
      rows = Math.max(1, Math.floor(h/cell));
      grid = new Array(cols*rows);
      const t = now();
      for(let k=0;k<grid.length;k++){
        grid[k] = {
          g: pick(),
          a: Math.random()*0.18,      // current alpha
          target: Math.random()*0.35, // target alpha for next flip
          nextAt: t + Math.random()*2400,
          locked: 0,                  // time (ms) until unlock
          word: false                 // is part of an active word
        };
      }
      ctx.font = '12px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      nextWordAt = t + 1200 + Math.random()*1800;
    }

    // place a word into the grid on a random line (8 directions)
    function tryPlaceWord(){
      const word = WORDS[(Math.random()*WORDS.length)|0];
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
      for(let attempt=0; attempt<10; attempt++){
        const [dx,dy] = dirs[(Math.random()*dirs.length)|0];
        const sx = (Math.random()*cols)|0;
        const sy = (Math.random()*rows)|0;
        const ex = sx + dx*(word.length-1);
        const ey = sy + dy*(word.length-1);
        if(ex<0||ex>=cols||ey<0||ey>=rows) continue;
        // check none are currently word-locked
        let ok = true;
        for(let i=0;i<word.length;i++){
          const c = grid[(sy+dy*i)*cols + (sx+dx*i)];
          if(c.word){ ok = false; break; }
        }
        if(!ok) continue;
        const t = now();
        const hold = 900 + Math.random()*700;     // how long the word sits bright
        for(let i=0;i<word.length;i++){
          const c = grid[(sy+dy*i)*cols + (sx+dx*i)];
          c.g = word[i];
          c.target = 0.95;
          c.a = Math.min(1, c.a + 0.6);
          c.locked = t + hold + i*45;             // reveal sweeps along the word
          c.word = true;
        }
        return;
      }
    }

    let lastFrame = 0;
    function frame(ts){
      if(!running) return;
      if(ts - lastFrame < 90){ requestAnimationFrame(frame); return; } // ~11 fps shimmer
      lastFrame = ts;

      ctx.clearRect(0,0,w,h);

      const t = ts;
      if(t > nextWordAt){
        tryPlaceWord();
        nextWordAt = t + 1800 + Math.random()*2600;
      }

      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          const k = y*cols+x;
          const c = grid[k];

          if(c.word && t > c.locked){
            // word expired — return to idle shimmer, let it fade
            c.word = false;
            c.target = Math.random()*0.3;
            c.nextAt = t + 600 + Math.random()*1800;
          }

          if(!c.word && t > c.nextAt){
            // pick a new glyph & target alpha
            if(Math.random() < 0.7) c.g = pick();
            c.target = Math.random() < 0.15 ? 0.5 + Math.random()*0.3 : Math.random()*0.25;
            c.nextAt = t + 300 + Math.random()*2400;
          }

          // ease alpha toward target
          c.a += (c.target - c.a) * 0.12;

          if(c.a < 0.015) continue;

          const px = x*cell + 2;
          const py = y*cell + 2;
          if(c.word){
            ctx.fillStyle = 'rgba(210,240,200,'+Math.min(1,c.a).toFixed(3)+')';
          } else {
            // idle glyphs: muted green/gray
            const v = Math.min(0.55, c.a);
            ctx.fillStyle = 'rgba(140,175,150,'+v.toFixed(3)+')';
          }
          ctx.fillText(c.g, px, py);
        }
      }
      requestAnimationFrame(frame);
    }

    resize();
    let rt;
    window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(resize, 120); });
    document.addEventListener('visibilitychange', ()=>{
      running = !document.hidden;
      if(running){ lastFrame = 0; requestAnimationFrame(frame); }
    });
    requestAnimationFrame(frame);
  }

  // ---- now carousel --------------------------------------------------
  function initNowCarousel(root){
    root.dataset.inited = '1';
    const slides = [...root.querySelectorAll('.now-slide')];
    const dotsWrap = root.querySelector('#now-dots');
    const idxEl = root.querySelector('#now-idx');
    const prev = root.querySelector('[data-now="prev"]');
    const next = root.querySelector('[data-now="next"]');
    let i = 0, timer = null, paused = false;

    // build dots
    slides.forEach((_,k)=>{
      const d = document.createElement('i');
      d.addEventListener('click',()=>{ go(k); restart(); });
      dotsWrap.appendChild(d);
    });

    function render(){
      slides.forEach((s,k)=>s.classList.toggle('on', k===i));
      [...dotsWrap.children].forEach((d,k)=>d.classList.toggle('on', k===i));
      if(idxEl) idxEl.textContent = (i+1)+'/'+slides.length;
    }
    function go(k){ i = (k+slides.length)%slides.length; render(); }
    function tick(){ if(!paused) go(i+1); }
    function restart(){ if(timer) clearInterval(timer); timer = setInterval(tick, 5200); }

    prev.addEventListener('click',()=>{ go(i-1); restart(); });
    next.addEventListener('click',()=>{ go(i+1); restart(); });
    root.addEventListener('mouseenter',()=>{ paused = true; });
    root.addEventListener('mouseleave',()=>{ paused = false; });

    render(); restart();
  }

  // ---- repo carousel -------------------------------------------------
  // Curated list of {owner, name} in display order. On load, we render
  // skeleton cards immediately (name only), then upgrade each with live
  // GitHub data — language, description, stars, forks. Live data is
  // cached in localStorage for 24h, keyed by a hash of the curated list
  // so edits to data.json invalidate the cache automatically.
  const CURATED = data.projects.curated || [];
  const PAGE_SIZE = data.projects.pageSize || 6;
  const PAGES     = Math.max(1, Math.ceil(CURATED.length / PAGE_SIZE));
  const CACHE_KEY = 'apiad.homepage.repos.v1';
  const CACHE_TTL_MS = 24*60*60*1000;

  function curatedHash(){
    return CURATED.map(c => c.owner+'/'+c.name).join('|');
  }

  function loadRepoCache(){
    try{
      const raw = localStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      const c = JSON.parse(raw);
      if(!c || !c.ts || !c.byKey) return null;
      if(Date.now() - c.ts > CACHE_TTL_MS) return null;
      if(c.hash !== curatedHash()) return null;
      return c.byKey;
    }catch(e){ return null; }
  }

  function saveRepoCache(byKey){
    try{
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        hash: curatedHash(),
        byKey,
      }));
    }catch(e){ /* full or disabled; fine */ }
  }

  function ghRepoShape(x){
    return {
      desc:  x.description || '',
      lang:  x.language || '',
      stars: x.stargazers_count || 0,
      forks: x.forks_count || 0,
    };
  }

  // Fetch live data for the curated list.
  // Strategy: group curated entries by owner. If an owner appears ≥2
  // times, use ONE bulk call `/users/{owner}/repos?per_page=100`; if
  // only once (singleton), use the per-repo `/repos/{owner}/{name}`
  // endpoint. This keeps total request count near log(n) in owner
  // count rather than n in repo count — stays well under the 60/hr
  // unauthenticated GitHub API quota.
  async function fetchCuratedLive(){
    const byOwner = new Map();
    for(const c of CURATED){
      if(!byOwner.has(c.owner)) byOwner.set(c.owner, new Set());
      byOwner.get(c.owner).add(c.name);
    }

    const results = {};
    await Promise.all([...byOwner.entries()].map(async ([owner, namesSet]) => {
      const names = [...namesSet];
      const useBulk = names.length >= 2;
      try{
        if(useBulk){
          const r = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100`,
                                {headers:{'Accept':'application/vnd.github+json'}});
          if(!r.ok) return;
          const arr = await r.json();
          for(const repo of arr){
            if(namesSet.has(repo.name)){
              results[owner+'/'+repo.name] = ghRepoShape(repo);
            }
          }
        } else {
          const name = names[0];
          const r = await fetch(`https://api.github.com/repos/${owner}/${name}`,
                                {headers:{'Accept':'application/vnd.github+json'}});
          if(!r.ok) return;
          const repo = await r.json();
          results[owner+'/'+name] = ghRepoShape(repo);
        }
      }catch(e){ /* tolerated; this owner's repos stay on stub */ }
    }));
    return results;
  }

  function buildReposFromLive(byKey){
    return CURATED.map(c => {
      const live = byKey[c.owner+'/'+c.name] || null;
      return {
        owner: c.owner,
        name:  c.name,
        desc:  live ? live.desc  : '',
        lang:  live ? live.lang  : '',
        stars: live ? live.stars : null,
        forks: live ? live.forks : null,
        _loading: !live,
      };
    });
  }

  // Initial skeleton — just owner/name, everything else marked loading.
  let REPOS = buildReposFromLive({});

  function repoCard(r){
    const h3 = r.owner && r.owner !== 'apiad'
      ? `<span class="scope">${r.owner}/</span>${r.name}`
      : r.name;
    const url = `https://github.com/${r.owner||'apiad'}/${r.name}`;
    const loading = r._loading ? ' data-ph="1"' : '';
    const stars = r.stars == null ? '—' : r.stars;
    const forks = r.forks == null ? '—' : r.forks;
    return `<a class="card"${loading} href="${url}" target="_blank" rel="noopener">
      <span class="lang" data-l="${r.lang||''}">${r.lang||''}</span>
      <h3>${h3}</h3>
      <p>${r.desc||'—'}</p>
      <div class="meta"><span class="star">${stars}</span><span class="fork">${forks}</span></div>
    </a>`;
  }

  function initRepoCarousel(root){
    root.dataset.inited = '1';
    const grid  = root.querySelector('#repo-grid');
    const dots  = root.querySelector('#repo-dots');
    const idxEl = root.querySelector('#repo-idx');
    const prev  = root.querySelector('[data-repo="prev"]');
    const next  = root.querySelector('[data-repo="next"]');
    let page = 0, timer = null, paused = false;

    for(let p=0;p<PAGES;p++){
      const d = document.createElement('i');
      d.addEventListener('click',()=>{ go(p); restart(); });
      dots.appendChild(d);
    }
    function render(){
      const slice = REPOS.slice(page*PAGE_SIZE, page*PAGE_SIZE+PAGE_SIZE);
      grid.innerHTML = slice.map(repoCard).join('');
      [...dots.children].forEach((d,k)=>d.classList.toggle('on', k===page));
      if(idxEl) idxEl.textContent = (page+1)+'/'+PAGES;
    }
    function go(p){ page = (p+PAGES)%PAGES; render(); }
    function restart(){ if(timer) clearInterval(timer); timer = setInterval(()=>{ if(!paused) go(page+1); }, 7200); }

    prev.addEventListener('click',()=>{ go(page-1); restart(); });
    next.addEventListener('click',()=>{ go(page+1); restart(); });
    root.addEventListener('mouseenter',()=>paused=true);
    root.addEventListener('mouseleave',()=>paused=false);

    render(); restart();

    // Upgrade with live data: cache first, network fallback.
    (async () => {
      const cached = loadRepoCache();
      if(cached){
        REPOS = buildReposFromLive(cached);
        updateCount(cached);
        render();
        return;
      }
      const byKey = await fetchCuratedLive();
      REPOS = buildReposFromLive(byKey);
      saveRepoCache(byKey);
      updateCount(byKey);
      render();
    })().catch(()=>{});
  }

  function updateCount(byKey){
    const cnt = document.getElementById('gh-count');
    if(!cnt) return;
    const hits = CURATED.filter(c => byKey[c.owner+'/'+c.name]).length;
    cnt.textContent = hits + ' featured';
  }

  // ---- publications (OpenAlex) ---------------------------------------
  // Fetch the top-N most-cited works for the given ORCID from OpenAlex,
  // cache in localStorage for 24h (same pattern as repos). OpenAlex has
  // CORS enabled and a generous public rate limit; the `mailto` param is
  // the convention for getting into their "polite pool" with better
  // priority on rate limits.
  const PUB_CACHE_KEY = 'apiad.homepage.publications.v1';
  const PUB_CACHE_TTL_MS = 24*60*60*1000;

  function loadPubCache(){
    try{
      const raw = localStorage.getItem(PUB_CACHE_KEY);
      if(!raw) return null;
      const c = JSON.parse(raw);
      if(!c || !c.ts || !Array.isArray(c.items)) return null;
      if(Date.now() - c.ts > PUB_CACHE_TTL_MS) return null;
      if(c.orcid !== data.publications.orcid) return null;
      if(c.limit !== (data.publications.limit || 20)) return null;
      return c.items;
    }catch(e){ return null; }
  }

  function savePubCache(items){
    try{
      localStorage.setItem(PUB_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        orcid: data.publications.orcid,
        limit: data.publications.limit || 20,
        items,
      }));
    }catch(e){}
  }

  function shapeOpenAlexWork(w){
    const authors = (w.authorships || [])
      .map(a => a.author && a.author.display_name)
      .filter(Boolean);
    const venue = w.primary_location && w.primary_location.source
      ? w.primary_location.source.display_name
      : '';
    const url = w.doi ? ('https://doi.org/' + String(w.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//,'')) : w.id;
    return {
      title: w.title || w.display_name || '(untitled)',
      year: w.publication_year || '',
      citations: w.cited_by_count || 0,
      authors,
      venue,
      type: (w.type || '').replace(/-/g,' '),
      url,
    };
  }

  async function fetchPublicationsLive(){
    const orcid = data.publications.orcid;
    const limit = data.publications.limit || 20;
    const mailto = data.publications.contactEmail ? '&mailto=' + encodeURIComponent(data.publications.contactEmail) : '';
    const url = `https://api.openalex.org/works?filter=author.orcid:${orcid}&sort=cited_by_count:desc&per-page=${limit}${mailto}`;
    try{
      const r = await fetch(url, {headers:{'Accept':'application/json'}});
      if(!r.ok) return null;
      const j = await r.json();
      return (j.results || []).map(shapeOpenAlexWork);
    }catch(e){ return null; }
  }

  function renderPubRow(p){
    const authors = p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ', et al.' : '');
    const small = [authors, p.venue].filter(Boolean).join(' · ');
    const cite = p.citations >= 1 ? `${p.citations}×` : '—';
    return `
          <a class="row" href="${p.url}" target="_blank" rel="noopener">
            <span class="date">${p.year || '—'}</span>
            <span class="title">${p.title}<small>${small}</small></span>
            <span class="arrow">${cite} →</span>
          </a>`;
  }

  async function initPublications(root){
    root.dataset.inited = '1';
    async function paint(items){
      if(!items || !items.length){
        root.innerHTML = `<p class="ln prompt" style="color:var(--warn);margin:8px 0">Could not load publications. Try <a href="https://scholar.google.com/citations?user=4P9BS6QAAAAJ" target="_blank" rel="noopener" style="color:var(--accent)">scholar</a> directly.</p>`;
      } else {
        root.innerHTML = items.map(renderPubRow).join('');
      }
      root.removeAttribute('data-pub-loading');
    }
    const cached = loadPubCache();
    if(cached){ paint(cached); return; }
    const items = await fetchPublicationsLive();
    if(items) savePubCache(items);
    paint(items);
  }

  // ---- scroll-triggered playback --------------------------------------
  function setupObserver(){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(async(ent)=>{
        if(!ent.isIntersecting) return;
        const el = ent.target;
        if(el.dataset.played) return;
        el.dataset.played = '1';
        io.unobserve(el);
        // chain playback: queue each play so they don't overlap
        state.playing = (state.playing || Promise.resolve()).then(()=>playScene(el));
      });
    }, { root:null, rootMargin:'0px 0px -18% 0px', threshold:0.2 });

    document.querySelectorAll('.scene').forEach(el=>io.observe(el));
  }

  // ---- replay ---------------------------------------------------------
  async function replay(){
    // wait for current play to settle (respecting skip)
    state.skip = true;
    await Promise.resolve(state.playing).catch(()=>{});
    state.skip = false;
    state.playedScenes.clear();
    state.playing = null;
    buildScaffold();
    setupObserver();
    window.scrollTo({top:0, behavior:'instant'});
    // play first scene immediately
    const first = document.querySelector('.scene');
    if(first){ first.dataset.played='1'; state.playing = playScene(first); }
  }

  // ---- UI bindings ----------------------------------------------------
  document.getElementById('btn-replay').addEventListener('click', replay);
  document.getElementById('btn-skip').addEventListener('click', ()=>{
    state.skip = true;
    // reveal all remaining blocks quickly (but still via observer for unplayed)
    document.querySelectorAll('.scene').forEach(el=>{
      if(el.dataset.played) return;
      el.dataset.played='1';
      state.playing = (state.playing || Promise.resolve()).then(()=>playScene(el));
    });
    // after a beat, restore skip
    setTimeout(()=>{ state.skip=false; }, 80);
  });
  // fake theme toggle — flinches, refuses, declares the bug joke
  const btnTheme = document.getElementById('btn-theme');
  btnTheme.addEventListener('click', ()=>{
    if(btnTheme.classList.contains('flinch')) return;
    btnTheme.classList.add('flinch');
    setTimeout(()=>btnTheme.classList.remove('flinch'), 1200);
  });

  function setSpeed(s){
    state.speed = s;
    document.querySelectorAll('#tw-speed button').forEach(b=>b.classList.toggle('on', b.dataset.v===s));
    localStorage.setItem('apiad.speed', s);
    postEdit({speed:s});
  }
  document.querySelectorAll('#tw-speed button').forEach(b=>b.addEventListener('click',()=>setSpeed(b.dataset.v)));

  // Tweaks host protocol
  window.addEventListener('message', (ev)=>{
    const d = ev.data || {};
    if(d.type==='__activate_edit_mode') document.body.classList.add('tweaks-on');
    if(d.type==='__deactivate_edit_mode') document.body.classList.remove('tweaks-on');
  });
  function postEdit(edits){ try{ window.parent.postMessage({type:'__edit_mode_set_keys', edits}, '*'); }catch(e){} }
  window.parent.postMessage({type:'__edit_mode_available'}, '*');

  // ---- scroll progress + brand nav -----------------------------------
  const brandEl = document.getElementById('brand-nav');
  const brandTrigger = document.getElementById('brand-trigger');
  const brandLinks = [...document.querySelectorAll('.brand-links a')];
  const crumbElNav = document.getElementById('crumb');
  const NAV_IDS = ['about','now','writing','library','research','projects','publications','elsewhere'];

  function closeBrand(){
    brandEl.classList.remove('on');
    brandTrigger.setAttribute('aria-expanded','false');
  }
  function toggleBrand(){
    const on = brandEl.classList.toggle('on');
    brandTrigger.setAttribute('aria-expanded', on ? 'true':'false');
  }
  brandTrigger.addEventListener('click', (e)=>{ e.stopPropagation(); toggleBrand(); });
  document.addEventListener('click', (e)=>{
    if(!brandEl.contains(e.target)) closeBrand();
  });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeBrand(); });

  brandLinks.forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.dataset.nav;
      const sc = document.querySelector(`.scene[data-id="${id}"]`);
      if(!sc) return;
      e.preventDefault();
      e.stopPropagation();
      const y = sc.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({top:y, behavior:'smooth'});
      closeBrand();
    });
  });

  function onScroll(){
    const h = document.documentElement;
    const pct = Math.min(1, Math.max(0, h.scrollTop / (h.scrollHeight - h.clientHeight || 1)));
    pbar.style.width = (pct*100).toFixed(2)+'%';

    // active link highlight + crumb
    let active = NAV_IDS[0];
    for(const id of NAV_IDS){
      const sc = document.querySelector(`.scene[data-id="${id}"]`);
      if(!sc) continue;
      const r = sc.getBoundingClientRect();
      if(r.top <= 140) active = id;
    }
    brandLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === active));
    // update crumb to current section (once user has scrolled past hero)
    const aboutSc = document.querySelector('.scene[data-id="about"]');
    if(aboutSc){
      const aboutTop = aboutSc.getBoundingClientRect().top;
      if(aboutTop <= 140){
        const desired = '~/' + active;
        if(crumbElNav.textContent !== desired) crumbElNav.textContent = desired;
      } else {
        if(crumbElNav.textContent !== '~/') crumbElNav.textContent = '~/';
      }
    }
  }
  document.addEventListener('scroll', onScroll, {passive:true});

  // ---- local time -----------------------------------------------------
  function tick(){
    const now = new Date();
    const off = (data.localTime && typeof data.localTime.utcOffsetHours === 'number') ? data.localTime.utcOffsetHours : 0;
    const label = (data.localTime && data.localTime.label) || '';
    const hh = String((now.getUTCHours()+24+off)%24).padStart(2,'0');
    const mm = String(now.getUTCMinutes()).padStart(2,'0');
    const ss = String(now.getUTCSeconds()).padStart(2,'0');
    const el = document.getElementById('localtime');
    if(el) el.textContent = (label ? label+' · ' : '') + hh+':'+mm+':'+ss;
  }
  tick(); setInterval(tick, 1000);

  // ---- rotating "follow me for ..." line ------------------------------
  (function followRotator(){
    const WORDS = data.followRotator.words;
    let last = -1;
    function pick(){
      let i; do { i = Math.floor(Math.random()*WORDS.length); } while(i===last && WORDS.length>1);
      last = i; return WORDS[i];
    }
    const TYPE = 55, ERASE = 32, HOLD = 1600, GAP = 320;
    async function run(el){
      while(true){
        const w = pick();
        for(let k=1;k<=w.length;k++){ el.textContent = w.slice(0,k); await sleep(TYPE); }
        await sleep(HOLD);
        for(let k=w.length;k>=0;k--){ el.textContent = w.slice(0,k); await sleep(ERASE); }
        await sleep(GAP);
      }
    }
    // wait for the Elsewhere scene to render its DOM
    async function waitFor(){
      while(true){
        const el = document.getElementById('follow-rot');
        if(el){ run(el); return; }
        await sleep(200);
      }
    }
    waitFor();
  })();

  // ---- init -----------------------------------------------------------
  setSpeed(state.speed);
  buildScaffold();
  setupObserver();
  // play the first scene automatically on load
  (async()=>{
    await sleep(220);
    const first = document.querySelector('.scene');
    if(first){ first.dataset.played='1'; state.playing = playScene(first); }
  })();

})();
