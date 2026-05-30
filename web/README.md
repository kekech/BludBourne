# 🇺🇸 TOWER FORCE ONE 🛸

A satirical, fully web-based **tower defense** game in the spirit of WC3 / Elements TD.

> **The premise (and the joke):** Defend the Homeland from *illegal aliens* — the
> literal outer-space kind. Little green men, UFO scouts, and motherships are sneaking
> into US airspace without a visa, and they're marching straight for the Capitol 🏛️.
> The satire lives in the absurdist *Mars Attacks!*-meets-campaign-rally framing, not in
> punching down at real people.

## Run it

No build step, no dependencies. Either:

- **Open `index.html` directly** in a browser, or
- Serve the folder, e.g. `python3 -m http.server` from `web/` and visit the printed URL.

It's pure HTML5 `<canvas>` + vanilla JS, so it also drops straight onto GitHub Pages.

## How to play

1. Pick a **defense** from the shop (or press `1`–`6`).
2. Click an open green lot to build it. Towers can't go on the road.
3. Press **Start Wave** (or `Space`) to send in the aliens.
4. Kill aliens for 💰. Spend it on more towers and **upgrades**.
5. Don't let aliens reach the Capitol — each one that breaches costs ❤️ lives.
6. Survive all 12 waves (including two **Mothership** bosses) to win.

Click any built tower to **upgrade** (Lvl 1→3) or **sell** it (60% refund).

### Hotkeys
`1`–`6` build · `Space` start wave · `P` pause · `Esc` cancel placement

## The arsenal

| Defense | Role |
|---|---|
| 🧱 **Border Wall Turret** | Cheap, reliable single-target |
| 🚓 **Border Patrol** | Rapid fire — shreds fast UFO scouts |
| 🧊 **I.C.E. Freeze Truck** | Detains aliens in place (slow) |
| 🦅 **Bald Eagle Sniper** | Long-range, big single-target damage |
| 📱 **Truth Social Cannon** | Goes viral — area-of-effect splash |
| 💰 **Tariff Office** | Doesn't shoot; prints money over time |

## The invaders

👽 Lil' Green Visa-Dodger · 🛸 UFO Scout (fast) · 👾 Armored Invader (tanky) ·
🤖 Deportation-Resistant Droid (armored) · 🛸 **THE MOTHERSHIP** (boss)

## Project layout

```
web/
├── index.html        # markup + UI shell
├── css/style.css     # patriotic red/white/blue styling
└── js/
    ├── utils.js      # helpers + tiny WebAudio sfx
    ├── config.js     # board, towers, enemies, waves (tune the game here)
    ├── entities.js   # Enemy, Tower, Projectile, Particle
    ├── game.js       # state, update loop, rendering, input
    └── main.js       # DOM wiring + render loop bootstrap
```

Want to tweak balance or add content? Almost everything lives in `js/config.js` —
add a tower to `TOWER_TYPES`, an enemy to `ENEMY_TYPES`, or a wave to `WAVES`.
