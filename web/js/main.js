(function(){
  const canvas = document.getElementById('game');
  const game = new Game(canvas);

  // ---- DOM refs ----
  const el = id => document.getElementById(id);
  const goldEl = el('gold'), livesEl = el('lives'), waveEl = el('wave'), scoreEl = el('score');
  const shopEl = el('shop'), infoEl = el('info');
  const startBtn = el('startBtn'), pauseBtn = el('pauseBtn'), speedBtn = el('speedBtn'),
        muteBtn = el('muteBtn'), restartBtn = el('restartBtn');
  const overlay = el('overlay'), overlayTitle = el('overlay-title'),
        overlayText = el('overlay-text'), overlayBtn = el('overlay-btn');

  // ---- HUD ----
  function updateHUD(){
    goldEl.textContent = game.gold;
    livesEl.textContent = game.lives;
    waveEl.textContent = Math.max(0, game.waveIndex + 1) + '/' + WAVES.length;
    scoreEl.textContent = game.score;
    startBtn.disabled = game.waveActive;
    startBtn.style.opacity = game.waveActive ? 0.5 : 1;
    refreshShopAffordability();
  }

  // ---- shop ----
  function buildShop(){
    shopEl.innerHTML = '';
    TOWER_ORDER.forEach((id, i) => {
      const t = TOWER_TYPES[id];
      const b = document.createElement('button');
      b.className = 'shop-item';
      b.dataset.id = id;
      b.innerHTML = `<span class="emoji">${t.emoji}</span>
        <span><span class="nm">${t.name}</span><br><span class="cost">$${t.cost}</span></span>
        <span class="key">${i+1}</span>`;
      b.addEventListener('click', () => selectShop(id));
      b.addEventListener('mouseenter', () => showTowerInfo(id));
      shopEl.appendChild(b);
    });
  }
  function refreshShopAffordability(){
    [...shopEl.children].forEach(b => {
      const t = TOWER_TYPES[b.dataset.id];
      b.classList.toggle('cant', game.gold < t.cost);
      b.classList.toggle('selected', game.placingType === b.dataset.id);
    });
  }
  function selectShop(id){
    Sfx.ensure();
    game.placingType = (game.placingType === id) ? null : id;
    game.selectedTower = null;
    refreshShopAffordability();
    if (game.placingType) showTowerInfo(id); else showDefaultInfo();
    onSelectionChange();
  }

  // ---- info panel ----
  function statLine(t){
    let s = '';
    if (t.generator) s += `<div class="stat-line">💵 +$${t.generator.amount} every ${t.generator.interval}s</div>`;
    if (t.damage)    s += `<div class="stat-line">⚔️ Damage ${t.damage} · 🔁 ${t.fireRate}/s · 🎯 Range ${t.range}</div>`;
    if (t.splash)    s += `<div class="stat-line">💥 Splash radius ${t.splash}</div>`;
    if (t.slow)      s += `<div class="stat-line">🧊 Slows ${Math.round((1-t.slow.factor)*100)}% for ${t.slow.duration}s</div>`;
    return s;
  }
  function showTowerInfo(id){
    const t = TOWER_TYPES[id];
    infoEl.innerHTML = `<b>${t.emoji} ${t.name}</b> — <b>$${t.cost}</b><br>${t.desc}${statLine(t)}
      <div class="stat-line">Click an open green lot to build.</div>`;
  }
  function showDefaultInfo(){
    infoEl.innerHTML = 'Pick a defense, then click an open lot to build. Aliens follow the road to the Capitol 🏛️ — don\'t let them through.';
  }
  function showSelectedTower(t){
    const canUp = t.level < t.maxLevel;
    const upCost = t.upgradeCost();
    infoEl.innerHTML = `<b>${t.type.emoji} ${t.type.name}</b> — Lvl ${t.level}/${t.maxLevel}
      ${statLine(t)}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button id="upBtn" class="btn ${canUp?'primary':''}" style="flex:1" ${canUp?'':'disabled'}>
          ${canUp ? '⬆ Upgrade $'+upCost : 'MAX LEVEL'}
        </button>
        <button id="sellBtn" class="btn danger" style="flex:1">💵 Sell $${t.sellValue()}</button>
      </div>`;
    const upBtn = document.getElementById('upBtn');
    const sellBtn = document.getElementById('sellBtn');
    if (upBtn && canUp) upBtn.onclick = () => { game.upgradeSelected(); };
    if (sellBtn) sellBtn.onclick = () => { game.sellSelected(); };
  }

  // ---- selection / shop change callbacks ----
  function onSelectionChange(){
    if (game.selectedTower) showSelectedTower(game.selectedTower);
    else if (game.placingType) showTowerInfo(game.placingType);
    else showDefaultInfo();
    updateHUD();
  }
  game.onSelectionChange = onSelectionChange;
  game.onShopChange = refreshShopAffordability;

  // ---- end-game overlay ----
  game.onEnd = (won) => {
    overlay.classList.remove('hidden');
    if (won){
      overlayTitle.textContent = '🦅 HOMELAND SECURED! 🦅';
      overlayText.innerHTML = `You repelled all ${WAVES.length} alien waves and saved the Capitol.<br>
        Final score: <b>${game.score}</b> · Lives left: <b>${game.lives}</b>.<br><br>
        The skies are clear. Mission accomplished, Commander.`;
      overlayBtn.textContent = '🔄 Play Again';
    } else {
      overlayTitle.textContent = '🛸 THE BORDER HAS FALLEN 🛸';
      overlayText.innerHTML = `The aliens reached the Capitol. The mothership claims Earth.<br>
        You survived to wave <b>${game.waveIndex+1}</b> with a score of <b>${game.score}</b>.<br><br>
        Regroup and try again, Commander.`;
      overlayBtn.textContent = '🔄 Try Again';
    }
  };

  // ---- controls ----
  function doRestart(){
    overlay.classList.add('hidden');
    game.reset();
    showDefaultInfo();
    updateHUD();
  }
  startBtn.addEventListener('click', () => { Sfx.ensure(); game.startWave(); updateHUD(); });
  pauseBtn.addEventListener('click', () => {
    game.paused = !game.paused;
    pauseBtn.textContent = game.paused ? '▶ Resume' : '⏸ Pause';
  });
  speedBtn.addEventListener('click', () => {
    game.speed = game.speed === 1 ? 2 : (game.speed === 2 ? 3 : 1);
    speedBtn.textContent = '⏩ ' + game.speed + '×';
  });
  muteBtn.addEventListener('click', () => {
    Sfx.muted = !Sfx.muted;
    muteBtn.textContent = Sfx.muted ? '🔇 Muted' : '🔊 Sound';
  });
  restartBtn.addEventListener('click', doRestart);
  overlayBtn.addEventListener('click', doRestart);

  // ---- keyboard ----
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space'){ e.preventDefault(); game.startWave(); updateHUD(); }
    else if (e.code === 'KeyP'){ pauseBtn.click(); }
    else if (e.code === 'Escape'){ game.placingType = null; game.selectedTower = null; onSelectionChange(); }
    else if (e.key >= '1' && e.key <= '6'){
      const id = TOWER_ORDER[parseInt(e.key,10)-1];
      if (id) selectShop(id);
    }
  });

  // ---- main loop ----
  let last = performance.now();
  function loop(now){
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.05);
    const steps = game.speed;
    for (let i=0;i<steps;i++) game.update(dt);
    game.render();
    if (game.dirtyHUD){ updateHUD(); game.dirtyHUD = false; }
    requestAnimationFrame(loop);
  }

  // ---- boot ----
  buildShop();
  showDefaultInfo();
  updateHUD();
  requestAnimationFrame(loop);
})();
