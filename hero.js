(() => {
  const termBody = document.getElementById("termBody");
  const input = document.getElementById("cmd");
  const suggest = document.getElementById("suggest");

  // Mobile: tap ONLY on the command bar opens the menu (avoid iOS zoom on input)
  const termInputEl = document.getElementById("termInput");
  function termInputTapBound(){
    if(!isTouch || !termInputEl) return;
    termInputEl.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      if (busy) return;

      input.blur();
      input.value = "";
      input.placeholder = MOBILE_HINT;
      openSuggest([...COMMANDS]);
    }, { passive:false });
  }


  // === Intro flow (loader -> splash -> enter -> loader -> app) ===
  const appEl = document.getElementById("app");
  const introEl = document.getElementById("intro");
  const introLoader = document.getElementById("introLoader");
  const introSplash = document.getElementById("introSplash");
  const enterBtn = document.getElementById("enterBtn");
  const introBar = document.getElementById("introBar");
  const introPct = document.getElementById("introPct");

  function renderIntroBar(pct, width=18){
    const filled = Math.round((pct/100)*width);
    const empty = Math.max(0, width - filled);
    return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
  }

  async function runIntroLoader(label="initializing", ms=1100){
    if(!introLoader) return;
    // update label inside loader (3rd span is the label container)
    const spans = introLoader.querySelectorAll(".label");
    if(spans && spans[2]) spans[2].textContent = " " + label + " ";
    introLoader.style.display = "grid";
    if(introSplash) introSplash.style.display = "none";

    const tick = 55;
    const steps = Math.max(10, Math.floor(ms / tick));
    let i = 0;
    let pct = 0;

    const width = (window.matchMedia?.("(max-width: 520px)").matches) ? 12 : 18;
    introBar.textContent = renderIntroBar(0, width);
    introPct.textContent = "0%";

    const timer = setInterval(()=>{
      i++;
      pct = Math.min(100, Math.round((i/steps)*100));
      introBar.textContent = renderIntroBar(pct, width);
      introPct.textContent = pct + "%";
      if(pct >= 100) clearInterval(timer);
    }, tick);

    await new Promise(r=>setTimeout(r, ms));
    clearInterval(timer);
    introBar.textContent = renderIntroBar(100, width);
    introPct.textContent = "100%";
    await new Promise(r=>setTimeout(r, 220));
  }


  function introParallaxBind(){
    if(!introEl || !introSplash) return;
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    if(!fine) return;

    function onMove(e){
      if(introEl.style.display === "none") return;
      const rect = introSplash.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const dx = (e.clientX - cx) / (rect.width/2);
      const dy = (e.clientY - cy) / (rect.height/2);
      // Bend opposite cursor (invert)
      const rx = (-dy * 2.2);
      const ry = (-dx * 3.0);
      introSplash.style.setProperty("--introTX", ry.toFixed(2) + "deg");
      introSplash.style.setProperty("--introTY", rx.toFixed(2) + "deg");
    }
    function onLeave(){
      introSplash.style.setProperty("--introTX","0deg");
      introSplash.style.setProperty("--introTY","0deg");
    }

    window.addEventListener("pointermove", onMove, { passive:true });
    window.addEventListener("pointerleave", onLeave, { passive:true });
  }

  async function showSplash(){
    introLoader.style.display = "none";
    introSplash.style.display = "block";
    introSplash.setAttribute("aria-hidden","false");
  }

  

