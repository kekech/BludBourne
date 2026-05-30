// ===== Particle (floating text, sparks, explosions) =====
class Particle {
  constructor(x, y, opts){
    this.x = x; this.y = y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.life = opts.life || 0.6;
    this.maxLife = this.life;
    this.kind = opts.kind || 'spark';   // 'spark' | 'text' | 'ring'
    this.text = opts.text || '';
    this.color = opts.color || '#fff';
    this.size = opts.size || 3;
    this.radius = opts.radius || 30;     // for ring
    this.dead = false;
  }
  update(dt){
    this.life -= dt;
    if (this.life <= 0){ this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.kind === 'text') this.vy += 40 * dt; // gentle gravity-ish drift up then slow
  }
  draw(ctx){
    const a = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    if (this.kind === 'text'){
      ctx.font = `bold ${this.size}px Verdana`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.strokeText(this.text, this.x, this.y);
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
    } else if (this.kind === 'ring'){
      const r = lerp(4, this.radius, 1 - a);
      ctx.strokeStyle = this.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ===== Enemy =====
class Enemy {
  constructor(typeId, waypoints, hpMult){
    const t = ENEMY_TYPES[typeId];
    this.type = t;
    this.waypoints = waypoints;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.wpIndex = 1;
    this.maxHp = Math.round(t.hp * (hpMult || 1));
    this.hp = this.maxHp;
    this.baseSpeed = t.speed;
    this.bounty = t.bounty;
    this.armor = t.armor;
    this.size = t.size;
    this.distanceTraveled = 0;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.alive = true;
    this.escaped = false;
    this.wobble = Math.random() * Math.PI * 2;
  }
  applySlow(factor, duration){
    // keep the strongest active slow
    if (factor < this.slowFactor || this.slowTimer <= 0){
      this.slowFactor = factor;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }
  takeDamage(dmg, game){
    const eff = Math.max(1, Math.round(dmg - this.armor));
    this.hp -= eff;
    game.spawnParticle(new Particle(this.x + rand(-6,6), this.y - this.size*0.6, {
      kind:'text', text:'' + eff, color:'#ffe08a', size:13,
      vy:-50, life:0.6
    }));
    if (this.hp <= 0 && this.alive){
      this.alive = false;
      game.onEnemyKilled(this);
    }
  }
  update(dt, game){
    if (!this.alive) return;
    this.wobble += dt * 6;
    let speed = this.baseSpeed;
    if (this.slowTimer > 0){
      this.slowTimer -= dt;
      speed *= this.slowFactor;
    }
    let move = speed * dt;
    while (move > 0 && this.wpIndex < this.waypoints.length){
      const tgt = this.waypoints[this.wpIndex];
      const dx = tgt.x - this.x, dy = tgt.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= move){
        this.x = tgt.x; this.y = tgt.y;
        this.distanceTraveled += d;
        move -= d;
        this.wpIndex++;
      } else {
        this.x += dx / d * move;
        this.y += dy / d * move;
        this.distanceTraveled += move;
        move = 0;
      }
    }
    if (this.wpIndex >= this.waypoints.length){
      this.alive = false;
      this.escaped = true;
      game.onEnemyEscaped(this);
    }
  }
  draw(ctx){
    const bob = Math.sin(this.wobble) * 2;
    // emoji body
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.slowTimer > 0){
      ctx.save();
      ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 12;
      ctx.fillText(this.type.emoji, this.x, this.y + bob);
      ctx.restore();
    } else {
      ctx.fillText(this.type.emoji, this.x, this.y + bob);
    }
    // health bar
    const w = Math.max(this.size, 26), h = 5;
    const hx = this.x - w/2, hy = this.y - this.size*0.75 + bob;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(hx-1, hy-1, w+2, h+2);
    const frac = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = frac > 0.5 ? '#3ddc6b' : (frac > 0.25 ? '#f4c542' : '#e2553b');
    ctx.fillRect(hx, hy, w * frac, h);
  }
}

// ===== Projectile =====
class Projectile {
  constructor(tower, target){
    this.x = tower.x; this.y = tower.y;
    this.target = target;
    this.tx = target.x; this.ty = target.y;
    this.speed = tower.projectileSpeed;
    this.damage = tower.damage;
    this.splash = tower.splash;
    this.slow = tower.slow || null;
    this.color = tower.color;
    this.kind = tower.id;
    this.dead = false;
  }
  update(dt, game){
    if (this.target && this.target.alive){
      this.tx = this.target.x; this.ty = this.target.y;
    }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step){
      this.x = this.tx; this.y = this.ty;
      this.impact(game);
      this.dead = true;
    } else {
      this.x += dx / d * step;
      this.y += dy / d * step;
    }
  }
  impact(game){
    if (this.splash > 0){
      game.spawnParticle(new Particle(this.x, this.y, {
        kind:'ring', color:this.color, radius:this.splash, life:0.35
      }));
      for (let i=0;i<8;i++){
        const ang = rand(0, Math.PI*2);
        game.spawnParticle(new Particle(this.x, this.y, {
          vx:Math.cos(ang)*rand(40,140), vy:Math.sin(ang)*rand(40,140),
          color:this.color, size:rand(2,4), life:rand(0.2,0.45)
        }));
      }
      Sfx.boom();
      for (const e of game.enemies){
        if (e.alive && dist(e.x,e.y,this.x,this.y) <= this.splash){
          e.takeDamage(this.damage, game);
          if (this.slow && e.alive) e.applySlow(this.slow.factor, this.slow.duration);
        }
      }
    } else {
      if (this.target && this.target.alive){
        this.target.takeDamage(this.damage, game);
        if (this.slow && this.target.alive){
          this.target.applySlow(this.slow.factor, this.slow.duration);
          Sfx.freeze();
        }
        Sfx.hit();
        game.spawnParticle(new Particle(this.x, this.y, {
          vx:rand(-30,30), vy:rand(-30,30), color:this.color, size:rand(2,4), life:0.25
        }));
      }
    }
  }
  draw(ctx){
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.splash > 0 ? 5 : 3.5, 0, Math.PI*2);
    ctx.fill();
  }
}

