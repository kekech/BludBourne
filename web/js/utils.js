// ---- small helpers ----
function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
function rand(a, b){ return a + Math.random() * (b - a); }
function randInt(a, b){ return Math.floor(rand(a, b + 1)); }
function dist(ax, ay, bx, by){ return Math.hypot(ax - bx, ay - by); }
function lerp(a, b, t){ return a + (b - a) * t; }

// ---- tiny WebAudio sound effects (no asset files) ----
const Sfx = {
  ctx: null,
  muted: false,
  ensure(){
    if (!this.ctx){
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type, vol){
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime((vol || 0.06), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  shoot(){ this.tone(620, 0.05, 'square', 0.025); },
  snipe(){ this.tone(180, 0.18, 'sawtooth', 0.05); },
  hit(){ this.tone(220, 0.04, 'triangle', 0.02); },
  boom(){
    if (this.muted) return; this.ensure(); if (!this.ctx) return;
    this.tone(90, 0.25, 'sawtooth', 0.07);
    this.tone(60, 0.3, 'square', 0.05);
  },
  place(){ this.tone(440, 0.08, 'square', 0.05); this.tone(660, 0.08, 'square', 0.04); },
  gold(){ this.tone(880, 0.06, 'sine', 0.05); this.tone(1175, 0.08, 'sine', 0.04); },
  freeze(){ this.tone(1400, 0.12, 'sine', 0.03); },
  lose(){ this.tone(140, 0.3, 'sawtooth', 0.06); },
  win(){ this.tone(523,0.12,'square',0.06); this.tone(659,0.12,'square',0.06); this.tone(784,0.2,'square',0.06); },
  over(){ this.tone(200,0.5,'sawtooth',0.08); this.tone(120,0.6,'square',0.06); }
};
