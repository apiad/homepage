  /* =========================================================
     apiad.net — terminal build-up
     Each section is a "scene": a prompt types in, pauses, runs,
     prints output. First scene runs on load. Each subsequent
     scene runs when it scrolls into view (once).
     ========================================================= */

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

  // ---- scene content ---------------------------------------------------
  // Each scene: { id, cmd (typed after prompt), render(el) -> HTML appended }
  const scenes = [
    {
      id:'boot',
      lines:[
        { kind:'comment', text:'# apiad.net · v4.2 — made with ai in havana, cuba' },
        { kind:'prompt',  text:'whoami' },
        { kind:'out',     text:'alejandro piad morffis — computer scientist, educator, neurosymbolic-ai researcher.' },
        { kind:'prompt',  text:'uname -a' },
        { kind:'out',     html:'apiad <span class="muted">5.18.0-havana-cu</span> <span class="green">#1 SMP</span> <span class="amber">PhD CS · tenured · univ. of havana</span>' },
      ],
      render:`
        <div class="idbox">
          <img class="avatar" alt="Alejandro Piad Morffis"
               src="https://avatars.githubusercontent.com/u/1778204?v=4"
               onerror="this.removeAttribute('src')">
          <div>
            <h1>Alejandro Piad Morffis</h1>
            <p class="tag">
              <b>Tenured Professor</b> of Computer Science, Univ. of Havana ·
              <b>Neurosymbolic AI</b> researcher ·
              Co-founder <b>Syalia</b> · Director <b>GIA-UH</b> ·
              Writes <b>The Computist Journal</b>.
            </p>
            <a class="pill" href="mailto:apiad@apiad.net">● open to collaborations</a>
          </div>
        </div>
      `,
      crumb:'~'
    },

    {
      id:'about',
      lines:[
        { kind:'prompt', text:'cat about.md' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">About</span></p>
        <div class="about-grid">
          <div class="about-copy">
            <p style="margin:10px 0 0;max-width:60ch;color:#d4ddd4">
              I'm a computer scientist and educator living in <span class="amber">Havana, Cuba</span>.
              I teach <span class="green">Programming</span>, <span class="green">Compilers</span> and <span class="green">AI</span>
              at the University of Havana, and I research <span class="amber">neurosymbolic AI</span> — the
              messy, beautiful frontier where <span class="kbd">LLMs</span> meet classical symbolic methods.
            </p>
            <p style="margin:12px 0 0;max-width:60ch;color:var(--muted);font-size:14px">
              I co-founded <span class="green">Syalia</span>, where we build pragmatic AI software,
              and I direct <span class="green">GIA-UH</span>, a research group on democratizing
              machine learning. I write <span class="amber">The Computist Journal</span> —
              6,000+ readers, mostly about how computer science actually works underneath the hype.
            </p>
          </div>
          <div class="rain-wrap" aria-hidden="true">
            <canvas id="rain-canvas"></canvas>
            <div class="rain-vignette"></div>
          </div>
        </div>
      `,
      crumb:'~/about'
    },

    {
      id:'now',
      lines:[
        { kind:'prompt', text:'tail -n 5 ~/.focus' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Now</span> <span class="muted">— <span id="now-stamp">last updated apr '26</span></span></p>
        <div class="now-carousel" id="now-carousel">
          <div class="now-track" id="now-track">
            <div class="now now-slide">
              <span class="dot"></span>
              <div><span class="hl">Writing a book on neurosymbolic methods.</span>
              Draft one is at ~60%; trying to keep it shorter than my PhD thesis.</div>
            </div>
            <div class="now now-slide">
              <span class="dot"></span>
              <div><span class="hl">Shipping <span class="green">beaver</span> and <span class="green">lingo</span>.</span>
              A multi-modal embedded DB and a Python context-engineering toolkit — both open source.</div>
            </div>
            <div class="now now-slide">
              <span class="dot"></span>
              <div><span class="hl">Teaching a graduate course on LLM reasoning.</span>
              UH, spring '26. Syllabus draws heavily from neurosymbolic + classical AI.</div>
            </div>
            <div class="now now-slide">
              <span class="dot"></span>
              <div><span class="hl">Growing GIA-UH.</span>
              Onboarding three new master's students working on Spanish-language NLP for low-resource settings.</div>
            </div>
            <div class="now now-slide">
              <span class="dot"></span>
              <div><span class="hl">Reading: <em>The Society of Mind</em> + recent CoT-reasoning papers.</span>
              Looking for the seams where symbolic structure helps LLMs think, not just talk.</div>
            </div>
          </div>
          <div class="now-ctrl">
            <button class="now-btn" data-now="prev" aria-label="Previous">‹</button>
            <div class="now-dots" id="now-dots"></div>
            <button class="now-btn" data-now="next" aria-label="Next">›</button>
            <span class="now-idx" id="now-idx">1/5</span>
          </div>
        </div>
      `,
      crumb:'~/now'
    },

    {
      id:'writing',
      lines:[
        { kind:'prompt', text:'ls -lah ~/writing | head -7' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Writing</span> <span class="muted">— <a href="https://blog.apiad.net" style="color:var(--accent);text-decoration:none">blog.apiad.net</a> · 6,000+ subscribers</span></p>
        <div class="rows">
          <a class="row" href="https://blog.apiad.net">
            <span class="date">2026 · mar</span>
            <span class="title">Why neurosymbolic AI is having its moment, again<small>On the third wave of hybrid reasoning systems.</small></span>
            <span class="arrow">READ →</span>
          </a>
          <a class="row" href="https://blog.apiad.net">
            <span class="date">2026 · feb</span>
            <span class="title">The quiet return of Prolog<small>What LLM tool-use borrowed from logic programming.</small></span>
            <span class="arrow">READ →</span>
          </a>
          <a class="row" href="https://blog.apiad.net">
            <span class="date">2026 · jan</span>
            <span class="title">Teaching compilers without writing a compiler<small>A lab-first curriculum from four years at UH.</small></span>
            <span class="arrow">READ →</span>
          </a>
          <a class="row" href="https://blog.apiad.net">
            <span class="date">2025 · dec</span>
            <span class="title">A working definition of reasoning<small>Draft notes I keep returning to.</small></span>
            <span class="arrow">READ →</span>
          </a>
          <a class="row" href="https://blog.apiad.net">
            <span class="date">2025 · nov</span>
            <span class="title">Context engineering isn't prompt engineering<small>Why I built a whole library around it.</small></span>
            <span class="arrow">READ →</span>
          </a>
          <a class="row" href="https://blog.apiad.net">
            <span class="date">2025 · oct</span>
            <span class="title">Small models, sharp tools<small>Why I keep coming back to 1-3B parameter models for teaching.</small></span>
            <span class="arrow">READ →</span>
          </a>
        </div>
      `,
      crumb:'~/writing'
    },

    {
      id:'library',
      lines:[
        { kind:'prompt', text:'ls ~/library/' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Library</span> <span class="muted">— <a href="https://books.apiad.net" style="color:var(--accent);text-decoration:none" target="_blank" rel="noopener">books.apiad.net</a> · free online books · read any chapter as a web page</span></p>
        <p class="muted" style="margin:10px 0 14px;max-width:72ch;font-size:13px">
          Every chapter ships as a blog post first, then folds into one of four books in progress.
          The reader at <span class="green">books.apiad.net</span> is always free — no account, no paywall.
        </p>
        <div class="books-grid">
          <a class="book" href="https://books.apiad.net/books/tsoc" target="_blank" rel="noopener">
            <div class="book-head">
              <span class="book-tag" data-status="alpha">alpha · 18%</span>
              <span class="book-aud">general</span>
            </div>
            <h3>The Science of Computation</h3>
            <p>A grand view of computer science — foundations, systems, software engineering, AI. Zero formulas or code.</p>
            <div class="book-bar"><i style="width:18%"></i></div>
            <div class="book-foot"><span>53 / 300 pp</span><span class="arrow">READ →</span></div>
          </a>
          <a class="book" href="https://books.apiad.net/books/mhai" target="_blank" rel="noopener">
            <div class="book-head">
              <span class="book-tag" data-status="beta">beta · 31%</span>
              <span class="book-aud">general</span>
            </div>
            <h3>Mostly Harmless AI</h3>
            <p>Essays on AI and its impact on society — software, education, existential risks, limits, futures.</p>
            <div class="book-bar"><i style="width:31%"></i></div>
            <div class="book-foot"><span>92 / 300 pp</span><span class="arrow">READ →</span></div>
          </a>
          <a class="book" href="https://books.apiad.net/books/chatbots" target="_blank" rel="noopener">
            <div class="book-head">
              <span class="book-tag" data-status="alpha">alpha · 73%</span>
              <span class="book-aud">technical</span>
            </div>
            <h3>How to Train your Chatbot</h3>
            <p>Hands-on guide to building LLM applications — prompts, RAG, tools, agents, and how LLMs actually work.</p>
            <div class="book-bar"><i style="width:73%"></i></div>
            <div class="book-foot"><span>183 / 250 pp</span><span class="arrow">READ →</span></div>
          </a>
          <a class="book" href="https://books.apiad.net/books/graphs" target="_blank" rel="noopener">
            <div class="book-head">
              <span class="book-tag" data-status="alpha">alpha · 18%</span>
              <span class="book-aud">technical</span>
            </div>
            <h3>Mostly Harmless Graphs</h3>
            <p>Graphs from theory to algorithms to applications. Each chapter opens with a concrete problem.</p>
            <div class="book-bar"><i style="width:18%"></i></div>
            <div class="book-foot"><span>54 / 300 pp</span><span class="arrow">READ →</span></div>
          </a>
        </div>
        <details class="backburner">
          <summary><span class="kbd">$</span> cat ~/library/backburner.txt <span class="muted">— 6 titles on the back burner</span></summary>
          <div class="backburner-list">
            <span>Mostly Harmless Algorithms</span>
            <span>Mostly Harmless Compilers</span>
            <span>How to Think Like a Computer Scientist</span>
            <span>Beautiful Algorithms</span>
            <span>The Hacker Guide to Coding</span>
            <span>Languages and Computation</span>
          </div>
        </details>
      `,
      crumb:'~/library'
    },

    {
      id:'research',
      lines:[
        { kind:'prompt', text:'grep -r "neurosymbolic" ~/research/' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Research</span> <span class="muted">— neurosymbolic · NLP · ML democratization</span></p>
        <p style="margin:10px 0 0;max-width:68ch;color:#d4ddd4">
          My PhD was on knowledge discovery for natural language. These days I work
          on <span class="amber">neurosymbolic architectures</span> — getting LLMs to
          cooperate with structured knowledge, symbolic solvers, and classical AI.
          Find the papers on:
        </p>
        <div class="links">
          <a href="https://scholar.google.com/citations?user=" target="_blank" rel="noopener">Google Scholar</a>
          <a href="https://orcid.org/0000-0001-9522-3239" target="_blank" rel="noopener">ORCID · 0000-0001-9522-3239</a>
          <a href="https://dblp.org" target="_blank" rel="noopener">DBLP</a>
          <a href="cv.pdf">CV (PDF)</a>
        </div>
      `,
      crumb:'~/research'
    },

    {
      id:'projects',
      lines:[
        { kind:'prompt', text:'gh repo list apiad --limit 30 --sort updated' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Projects</span> <span class="muted">— <a href="https://github.com/apiad" style="color:var(--accent);text-decoration:none">github.com/apiad</a> · <span id="gh-count">92 repos</span></span></p>
        <div class="repo-carousel" id="repo-carousel">
          <div class="grid repo-grid" id="repo-grid" aria-live="polite"></div>
          <div class="now-ctrl">
            <button class="now-btn" data-repo="prev" aria-label="Previous page">‹</button>
            <div class="now-dots" id="repo-dots"></div>
            <button class="now-btn" data-repo="next" aria-label="Next page">›</button>
            <span class="now-idx" id="repo-idx">1/5</span>
          </div>
        </div>
      `,
      crumb:'~/projects'
    },

    {
      id:'talks',
      lines:[
        { kind:'prompt', text:'cat talks.log | sort -r' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Talks &amp; publications</span> <span class="muted">— selected</span></p>
        <div class="rows">
          <a class="row" href="#">
            <span class="date">2025</span>
            <span class="title">Neurosymbolic reasoning in the age of LLMs<small>Invited keynote · LatinX in AI @ NeurIPS</small></span>
            <span class="arrow">SLIDES →</span>
          </a>
          <a class="row" href="#">
            <span class="date">2024</span>
            <span class="title">AutoGOAL: evolutionary AutoML for low-resource teams<small>Knowledge-Based Systems · Elsevier</small></span>
            <span class="arrow">PAPER →</span>
          </a>
          <a class="row" href="#">
            <span class="date">2024</span>
            <span class="title">Teaching AI in the global south<small>Workshop · AAAI Educational Track</small></span>
            <span class="arrow">PAPER →</span>
          </a>
          <a class="row" href="#">
            <span class="date">2023</span>
            <span class="title">eHealth-KD: knowledge discovery for Spanish health text<small>IberLEF shared task · co-organizer</small></span>
            <span class="arrow">PAPER →</span>
          </a>
          <a class="row" href="#">
            <span class="date">2022</span>
            <span class="title">A semantic framework for knowledge graph extraction<small>Natural Language Engineering</small></span>
            <span class="arrow">PAPER →</span>
          </a>
        </div>
      `,
      crumb:'~/talks'
    },

    {
      id:'elsewhere',
      lines:[
        { kind:'prompt', text:'curl -s apiad.net/links | jq .' },
      ],
      render:`
        <p class="sh-line"><span class="tag">##</span> <span class="arg">Elsewhere</span> <span class="muted">— the usual suspects</span></p>
        <div class="links">
          <a href="https://blog.apiad.net">Substack</a>
          <a href="https://github.com/apiad">GitHub</a>
          <a href="https://linkedin.com/in/apiad">LinkedIn</a>
          <a href="https://scholar.google.com">Google&nbsp;Scholar</a>
          <a href="https://orcid.org/0000-0001-9522-3239">ORCID</a>
          <a href="https://t.me/apiad">Telegram</a>
          <a href="https://bsky.app/profile/apiad.net">Bluesky</a>
          <a href="https://twitter.com/alepiad">X / Twitter</a>
          <a href="mailto:hello@apiad.net">hello@apiad.net</a>
        </div>
        <div class="foot">
          <span>© 2026 Alejandro Piad Morffis · Havana 🇨🇺</span>
          <span>made with ai in havana, cuba · <span class="green online-ind">●</span> online</span>
        </div>
        <p class="ln prompt" style="margin-top:24px"><a href="https://blog.apiad.net/subscribe" class="follow-link">follow me</a> for <span class="follow-rot" id="follow-rot" aria-live="polite"></span><span class="caret-blink">_</span></p>
      `,
      crumb:'~/elsewhere'
    },
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
      // bootstrap carousel if this scene contains one
      const car = block.querySelector('.now-carousel');
      if(car && !car.dataset.inited){ initNowCarousel(car); }
      const rc = block.querySelector('.repo-carousel');
      if(rc && !rc.dataset.inited){ initRepoCarousel(rc); }
      const rain = block.querySelector('#rain-canvas');
      if(rain && !rain.dataset.inited){ initMatrixRain(rain); }
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
    const WORDS = ['AI','LLM','CODE','PYTHON','RUST','LISP','PROLOG','HACK','LOGIC','NEURO','SYMBOL','COMPILE','GRAPH','RAG','HAVANA','APIAD','ENTROPY','LAMBDA','TOKEN'];

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
  const REPO_SEED = [
    {name:'beaver', owner:'syalia-srl', desc:'All-in-one pure-python embedded DB for relational, document, vector, graph & event data on SQLite.', lang:'Python', stars:35, forks:10},
    {name:'opencode', owner:'apiad', desc:'Powerful setup for AI-powered repositories.', lang:'Shell', stars:21, forks:4},
    {name:'tesserax', owner:'apiad', desc:'A Pythonic library for scientific visualization in SVG.', lang:'Python', stars:19, forks:2},
    {name:'illiterate', owner:'apiad', desc:'Unobtrusive literate programming experience for pragmatists.', lang:'Rust', stars:17, forks:3},
    {name:'violetear', owner:'apiad', desc:'The full-stack web framework for Pythonistas.', lang:'Python', stars:12, forks:2},
    {name:'lingo', owner:'gia-uh', desc:'A Python library for context engineering.', lang:'Python', stars:4, forks:3},
  ];
  // placeholder pages 2-5 — replaced once GitHub API responds
  function seedPlaceholders(){
    const out = [...REPO_SEED];
    const tags = ['autogoal','ehealthkd','knowledge-graph','pydsl','micro-nlp','grammar-tools','semantic-probe','symbolic-llm','havana-bench','pytree','tiny-rag','embedding-lab','cortex','mindful','tfidf-redux','lexer-101','prolog-ish','gia-corpus','kb-export','notepad','paperclip','agent-cli','compiler-toys','snippets'];
    for(let i=0;i<24;i++){
      out.push({name:tags[i]||'repo-'+(i+1), owner:i%3===0?'gia-uh':(i%3===1?'syalia-srl':'apiad'), desc:'—', lang:i%2?'Python':'TypeScript', stars:Math.floor(Math.random()*30), forks:Math.floor(Math.random()*6), _ph:true});
    }
    return out;
  }
  let REPOS = seedPlaceholders();
  const PAGE_SIZE = 6, PAGES = 5;

  function repoCard(r){
    const full = r.owner && r.owner !== 'apiad' ? r.owner+'/'+r.name : r.name;
    const h3 = r.owner && r.owner !== 'apiad'
      ? `<span class="scope">${r.owner}/</span>${r.name}`
      : r.name;
    const url = `https://github.com/${r.owner||'apiad'}/${r.name}`;
    const ph = r._ph ? ' data-ph="1"' : '';
    return `<a class="card"${ph} href="${url}" target="_blank" rel="noopener">
      <span class="lang" data-l="${r.lang||''}">${r.lang||''}</span>
      <h3>${h3}</h3>
      <p>${r.desc||'—'}</p>
      <div class="meta"><span class="star">${r.stars||0}</span><span class="fork">${r.forks||0}</span></div>
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
    // fetch live data
    fetchRepos().then(list=>{
      if(!list || !list.length) return;
      REPOS = list.slice(0, PAGE_SIZE*PAGES);
      // top up with placeholders if fewer than needed
      while(REPOS.length < PAGE_SIZE*PAGES) REPOS.push({name:'—', owner:'apiad', desc:'—', lang:'', stars:0, forks:0, _ph:true});
      const cnt = document.getElementById('gh-count');
      if(cnt) cnt.textContent = REPOS.length+'+ repos';
      render();
    }).catch(()=>{});
  }

  async function fetchRepos(){
    try{
      const r = await fetch('https://api.github.com/users/apiad/repos?per_page=100&sort=updated', {headers:{'Accept':'application/vnd.github+json'}});
      if(!r.ok) return null;
      const data = await r.json();
      return data
        .filter(x=>!x.fork)
        .sort((a,b)=> (b.stargazers_count||0) - (a.stargazers_count||0))
        .map(x=>({
          name:x.name,
          owner:x.owner?.login || 'apiad',
          desc:x.description || '—',
          lang:x.language || '',
          stars:x.stargazers_count||0,
          forks:x.forks_count||0,
        }));
    }catch(e){ return null; }
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
  const NAV_IDS = ['about','now','writing','library','research','projects','talks','elsewhere'];

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
    const hh = String((now.getUTCHours()+24-4)%24).padStart(2,'0');
    const mm = String(now.getUTCMinutes()).padStart(2,'0');
    const ss = String(now.getUTCSeconds()).padStart(2,'0');
    const el = document.getElementById('localtime');
    if(el) el.textContent = 'havana · '+hh+':'+mm+':'+ss;
  }
  tick(); setInterval(tick, 1000);

  // ---- rotating "follow me for ..." line ------------------------------
  (function followRotator(){
    const WORDS = [
      'research',
      'coding tips',
      'unhyped ai news',
      'hot takes',
      'neurosymbolic ai',
      'compiler trivia',
      'havana dispatches',
      'deep dives',
      'occasional rants',
    ];
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