// === Rabbit Hunt (Desktop only) ===
function initRabbitHunt(){
  const mql = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
  if(!mql.matches) return;

  const TOTAL = 7;
  const KEY = "oaxsun_rabbits_found_v1";

  let found = 0;
  try { found = Math.max(0, Math.min(TOTAL, parseInt(localStorage.getItem(KEY) || "0", 10))); } catch(_) {}

  // HUD
  const hud = document.createElement("div");
  hud.className = "rabbit-hud";
  hud.innerHTML = `<span class="rabbit-hud-label">RABBIT HUNT</span><span class="rabbit-hud-count">${found}/${TOTAL}</span>`;
  document.body.appendChild(hud);

  // Layer (document-sized)
  const layer = document.createElement("div");
  layer.className = "rabbit-layer";
  document.body.appendChild(layer);

  function docHeight(){
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
  }

  function updateLayerSize(){
    layer.style.height = docHeight() + "px";
  }
  updateLayerSize();
  window.addEventListener("resize", updateLayerSize, { passive:true });

  // If already completed, keep HUD but don't spawn rabbits
  if(found >= TOTAL){
    hud.classList.add("done");
    return;
  }

  const remaining = TOTAL - found;
  const rabbits = [];

  function rand(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

  // Avoid super-top area (logo/splash) a bit
  const topPadding = 120;

  for(let i=0;i<remaining;i++){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rabbit";
    b.setAttribute("aria-label", "Hidden rabbit");
    b.innerText = "🐇";

    // Place across full document height
    const x = rand(16, Math.max(16, window.innerWidth - 44));
    const y = rand(topPadding, Math.max(topPadding, docHeight() - 44));
    b.style.left = x + "px";
    b.style.top = y + "px";

    b.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();

      if(b.dataset.found === "1") return;
      b.dataset.found = "1";

      b.classList.add("found");
      setTimeout(()=> b.remove(), 260);

      found = Math.min(TOTAL, found + 1);
      try { localStorage.setItem(KEY, String(found)); } catch(_) {}

      hud.querySelector(".rabbit-hud-count").textContent = `${found}/${TOTAL}`;

      // Also print to terminal if available
      try{
        const term = document.getElementById("termBody");
        if(term){
          const line = document.createElement("div");
          line.className = "line dim";
          line.textContent = `> rabbit found (${found}/${TOTAL})`;
          term.appendChild(line);
          term.scrollTop = term.scrollHeight;
        }
      } catch(_){}

      if(found >= TOTAL){
        hud.classList.add("done");
        showRabbitWin();
      }
    });

    layer.appendChild(b);
    rabbits.push(b);
  }

  function showRabbitWin(){
    const modal = document.createElement("div");
    modal.className = "rabbit-win";
    modal.innerHTML = `
      <div class="rabbit-win-box">
        <div class="rabbit-win-title">MISSION COMPLETE</div>
        <div class="rabbit-win-text">All rabbits found. +1 respect.</div>
        <div class="rabbit-win-cmd">cmd: /contact --subject "rabbit-hunt"</div>
        <button class="rabbit-win-btn" type="button">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".rabbit-win-btn").addEventListener("click", ()=> modal.remove());
  }
}

  async async function enterApp(){
    await runIntroLoader("loading console", 900);
    // Reveal app
    introEl.style.display = "none";
    appEl.style.opacity = "1";
    appEl.style.pointerEvents = "auto";
    boot();
    initRabbitHunt();
  }

  // Start intro loader on first visit
  (async () => {
    introParallaxBind();
    await showSplash();

    // Enter button triggers the console load
    enterBtn?.addEventListener("click", async (e)=>{
      e.preventDefault();
      // Disable button while loading
      enterBtn.style.pointerEvents = "none";
      enterBtn.style.opacity = "0.7";
      await enterApp();
    });

    // Desktop keyboard: pressing Enter/Space on intro also starts the console
    let introKeyBound = false;
    if(!introKeyBound){
      introKeyBound = true;
      document.addEventListener("keydown", async (ev)=>{
        const introVisible = introEl && introEl.style.display !== "none";
        if(!introVisible) return;
        if(ev.key === "Enter" || ev.key === " "){
          ev.preventDefault();
          // mimic click behavior
          if(enterBtn){
            enterBtn.style.pointerEvents = "none";
            enterBtn.style.opacity = "0.7";
          }
          await enterApp();
        }
      }, { passive:false });
    }

  })();
  }

    


  const COMMANDS = ["about", "skymap", "solutions", "contact", "help"];

  const isTouch =
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  const DESKTOP_HINT = "Press [space] to see commands.";
  const MOBILE_HINT = "Select a command";

  // Set hint per device
  input.placeholder = isTouch ? MOBILE_HINT : DESKTOP_HINT;

  termInputTapBound();

  if (isTouch) {
    input.setAttribute("readonly", "");
    input.setAttribute("inputmode", "none");
  }

  let activeIndex = -1;
  let currentMatches = [];
  let closeTimer = null;
  let busy = false;

  const ASCII = {
        ABOUT: ` █████╗ ██████╗  ██████╗ ██╗   ██╗████████╗
██╔══██╗██╔══██╗██╔═══██╗██║   ██║╚══██╔══╝
███████║██████╔╝██║   ██║██║   ██║   ██║
██╔══██║██╔══██╗██║   ██║██║   ██║   ██║
██║  ██║██████╔╝╚██████╔╝╚██████╔╝   ██║
╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚═════╝    ╚═╝`,
    SKYMAP: `███████╗██╗  ██╗██╗   ██╗███╗   ███╗ █████╗ ██████╗
██╔════╝██║ ██╔╝╚██╗ ██╔╝████╗ ████║██╔══██╗██╔══██╗
███████╗█████╔╝  ╚████╔╝ ██╔████╔██║███████║██████╔╝
╚════██║██╔═██╗   ╚██╔╝  ██║╚██╔╝██║██╔══██║██╔═══╝
███████║██║  ██╗   ██║   ██║ ╚═╝ ██║██║  ██║██║
╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝`,
    SOLUTIONS: `███████╗ ██████╗ ██╗     ██╗   ██╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔════╝██╔═══██╗██║     ██║   ██║╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
███████╗██║   ██║██║     ██║   ██║   ██║   ██║██║   ██║██╔██╗ ██║███████╗
╚════██║██║   ██║██║     ██║   ██║   ██║   ██║██║   ██║██║╚██╗██║╚════██║
███████║╚██████╔╝███████╗╚██████╔╝   ██║   ██║╚██████╔╝██║ ╚████║███████║
╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝    ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝`,
    PRODUCTS: `██████╗ ██████╗  ██████╗ ██████╗ ██╗   ██╗ ██████╗████████╗███████╗
██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║   ██║██╔════╝╚══██╔══╝██╔════╝
██████╔╝██████╔╝██║   ██║██║  ██║██║   ██║██║        ██║   ███████╗
██╔═══╝ ██╔══██╗██║   ██║██║  ██║██║   ██║██║        ██║   ╚════██║
██║     ██║  ██║╚██████╔╝██████╔╝╚██████╔╝╚██████╗   ██║   ███████║
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝   ╚══════╝`,
    SERVICES: `███████╗███████╗██████╗ ██╗   ██╗██╗ ██████╗███████╗███████╗
██╔════╝██╔════╝██╔══██╗██║   ██║██║██╔════╝██╔════╝██╔════╝
███████╗█████╗  ██████╔╝██║   ██║██║██║     █████╗  ███████╗
╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██║██║     ██╔══╝  ╚════██║
███████║███████╗██║  ██║ ╚████╔╝ ██║╚██████╗███████╗███████║
╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚═╝ ╚═════╝╚══════╝╚══════╝`,
    WORK: `██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗
██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝
██║ █╗ ██║██║   ██║██████╔╝█████╔╝
██║███╗██║██║   ██║██╔══██╗██╔═██╗
╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗
 ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝`,
    CONTACT: ` ██████╗ ██████╗ ███╗   ██╗████████╗ █████╗  ██████╗████████╗
██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔════╝╚══██╔══╝
██║     ██║   ██║██╔██╗ ██║   ██║   ███████║██║        ██║
██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██║██║        ██║
╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚██████╗   ██║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝   ╚═╝`,
    HELP: `██╗  ██╗███████╗██╗     ██████╗
██║  ██║██╔════╝██║     ██╔══██╗
███████║█████╗  ██║     ██████╔╝
██╔══██║██╔══╝  ██║     ██╔═══╝
██║  ██║███████╗███████╗██║
╚═╝  ╚═╝╚══════╝╚══════╝╚═╝`,
    ERROR: `███████╗██████╗ ██████╗  ██████╗ ██████╗
██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
█████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗
███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝`,
  };

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function scrollToBottom(){ termBody.scrollTop = termBody.scrollHeight; }

  function line(html, cls="line"){
    const el = document.createElement("div");
    el.className = cls;
    el.innerHTML = html;
    termBody.appendChild(el);
    scrollToBottom();
    return el;
  }

  function blockContainer(){
    const el = document.createElement("div");
    el.className = "block fax";
    termBody.appendChild(el);
    scrollToBottom();
    return el;
  }

  function echoCommand(cmd){
    line(`<span class="accent">></span> ${escapeHtml(cmd)}`);
  }

  function asciiTitle(name){
    const key = name.toUpperCase();
    const art = ASCII[key] || ASCII.ERROR;
    return `<pre class="section-ascii">${escapeHtml(art)}</pre>`;
  }

  function openSuggest(matches){
    currentMatches = matches;
    activeIndex = matches.length ? 0 : -1;

    suggest.innerHTML = "";
    for(let i=0;i<matches.length;i++){
      const c = matches[i];
      const item = document.createElement("div");
      item.className = "item" + (i===activeIndex ? " active" : "");
      item.setAttribute("role","option");
      item.setAttribute("aria-selected", i===activeIndex ? "true" : "false");
      item.innerHTML = `<span>/${escapeHtml(c)}</span>`;
      item.addEventListener("pointerdown",(e)=>{
        e.preventDefault();
        submit(c);
      });
      suggest.appendChild(item);
    }

    if(matches.length) suggest.classList.add("open");
    else suggest.classList.remove("open");
  }

  function closeSuggestSoon(){
    clearTimeout(closeTimer);
    closeTimer = setTimeout(()=>suggest.classList.remove("open"), 120);
  }

  function setActive(i){
    if(!currentMatches.length) return;
    activeIndex = (i + currentMatches.length) % currentMatches.length;
    [...suggest.querySelectorAll(".item")].forEach((el,idx)=>{
      el.classList.toggle("active", idx===activeIndex);
      el.setAttribute("aria-selected", idx===activeIndex ? "true" : "false");
    });
  }

  function refreshSuggest(){
    const v = input.value.trim().toLowerCase();
    const matches = v ? COMMANDS.filter(c=>c.startsWith(v)) : [...COMMANDS];
    openSuggest(matches);
  }

  function disableInput(disabled){
    busy = disabled;
    input.disabled = disabled;
    if(disabled) input.blur();
  }

  function renderBar(pct, width){
    const filled = Math.round((pct/100)*width);
    const empty = Math.max(0, width - filled);
    return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
  }

  function loaderBarWidth(){
    // Smaller on mobile to avoid overflow
    return isTouch ? 10 : 18;
  }

  function showRetroLoader(taskLabel){
    const wrap = document.createElement("div");
    wrap.className = "loader";
    wrap.innerHTML = `
      <span class="label dim">·</span>
      <span class="label">sys</span>
      <span class="label"> ${escapeHtml(taskLabel)} </span>
      <span class="bar">${renderBar(0, loaderBarWidth())}</span>
      <span class="pct dim">0%</span>
    `;
    termBody.appendChild(wrap);
    scrollToBottom();
    return {
      wrap,
      barEl: wrap.querySelector(".bar"),
      pctEl: wrap.querySelector(".pct"),
    };
  }

  async function runWithLoader(taskLabel, ms=900){
    disableInput(true);

    const { wrap, barEl, pctEl } = showRetroLoader(taskLabel);
    let pct = 0;

    const tick = 55;
    const steps = Math.max(8, Math.floor(ms / tick));
    let i = 0;

    const timer = setInterval(()=>{
      i++;
      pct = Math.min(100, Math.round((i/steps)*100));
      barEl.textContent = renderBar(pct, loaderBarWidth());
      pctEl.textContent = pct + "%";
      scrollToBottom();
      if(pct >= 100) clearInterval(timer);
    }, tick);

    await new Promise(r=>setTimeout(r, ms));
    clearInterval(timer);
    barEl.textContent = renderBar(100, loaderBarWidth());
    pctEl.textContent = "100%";

    await new Promise(r=>setTimeout(r, 220));
    wrap.remove();

    disableInput(false);
  }

  async function faxPrint(cmd, titleKey, linesArr){
    await runWithLoader(`switch ${cmd} app`, 950);

    const box = blockContainer();
    box.insertAdjacentHTML("beforeend", asciiTitle(titleKey));

    let delay = 60;
    for(const l of linesArr){
      const ln = document.createElement("div");
      ln.className = "line fax-line";
      ln.style.animationDelay = delay + "ms";
      ln.innerHTML = l;
      box.appendChild(ln);
      delay += 90;
    }
    scrollToBottom();
  }

  async function boot(){
    termBody.innerHTML = "";
    line(`<span class="dim">Booting OAXSUN TECHNOLOGIES...</span>`);
    await wait(900);

    line(`<span class="dim">Connecting to port 0000...</span>`);
    await wait(900);

    line(`<span class="dim">Connection successfull</span>`);
    await wait(500);

    line(`<span class="dim">App started</span>`);
    await wait(400);

    const box = blockContainer();
    box.innerHTML = `<div class="line">Welcome to <span class="accent">Oaxsun Technologies</span>. Here you can discover who we are and what we have to offer you.</div><div class="line">&nbsp;</div><div class="line dim">Available commands:</div><div class="line"><span class="accent">/about</span> <span class="accent">/skymap</span> <span class="accent">/solutions</span> <span class="accent">/contact</span> <span class="accent">/help</span></div><div class="line">&nbsp;</div><div class="line dim">Enter a command to start. . .</div>`;
  }

  function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

  async function respond(cmdRaw){
    const cmd = cmdRaw.trim().toLowerCase();
    if(!cmd) return;

    if(!COMMANDS.includes(cmd)){
      await faxPrint(cmd, "ERROR", [
        `<span class="accent">Command not found:</span> <span class="dim">${escapeHtml(cmd)}</span>`,
        `<span class="dim">Try:</span> <span class="accent">help</span> <span class="dim">or</span> <span class="accent">help</span>`
      ]);
      return;
    }

    switch(cmd){
      
      case "about":
        await faxPrint("about", "ABOUT", [
          `<span class="dim">We are</span> <span class="accent">Oaxsun Technologies</span><span class="dim">, proudly founded in</span> <span class="accent">Toronto, Canada</span><span class="dim">.</span>`,
          `<span class="dim">We are a software development company focused on delivering</span> <span class="accent">solutions</span><span class="dim">—not just code.</span>`,
          `<span class="dim">From idea to launch, we help teams ship faster with clean architecture, modern UI, and performance-first engineering.</span>`,
          `<span class="dim">We care about clarity, velocity, and measurable impact: better conversions, better retention, better search visibility.</span>`,
          `<span class="dim">&nbsp;</span>`,
          `<span class="accent">Mission:</span> <span class="dim">Build reliable software that helps businesses grow through speed, clarity, and measurable results.</span>`,
          `<span class="dim">&nbsp;</span>`,
          `<span class="accent">Vision:</span> <span class="dim">Become a trusted global partner for modern web, mobile, and SEO solutions—crafted with care and performance-first thinking.</span>`
        ]);
        break;

      
      
      case "skymap":
        await faxPrint("skymap", "SKYMAP", [
          `<span class="dim">A personalized</span> <span class="accent">star map</span> <span class="dim">generated from your date, location and story.</span>`,
          `<span class="dim">Perfect for gifts, anniversaries, milestones, and memories.</span>`,
          `<span class="dim">Get your star map for just <span class="accent">$1</span> — one of the best prices online.</span>`,
          `<a class="btn" href="https://eduardojmnz.github.io/skymap" target="_blank" rel="noopener noreferrer">Open SkyMap</a>`
        ]);
        break;

case "solutions":
        await faxPrint("solutions", "SOLUTIONS", [
                  `<span class="dim">We design and build end-to-end digital products—fast, scalable, and performance-first.</span>`,
                  `<div class="sol-grid">
                    <div class="sol-card">
                      <div class="sol-head">
                        <span class="sol-tag">[WEB]</span>
                        <span class="sol-title">LANDING / E-COMMERCE</span>
                        <span class="sol-status">READY</span>
                      </div>
                      <div class="sol-body">
                        <div>+ Design & build fast</div>
                        <div>+ Performance + Core Web Vitals</div>
                        <div>+ Integrations: forms / analytics</div>
                      </div>
                      <div class="sol-cmd"><span class="dim">cmd:</span> <span class="accent">/contact</span> <span class="dim">--service web</span></div>
                    </div>
        
                    <div class="sol-card">
                      <div class="sol-head">
                        <span class="sol-tag">[APP]</span>
                        <span class="sol-title">MOBILE / WEB APP</span>
                        <span class="sol-status">READY</span>
                      </div>
                      <div class="sol-body">
                        <div>+ MVPs, dashboards, admin panels</div>
                        <div>+ Auth, payments, APIs</div>
                        <div>+ Deploy & maintenance</div>
                      </div>
                      <div class="sol-cmd"><span class="dim">cmd:</span> <span class="accent">/contact</span> <span class="dim">--service app</span></div>
                    </div>
        
                    <div class="sol-card">
                      <div class="sol-head">
                        <span class="sol-tag">[SEO]</span>
                        <span class="sol-title">SEARCH OPTIMIZATION</span>
                        <span class="sol-status">READY</span>
                      </div>
                      <div class="sol-body">
                        <div>+ Technical audit</div>
                        <div>+ Content + structure</div>
                        <div>+ Indexing + analytics</div>
                      </div>
                      <div class="sol-cmd"><span class="dim">cmd:</span> <span class="accent">/contact</span> <span class="dim">--service seo</span></div>
                    </div>
                  </div>`
                ]);
        break;

case "work":
        await faxPrint("work", "WORK", [
          `<span class="dim">Selected projects and case studies.</span>`,
          `<span class="dim">(placeholder)</span>`
        ]);
        break;

      case "contact":
        await faxPrint("contact", "CONTACT", [
          `<span class="dim">Email:</span> <a class="accent-link" href="mailto:hello@oaxsun.tech">hello@oaxsun.tech</a>`,
          `<span class="dim">Tell us what you are building and we will reply with the next steps.</span>`
        ]);
        break;

      case "help":
        await faxPrint("help", "HELP", [
          `<span class="dim">Commands:</span>`,
          `<span class="accent">/about</span> <span class="accent">/skymap</span> <span class="accent">/solutions</span> <span class="accent">/contact</span> <span class="accent">/help</span>`,
          `<span class="dim">&nbsp;</span>`,
          `<span class="dim">OAXSUN Technologies 2026 (c) All rights reserved.</span>`
        ]);
        break;
    }
  }

  function niceLabel(cmd){
    if(cmd === "skymap") return "SkyMap";
    return cmd.charAt(0).toUpperCase() + cmd.slice(1);
  }

  async function submit(valueOverride=null){
    if (busy) return;

    const raw = valueOverride ?? input.value;
    const cmd = raw.trim().toLowerCase();
    if(!cmd) return;

    // Replace the hint with the selected command in BOTH desktop + mobile
    input.value = niceLabel(cmd);

    echoCommand(cmd);
    suggest.classList.remove("open");

    await respond(cmd);

    // Desktop clears after run (so user can type again)
    if (!isTouch) input.value = "";
  }

  // Desktop: focus opens dropdown; allow typing
  input.addEventListener("focus", ()=>{ refreshSuggest(); });
  input.addEventListener("blur", ()=>closeSuggestSoon());
  input.addEventListener("input", ()=>{ refreshSuggest(); });

  input.addEventListener("keydown", (e)=>{
    if(isTouch) return;
    if (busy) { e.preventDefault(); return; }

    const isOpen = suggest.classList.contains("open") && currentMatches.length;

    if(e.key === "Enter"){
      e.preventDefault();
      if(isOpen && activeIndex >= 0){
        const typed = input.value.trim().toLowerCase();
        if(!typed || currentMatches[activeIndex].startsWith(typed)){
          submit(currentMatches[activeIndex]);
          return;
        }
      }
      submit();
      return;
    }

    if(e.key === "Tab"){
      e.preventDefault();
      const v = input.value.trim().toLowerCase();
      const matches = v ? COMMANDS.filter(c=>c.startsWith(v)) : [...COMMANDS];
      if(matches.length === 1) input.value = matches[0];
      openSuggest(matches);
      return;
    }

    if(e.key === "Escape"){
      suggest.classList.remove("open");
      return;
    }

    if(e.key === "ArrowDown"){
      e.preventDefault();
      if(isOpen) setActive(activeIndex + 1);
      return;
    }

    if(e.key === "ArrowUp"){
      e.preventDefault();
      if(isOpen) setActive(activeIndex - 1);
      return;
    }
  });

  // Space opens dropdown (desktop only)
  document.addEventListener("keydown", (e)=>{
    if(isTouch) return;
    if (busy) return;
    if(e.code !== "Space") return;
    if(document.activeElement === input) return;
    e.preventDefault();
    input.focus();
    openSuggest([...COMMANDS]);
  }, { passive:false });

  // Start intro loader on first visit
  (async () => {
    introParallaxBind();
    await showSplash();

    // Enter button triggers the console load
    enterBtn?.addEventListener("click", async (e)=>{
      e.preventDefault();
      // Disable button while loading
      enterBtn.style.pointerEvents = "none";
      enterBtn.style.opacity = "0.7";
      await enterApp();
    });
  })();
})();