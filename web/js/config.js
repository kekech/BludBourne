// ===== Board geometry =====
const CELL = 48;
const COLS = 18;
const ROWS = 11;
const CANVAS_W = COLS * CELL; // 864
const CANVAS_H = ROWS * CELL; // 528

const START_GOLD = 275;
const START_LIVES = 20;

// Path described as waypoints in CELL coordinates (-1 / 18 are off-screen).
// Aliens enter from the left and march to the Capitol on the right.
const PATH_WAYPOINTS_CELLS = [
  [-1, 2], [5, 2], [5, 8], [12, 8], [12, 2], [18, 2]
];

// ===== Towers ("Defenses") =====
// fireRate = shots per second. range/projectileSpeed in pixels.
const TOWER_TYPES = {
  wall: {
    id:'wall', name:'Border Wall Turret', emoji:'🧱', color:'#c98b3a',
    cost:50, range:115, damage:14, fireRate:1.3, projectileSpeed:520,
    splash:0, maxLevel:3,
    desc:'Cheap, sturdy, reliable. Bricks never call in sick.'
  },
  patrol: {
    id:'patrol', name:'Border Patrol', emoji:'🚓', color:'#3a78c9',
    cost:95, range:135, damage:8, fireRate:4.2, projectileSpeed:560,
    splash:0, maxLevel:3,
    desc:'Rapid-fire and very, very enthusiastic. Shreds fast scouts.'
  },
  ice: {
    id:'ice', name:'I.C.E. Freeze Truck', emoji:'🧊', color:'#4fd0e0',
    cost:120, range:140, damage:5, fireRate:1.6, projectileSpeed:480,
    splash:0, slow:{factor:0.5, duration:2.2}, maxLevel:3,
    desc:'Detains aliens in place. Literally freezes them. Low damage, huge utility.'
  },
  eagle: {
    id:'eagle', name:'Bald Eagle Sniper', emoji:'🦅', color:'#e8d8a0',
    cost:160, range:230, damage:60, fireRate:0.8, projectileSpeed:900,
    splash:0, maxLevel:3,
    desc:'Long-range freedom delivery. Big single-target damage, slow reload.'
  },
  tweet: {
    id:'tweet', name:'Truth Social Cannon', emoji:'📱', color:'#d04fd0',
    cost:135, range:150, damage:20, fireRate:1.0, projectileSpeed:440,
    splash:62, maxLevel:3,
    desc:'Launches viral posts. Area-of-effect splash damage to alien clusters.'
  },
  tariff: {
    id:'tariff', name:'Tariff Office', emoji:'💰', color:'#43c463',
    cost:110, range:0, damage:0, fireRate:0, projectileSpeed:0, splash:0,
    generator:{amount:28, interval:5.0}, maxLevel:3,
    desc:'Does not shoot. Prints money — collects a tariff every few seconds.'
  }
};
const TOWER_ORDER = ['wall','patrol','ice','eagle','tweet','tariff'];

// ===== Enemies ("Aliens") =====
const ENEMY_TYPES = {
  grunt: { id:'grunt', name:"Lil' Green Visa-Dodger", emoji:'👽',
    hp:60, speed:62, bounty:8, lives:1, armor:0, size:26 },
  scout: { id:'scout', name:'UFO Scout', emoji:'🛸',
    hp:38, speed:128, bounty:6, lives:1, armor:0, size:26 },
  tank:  { id:'tank', name:'Armored Invader', emoji:'👾',
    hp:300, speed:46, bounty:24, lives:2, armor:4, size:32 },
  robot: { id:'robot', name:'Deportation-Resistant Droid', emoji:'🤖',
    hp:165, speed:74, bounty:14, lives:1, armor:6, size:30 },
  boss:  { id:'boss', name:'THE MOTHERSHIP', emoji:'🛸',
    hp:4200, speed:34, bounty:250, lives:12, armor:8, size:58, boss:true }
};

// ===== Waves =====
// each group: { type, count, interval(sec between spawns), delay(sec before group starts) }
const WAVES = [
  { reward:60,  groups:[ {type:'grunt', count:8,  interval:0.9} ] },
  { reward:70,  groups:[ {type:'grunt', count:12, interval:0.75} ] },
  { reward:80,  groups:[ {type:'scout', count:14, interval:0.5}, {type:'grunt', count:6, interval:0.8, delay:6} ] },
  { reward:90,  groups:[ {type:'grunt', count:10, interval:0.6}, {type:'tank', count:1, interval:1, delay:2} ] },
  { reward:105, groups:[ {type:'scout', count:18, interval:0.45}, {type:'robot', count:3, interval:1.5, delay:4} ] },
  { reward:160, groups:[ {type:'boss', count:1, interval:1}, {type:'grunt', count:12, interval:0.6, delay:1.5} ] },
  { reward:120, groups:[ {type:'tank', count:5, interval:2.0}, {type:'scout', count:15, interval:0.5, delay:3} ] },
  { reward:135, groups:[ {type:'robot', count:8, interval:1.2}, {type:'grunt', count:15, interval:0.5} ] },
  { reward:150, groups:[ {type:'scout', count:26, interval:0.32}, {type:'tank', count:4, interval:2.4, delay:2} ] },
  { reward:175, groups:[ {type:'robot', count:12, interval:1.0}, {type:'tank', count:6, interval:2.0, delay:5} ] },
  { reward:200, groups:[ {type:'grunt', count:25, interval:0.4}, {type:'robot', count:10, interval:1.0, delay:4}, {type:'scout', count:20, interval:0.4, delay:8} ] },
  { reward:400, groups:[ {type:'boss', count:2, interval:9}, {type:'robot', count:12, interval:1.0, delay:2}, {type:'tank', count:8, interval:2.0, delay:5} ] }
];
