class Game {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buildPath();
    this.reset();
    this.bindInput();
  }

  // ---- path / grid setup ----
  buildPath(){
    // pixel waypoints
    this.waypoints = PATH_WAYPOINTS_CELLS.map(([c, r]) => ({
      x: c * CELL + CELL/2,
      y: r * CELL + CELL/2
    }));
    // mark path cells (segments are axis-aligned)
    this.pathCells = new Set();
    for (let i = 0; i < PATH_WAYPOINTS_CELLS.length - 1; i++){
      let [c0, r0] = PATH_WAYPOINTS_CELLS[i];
      let [c1, r1] = PATH_WAYPOINTS_CELLS[i+1];
      const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      let c = c0, r = r0;
      this.markCell(c, r);
      while (c !== c1 || r !== r1){
        c += dc; r += dr;
        this.markCell(c, r);
      }
    }
  }
  markCell(c, r){
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) this.pathCells.add(c + ',' + r);
  }
  isPath(c, r){ return this.pathCells.has(c + ',' + r); }

  // ---- state ----
  reset(){
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.score = 0;
    this.waveIndex = -1;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.occupied = new Set();
    this.placingType = null;
    this.selectedTower = null;
    this.hoverCol = -1; this.hoverRow = -1;
    this.waveActive = false;
    this.spawnGroups = [];
    this.speed = 1;
    this.paused = false;
    this.gameOver = false;
    this.victory = false;
    this.message = null;
    this.messageTimer = 0;
  }

  // ---- economy / events ----
  addGold(n){ this.gold += n; this.dirtyHUD = true; }
  spend(n){ this.gold -= n; this.dirtyHUD = true; }
  spawnProjectile(p){ this.projectiles.push(p); }
  spawnParticle(p){ this.particles.push(p); }

  onEnemyKilled(e){
    this.addGold(e.bounty);
    this.score += e.bounty;
    this.dirtyHUD = true;
    this.spawnParticle(new Particle(e.x, e.y, { kind:'text', text:'+$'+e.bounty, color:'#3ddc6b', size:12, vy:-45, life:0.7 }));
    for (let i=0;i<10;i++){
      const ang = rand(0, Math.PI*2);
      this.spawnParticle(new Particle(e.x, e.y, {
        vx:Math.cos(ang)*rand(50,160), vy:Math.sin(ang)*rand(50,160),
        color: e.type.boss ? '#ff6a6a' : '#9be86b', size:rand(2,4), life:rand(0.3,0.6)
      }));
    }
    if (e.type.boss) Sfx.boom();
  }
  onEnemyEscaped(e){
    this.lives -= e.type.lives;
    this.dirtyHUD = true;
    Sfx.lose();
    this.flash('🛸 -' + e.type.lives + ' lives! Aliens breached the border!', '#ff8080');
    if (this.lives <= 0){
      this.lives = 0;
      this.endGame(false);
    }
  }

  flash(text, color){
    this.message = { text, color: color || '#fff' };
    this.messageTimer = 2.2;
  }

  // ---- waves ----
  startWave(){
    if (this.waveActive || this.gameOver || this.victory) return;
    this.waveIndex++;
    if (this.waveIndex >= WAVES.length){
      this.endGame(true);
      return;
    }
    const wave = WAVES[this.waveIndex];
    const hpMult = 1 + this.waveIndex * 0.14;
    this.spawnGroups = wave.groups.map(g => ({
      type: g.type, remaining: g.count, interval: g.interval,
      timer: (g.delay || 0), hpMult
    }));
    this.waveActive = true;
    this.dirtyHUD = true;
    this.flash('🌊 WAVE ' + (this.waveIndex+1) + ' INCOMING!', '#f4c542');
  }

  updateSpawns(dt){
    if (!this.waveActive) return;
    let stillSpawning = false;
    for (const g of this.spawnGroups){
      if (g.remaining > 0){
        stillSpawning = true;
        g.timer -= dt;
        if (g.timer <= 0){
          this.enemies.push(new Enemy(g.type, this.waypoints, g.hpMult));
          g.remaining--;
          g.timer += g.interval;
        }
      }
    }
    if (!stillSpawning && this.enemies.length === 0){
      // wave cleared
      this.waveActive = false;
      const reward = WAVES[this.waveIndex].reward;
      this.addGold(reward);
      this.flash('✅ Wave cleared! +$' + reward, '#3ddc6b');
      Sfx.gold();
      if (this.waveIndex >= WAVES.length - 1){
        this.endGame(true);
      }
    }
  }

  endGame(won){
    if (this.gameOver || this.victory) return;
    if (won){ this.victory = true; Sfx.win(); }
    else { this.gameOver = true; Sfx.over(); }
    if (this.onEnd) this.onEnd(won);
  }

  // ---- placement / selection ----
  canBuildAt(col, row){
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    if (this.isPath(col, row)) return false;
    if (this.occupied.has(col + ',' + row)) return false;
    return true;
  }
  tryPlace(col, row){
    if (!this.placingType) return;
    const t = TOWER_TYPES[this.placingType];
    if (!this.canBuildAt(col, row)){ Sfx.lose(); return; }
    if (this.gold < t.cost){ this.flash('Not enough money!', '#ff8080'); Sfx.lose(); return; }
    const tower = new Tower(this.placingType, col, row);
    this.towers.push(tower);
    this.occupied.add(col + ',' + row);
    this.spend(t.cost);
    Sfx.place();
    this.selectedTower = tower;
    if (this.onSelectionChange) this.onSelectionChange();
    if (this.onShopChange) this.onShopChange();
  }
  towerAt(col, row){
    return this.towers.find(t => t.col === col && t.row === row) || null;
  }
  upgradeSelected(){
    const t = this.selectedTower;
    if (!t || t.level >= t.maxLevel) return;
    const cost = t.upgradeCost();
    if (this.gold < cost){ this.flash('Not enough money!', '#ff8080'); Sfx.lose(); return; }
    this.spend(cost);
    t.upgrade(cost);
    Sfx.place();
    if (this.onSelectionChange) this.onSelectionChange();
  }
  sellSelected(){
    const t = this.selectedTower;
    if (!t) return;
    this.addGold(t.sellValue());
    this.occupied.delete(t.col + ',' + t.row);
    this.towers = this.towers.filter(x => x !== t);
    this.selectedTower = null;
    Sfx.gold();
    if (this.onSelectionChange) this.onSelectionChange();
    if (this.onShopChange) this.onShopChange();
  }

  // ---- main update ----
  update(dt){
    if (this.paused || this.gameOver || this.victory) return;
    this.updateSpawns(dt);
    for (const t of this.towers) t.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const pa of this.particles) pa.update(dt);
    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.particles = this.particles.filter(p => !p.dead);
    if (this.messageTimer > 0){ this.messageTimer -= dt; if (this.messageTimer <= 0) this.message = null; }
  }

  // ---- render ----
  render(){
    const ctx = this.ctx;
    this.drawBackground(ctx);
    this.drawPath(ctx);
    // build preview
    if (this.placingType && this.hoverCol >= 0){
      this.drawPlacePreview(ctx);
    }
    for (const t of this.towers) t.draw(ctx, t === this.selectedTower);
    for (const e of this.enemies) e.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const pa of this.particles) pa.draw(ctx);
    if (this.message) this.drawMessage(ctx);
  }

  drawBackground(ctx){
    ctx.fillStyle = '#24331c';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // grid of buildable lots
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        if (this.isPath(c,r)) continue;
        ctx.fillStyle = ((c+r)%2===0) ? '#2b3d20' : '#28391e';
        ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
        ctx.strokeStyle = 'rgba(0,0,0,.12)';
        ctx.strokeRect(c*CELL+0.5, r*CELL+0.5, CELL, CELL);
      }
    }
  }

  drawPath(ctx){
    // road
    for (const key of this.pathCells){
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = '#5a4632';
      ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      ctx.fillRect(c*CELL, r*CELL, CELL, 4);
    }
    // dashed center line
    ctx.strokeStyle = 'rgba(244,197,66,.5)';
    ctx.lineWidth = 3; ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(this.waypoints[0].x, this.waypoints[0].y);
    for (let i=1;i<this.waypoints.length;i++) ctx.lineTo(this.waypoints[i].x, this.waypoints[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    // entrance + Capitol
    const start = this.waypoints[0], end = this.waypoints[this.waypoints.length-1];
    ctx.font = '30px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🛸', start.x+14, start.y);     // aliens arrive
    ctx.font = '34px serif';
    ctx.fillText('🏛️', end.x-18, end.y);          // the Capitol (goal)
  }

  drawPlacePreview(ctx){
    const c = this.hoverCol, r = this.hoverRow;
    const ok = this.canBuildAt(c, r) && this.gold >= TOWER_TYPES[this.placingType].cost;
    const x = c*CELL + CELL/2, y = r*CELL + CELL/2;
    const range = TOWER_TYPES[this.placingType].range;
    ctx.fillStyle = ok ? 'rgba(70,220,120,.25)' : 'rgba(220,70,70,.3)';
    ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
    if (range > 0){
      ctx.strokeStyle = ok ? 'rgba(70,220,120,.7)' : 'rgba(220,70,70,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI*2); ctx.stroke();
    }
    ctx.font = '24px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.globalAlpha = 0.7;
    ctx.fillText(TOWER_TYPES[this.placingType].emoji, x, y);
    ctx.globalAlpha = 1;
  }

  drawMessage(ctx){
    const a = clamp(this.messageTimer / 0.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 26px Verdana'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.strokeText(this.message.text, CANVAS_W/2, 40);
    ctx.fillStyle = this.message.color;
    ctx.fillText(this.message.text, CANVAS_W/2, 40);
    ctx.restore();
  }

  // ---- input ----
  bindInput(){
    const cv = this.canvas;
    const toCell = (ev) => {
      const rect = cv.getBoundingClientRect();
      const sx = cv.width / rect.width, sy = cv.height / rect.height;
      const x = (ev.clientX - rect.left) * sx;
      const y = (ev.clientY - rect.top) * sy;
      return { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
    };
    cv.addEventListener('mousemove', (ev) => {
      const { col, row } = toCell(ev);
      this.hoverCol = col; this.hoverRow = row;
    });
    cv.addEventListener('mouseleave', () => { this.hoverCol = -1; this.hoverRow = -1; });
    cv.addEventListener('click', (ev) => {
      Sfx.ensure();
      const { col, row } = toCell(ev);
      if (this.placingType){
        this.tryPlace(col, row);
        return;
      }
      const t = this.towerAt(col, row);
      this.selectedTower = t;
      if (this.onSelectionChange) this.onSelectionChange();
    });
  }
}