// ===== Tower =====
class Tower {
  constructor(typeId, col, row){
    const t = TOWER_TYPES[typeId];
    this.type = t;
    this.id = t.id;
    this.col = col; this.row = row;
    this.x = col * CELL + CELL/2;
    this.y = row * CELL + CELL/2;
    this.level = 1;
    this.range = t.range;
    this.damage = t.damage;
    this.fireRate = t.fireRate;
    this.splash = t.splash;
    this.projectileSpeed = t.projectileSpeed;
    this.slow = t.slow ? { factor:t.slow.factor, duration:t.slow.duration } : null;
    this.generator = t.generator ? { amount:t.generator.amount, interval:t.generator.interval } : null;
    this.color = t.color;
    this.cooldown = 0;
    this.genTimer = this.generator ? this.generator.interval : 0;
    this.invested = t.cost;
    this.angle = 0;
  }
  get maxLevel(){ return this.type.maxLevel; }
  upgradeCost(){ return Math.round(this.type.cost * 0.75 * this.level); }
  sellValue(){ return Math.round(this.invested * 0.6); }
  upgrade(cost){
    this.level++;
    this.damage = Math.round(this.damage * 1.5);
    this.range = Math.round(this.range * 1.12);
    this.fireRate = +(this.fireRate * 1.08).toFixed(2);
    if (this.splash) this.splash = Math.round(this.splash * 1.1);
    if (this.slow) this.slow.duration = +(this.slow.duration * 1.12).toFixed(2);
    if (this.generator) this.generator.amount = Math.round(this.generator.amount * 1.5);
    this.invested += cost;
  }
  findTarget(game){
    let best = null, bestDist = -1;
    for (const e of game.enemies){
      if (!e.alive) continue;
      if (dist(e.x, e.y, this.x, this.y) <= this.range){
        if (e.distanceTraveled > bestDist){ bestDist = e.distanceTraveled; best = e; }
      }
    }
    return best;
  }
  update(dt, game){
    if (this.generator){
      this.genTimer -= dt;
      if (this.genTimer <= 0){
        this.genTimer += this.generator.interval;
        game.addGold(this.generator.amount);
        game.spawnParticle(new Particle(this.x, this.y - 12, {
          kind:'text', text:'+$' + this.generator.amount, color:'#3ddc6b', size:13, vy:-40, life:0.9
        }));
        Sfx.gold();
      }
      return;
    }
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.cooldown <= 0){
      const target = this.findTarget(game);
      if (target){
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        game.spawnProjectile(new Projectile(this, target));
        this.cooldown = 1 / this.fireRate;
        if (this.id === 'eagle') Sfx.snipe(); else Sfx.shoot();
      }
    }
  }
  draw(ctx, selected){
    // base
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.arc(this.x, this.y+3, 19, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(this.x, this.y, 19, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // emoji
    ctx.font = '24px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.type.emoji, this.x, this.y);
    // level pips
    for (let i=0;i<this.level;i++){
      ctx.fillStyle = '#f4c542';
      ctx.beginPath(); ctx.arc(this.x - 12 + i*8, this.y + 16, 2.6, 0, Math.PI*2); ctx.fill();
    }
    if (selected){
      ctx.strokeStyle = 'rgba(244,197,66,.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(244,197,66,.08)'; ctx.fill();
    }
  }
}
