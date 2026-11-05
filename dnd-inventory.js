/* dnd-inventory.js - equipment slots, backpack, potions, rests and loot for a character sheet (SRD 5.1 rules, levels 1-5).
   Pure functions on a sheet made by dnd-rules.js. Browser global window.DNDINV or Node module.
   ensure(sheet) must run once before the others (it is safe to call again). Slots: mainHand, offHand, armor, amulet, ring1, ring2. */
(function (root) {
  'use strict';
  var DATA = root.DNDDATA || (typeof require === 'function' ? require('./dnd-data.js') : null);
  var SLOTS = ['mainHand', 'offHand', 'armor', 'amulet', 'ring1', 'ring2'];
  var MAGIC = {
    'Potion of Healing': { type: 'potion', heal: [2, 4, 2], value: 50, text: 'Drink as an action to regain 2d4+2 hit points.' },
    'Potion of Greater Healing': { type: 'potion', heal: [4, 4, 4], value: 150, text: 'Drink as an action to regain 4d4+4 hit points.' },
    'Ring of Protection': { type: 'ring', attune: true, ac: 1, value: 500, text: 'Requires attunement. +1 bonus to AC while worn.' },
    'Amulet of Health': { type: 'amulet', attune: true, con: 19, value: 800, text: 'Requires attunement. Your Constitution is 19 while you wear it (more hit points).' }
  };
  function mod(n) { return Math.floor((n - 10) / 2); }
  function d(n, rng) { return 1 + Math.floor((rng ? rng() : Math.random()) * n); }
  function rollN(n, s, rng) { var t = 0; for (var i = 0; i < n; i++) t += d(s, rng); return t; }
  function find(s, name) { for (var i = 0; i < s.inventory.length; i++) if (s.inventory[i].name === name) return s.inventory[i]; return null; }
  function qty(s, name) { var x = find(s, name); return x ? x.qty : 0; }
  function addItem(s, name, n) { n = n === undefined ? 1 : n; var x = find(s, name); if (x) x.qty += n; else s.inventory.push({ name: name, qty: n }); return s; }
  function equippedCount(s, name, skip) { var c = 0; SLOTS.forEach(function (k) { if (k !== skip && s.equipped[k] === name) c++; }); return c; }
  /** weapon | armor | shield | magic | gear */
  function kind(name) { if (DATA.WEAPONS[name]) return 'weapon'; var a = DATA.ARMOR[name]; if (a) return a.type === 'shield' ? 'shield' : 'armor'; if (MAGIC[name]) return 'magic'; return 'gear'; }
  function armorProf(s, a) { var l = ((s.proficiencies && s.proficiencies.armor) || s.armor || []).join(' ').toLowerCase(); if (a.type === 'shield') return l.indexOf('shield') >= 0 && s.cls !== 'Monk'; if (l.indexOf('all armor') >= 0) return true; if (s.cls === 'Cleric' && a.type === 'heavy') return true; return l.indexOf(a.type) >= 0; }
  function weaponProf(s, w) {
    var l = (s.proficiencies && s.proficiencies.weapons) || s.weapons || [], ex = (s.race === 'Dwarf' && ['Battleaxe', 'Handaxe', 'Light hammer', 'Warhammer'].indexOf(w.name) >= 0) || (s.subrace === 'High Elf' && ['Longsword', 'Shortsword', 'Shortbow', 'Longbow'].indexOf(w.name) >= 0);
    return ex || (w.cat === 'simple' && l.indexOf('Simple weapons') >= 0) || (w.cat === 'martial' && l.indexOf('Martial weapons') >= 0) || l.indexOf(w.name + 's') >= 0;
  }
  function two(w) { return w.props.indexOf('two-handed') >= 0; }
  function light(w) { return w.props.indexOf('light') >= 0; }
  function rangeOf(w) { var m = /(?:thrown|ammunition) \((\d+)\/(\d+)\)/.exec(w.props.join(' ')); return m ? [+m[1], +m[2]] : null; }
  function acValue(s, armorName, shieldOn) {
    var m = s.mods, a = armorName && DATA.ARMOR[armorName], ac, note;
    if (a) { ac = a.base + (a.type === 'heavy' ? 0 : a.dexCap === null ? m.dex : Math.min(m.dex, a.dexCap)); note = a.name; }
    else if (s.cls === 'Barbarian') { ac = 10 + m.dex + m.con; note = 'Unarmored Defense'; }
    else if (s.cls === 'Monk') { ac = 10 + m.dex + m.wis; note = 'Unarmored Defense'; }
    else if (s.cls === 'Sorcerer') { ac = 13 + m.dex; note = 'Draconic Resilience'; }
    else { ac = 10 + m.dex; note = 'Unarmored'; }
    if (shieldOn) { ac += 2; note += ' + shield'; }
    return { ac: ac, note: note };
  }
  /** Rebuild AC, attacks and magic bonuses from the equipped items. */
  function recompute(s) {
    var m = s.mods, pb = s.profBonus, eq = s.equipped, style = s.fightingStyle || null, i;
    var arm = eq.armor && DATA.ARMOR[eq.armor], shieldOn = eq.offHand === 'Shield' && armorProf(s, DATA.ARMOR.Shield);
    var r = acValue(s, arm ? eq.armor : null, shieldOn); s.ac = r.ac; s.acNote = r.note;
    if (arm && style === 'Defense') s.ac += 1;
    [eq.ring1, eq.ring2].forEach(function (n) { if (n && MAGIC[n] && MAGIC[n].ac) { s.ac += MAGIC[n].ac; if (s.acNote.indexOf('magic') < 0) s.acNote += ' + magic'; } });
    s.stealthDisadvantage = !!(arm && arm.stealthDis); delete s.armorWarning;
    if (arm && arm.str && s.scores.str < arm.str) s.armorWarning = arm.name + ' needs Strength ' + arm.str + ' (speed -10 ft otherwise).';
    // Amulet of Health: Constitution 19 while worn (extra hit points; removed again when taken off)
    var want = (eq.amulet === 'Amulet of Health' && s.scores.con < 19) ? (4 - m.con) * s.level : 0, had = s.hpMagic || 0, dl = want - had;
    if (dl) { s.hpMax += dl; s.hp = dl > 0 ? Math.min(s.hpMax, s.hp + dl) : Math.max(Math.min(s.hp, s.hpMax), s.hp > 0 ? 1 : 0); s.hpMagic = want; }
    // attacks: wielded weapons, then stowed ranged/thrown weapons, then unarmed
    var list = [], oh = eq.offHand && DATA.WEAPONS[eq.offHand] ? DATA.WEAPONS[eq.offHand] : null;
    function ab(w, thrown) { return (w.kind === 'ranged') ? 'dex' : w.props.indexOf('finesse') >= 0 ? (m.dex > m.str ? 'dex' : 'str') : 'str'; }
    function mk(w, o) {
      var a = ab(w), pr = weaponProf(s, w), ver = /versatile \((\w+)\)/.exec(w.props.join(' ')), dice = w.dice, nm = w.name, dm = m[a], ranged = w.kind === 'ranged' || !!o.thrown, ab2 = 0;
      if (o.hand === 'mainHand' && ver && !eq.offHand) { dice = ver[1]; nm += ' (two-handed)'; }
      if (o.hand === 'offHand') { nm += ' (off-hand)'; if (style !== 'Two-Weapon Fighting') dm = Math.min(0, dm); }
      if (style === 'Dueling' && w.kind === 'melee' && !o.thrown && !two(w) && o.hand === 'mainHand' && !oh) dm += 2;
      if (style === 'Archery' && w.kind === 'ranged') ab2 = 2;
      if (o.thrown) nm += ' (thrown' + (o.n > 1 ? ', x' + o.n : '') + ')';
      list.push({ name: nm, weapon: w.name, ability: a, bonus: m[a] + (pr ? pb : 0) + ab2, proficient: pr, dice: dice, mod: dm, type: w.type, ranged: ranged, props: w.props, versatile: ver && o.hand === 'mainHand' && !eq.offHand ? null : (ver ? ver[1] : null), rng: ranged ? (rangeOf(w) || [80, 320]) : null });
    }
    if (eq.mainHand && DATA.WEAPONS[eq.mainHand]) mk(DATA.WEAPONS[eq.mainHand], { hand: 'mainHand' });
    if (oh) mk(oh, { hand: 'offHand' });
    s.inventory.forEach(function (x) {
      var w = DATA.WEAPONS[x.name]; if (!w) return; var spare = x.qty - equippedCount(s, x.name); if (spare <= 0) return;
      if (w.kind === 'ranged' && !(w.props.indexOf('thrown') >= 0 && false)) mk(w, { hand: 'stowed' });
      else if (w.props.join(' ').indexOf('thrown') >= 0) mk(w, { hand: 'stowed', thrown: true, n: spare });
    });
    var mono = s.cls === 'Monk', ua = mono ? (m.dex > m.str ? 'dex' : 'str') : 'str';
    list.push({ name: mono ? 'Unarmed strike (Martial Arts)' : 'Unarmed strike', weapon: null, ability: ua, bonus: m[ua] + pb, proficient: true, dice: mono ? '1d4' : '1', mod: mono ? m[ua] : m.str, type: 'bludgeoning', ranged: false, props: [] });
    s.attacks = list; return s;
  }
  function hdInfo(s) { return { total: s.level || 1, die: +String(s.hitDie || 'd8').slice(1), left: s.hdLeft }; }
  /** First-time set-up: equipment from the starting kit, hit dice, currency, one starter potion. Does not change a sheet that is already set up. */
  function ensure(s) {
    if (!s) return s;
    s.inventory = s.inventory || []; s.currency = s.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    if (s.gold) { s.currency.gp += +s.gold || 0; } delete s.gold;
    s.hitDiceTotal = (s.level || 1) + (s.hitDie || 'd8'); if (typeof s.hdLeft !== 'number') s.hdLeft = s.level || 1; s.hdLeft = Math.max(0, Math.min(s.hdLeft, s.level || 1));
    if (!s.invInit) { addItem(s, 'Potion of Healing', 1); s.invInit = true; }
    if (!s.equipped) {
      var eq = s.equipped = { mainHand: null, offHand: null, armor: null, amulet: null, ring1: null, ring2: null }, best = -99, mn = s.mods;
      s.inventory.forEach(function (x) { var a = DATA.ARMOR[x.name]; if (a && a.type !== 'shield' && armorProf(s, a)) { var v = acValue(s, x.name, false).ac; if (v > best) { best = v; eq.armor = x.name; } } });
      var melee = null, any = null; s.inventory.forEach(function (x) { var w = DATA.WEAPONS[x.name]; if (!w) return; if (!any) any = x.name; if (w.kind === 'melee' && !melee) melee = x.name; });
      var hasShield = find(s, 'Shield') && armorProf(s, DATA.ARMOR.Shield);
      if (hasShield) { var one = null; s.inventory.forEach(function (x) { var w = DATA.WEAPONS[x.name]; if (w && w.kind === 'melee' && !two(w) && !one) one = x.name; }); if (one) melee = one; }
      eq.mainHand = melee || any;
      if (hasShield && !(eq.mainHand && two(DATA.WEAPONS[eq.mainHand]))) eq.offHand = 'Shield';
      recompute(s);
    }
    return s;
  }
  function res(ok, msg) { return { ok: ok, msg: msg }; }
  function equip(s, name, slot) {
    ensure(s); var k = kind(name), it = find(s, name); if (!it) return res(false, 'You do not have ' + name + '.');
    var eq = s.equipped, w = DATA.WEAPONS[name];
    if (k === 'gear') return res(false, name + ' cannot be equipped.');
    if (!slot) slot = k === 'weapon' ? 'mainHand' : k === 'shield' ? 'offHand' : k === 'armor' ? 'armor' : MAGIC[name].type === 'amulet' ? 'amulet' : (eq.ring1 && !eq.ring2 ? 'ring2' : 'ring1');
    if (equippedCount(s, name, slot) + 1 > it.qty) return res(false, 'All your ' + name + ' are already equipped.');
    var msg = '';
    if (k === 'weapon') { if (slot !== 'mainHand' && slot !== 'offHand') return res(false, 'Weapons go in a hand.');
      if (slot === 'offHand') { if (eq.mainHand && two(DATA.WEAPONS[eq.mainHand])) return res(false, 'Your main hand holds a two-handed weapon.'); if (!light(w)) return res(false, 'Only light weapons can be wielded in the off hand.'); if (eq.mainHand && !light(DATA.WEAPONS[eq.mainHand])) return res(false, 'Two-weapon fighting needs a light weapon in each hand.'); }
      if (slot === 'mainHand' && two(w) && eq.offHand) { msg = eq.offHand + ' goes back in your pack. '; eq.offHand = null; } }
    else if (k === 'shield') { slot = 'offHand'; if (!armorProf(s, DATA.ARMOR.Shield)) return res(false, 'You are not proficient with shields.'); if (eq.mainHand && two(DATA.WEAPONS[eq.mainHand])) return res(false, 'Your hands are full: put away the two-handed weapon first.'); }
    else if (k === 'armor') { slot = 'armor'; if (!armorProf(s, DATA.ARMOR[name])) return res(false, 'You are not proficient with ' + name.toLowerCase() + ' armor.'); }
    else { var M = MAGIC[name]; if (M.type === 'amulet') slot = 'amulet'; else if (slot !== 'ring1' && slot !== 'ring2') slot = 'ring1';
      if (M.attune) { var n = 0; SLOTS.forEach(function (x) { if (eq[x] && MAGIC[eq[x]] && MAGIC[eq[x]].attune && x !== slot) n++; }); if (n >= 3) return res(false, 'You can only be attuned to three items.'); } }
    eq[slot] = name; recompute(s); return res(true, msg + name + ' equipped.' + (s.armorWarning && slot === 'armor' ? ' ' + s.armorWarning : ''));
  }
  function unequip(s, slot) { ensure(s); if (!s.equipped[slot]) return res(false, 'Nothing there.'); var n = s.equipped[slot]; s.equipped[slot] = null; recompute(s); return res(true, n + ' put away.'); }
  function drop(s, name, n) {
    ensure(s); var it = find(s, name); if (!it) return res(false, 'You do not have that.'); n = Math.min(n || 1, it.qty); it.qty -= n;
    if (it.qty <= 0) s.inventory.splice(s.inventory.indexOf(it), 1);
    SLOTS.forEach(function (k) { if (s.equipped[k] === name && equippedCount(s, name) > qty(s, name)) s.equipped[k] = null; });
    recompute(s); return res(true, 'Dropped ' + n + ' x ' + name + '.');
  }
  function usePotion(s, name, rng) {
    ensure(s); name = name || 'Potion of Healing'; var P = MAGIC[name];
    if (!P || P.type !== 'potion' || !qty(s, name)) return { ok: false, msg: 'You have no ' + name + '.' };
    if (s.hp <= 0) return { ok: false, msg: 'You cannot drink while unconscious.' }; if (s.hp >= s.hpMax) return { ok: false, msg: 'You are already at full hit points.' };
    var roll = rollN(P.heal[0], P.heal[1], rng) + P.heal[2], before = s.hp; s.hp = Math.min(s.hpMax, s.hp + roll); drop(s, name, 1);
    return { ok: true, healed: s.hp - before, roll: roll, msg: 'You drink the ' + name + ': +' + (s.hp - before) + ' HP (' + s.hp + '/' + s.hpMax + ').' };
  }
  /** Spend hit dice on a short rest (each heals die + Con modifier, minimum 0). */
  function shortRest(s, spend, rng) {
    ensure(s); var h = hdInfo(s), n = Math.max(0, Math.min(spend | 0, s.hdLeft)), healed = 0, i;
    if (s.hp <= 0) return { ok: false, msg: 'You are down; you need healing first.' };
    for (i = 0; i < n && s.hp < s.hpMax; i++) { var g = Math.max(0, d(h.die, rng) + s.mods.con), b = s.hp; s.hp = Math.min(s.hpMax, s.hp + g); healed += s.hp - b; s.hdLeft--; }
    return { ok: true, healed: healed, used: i, msg: 'Short rest: spent ' + i + ' hit di' + (i === 1 ? 'e' : 'ce') + ', +' + healed + ' HP (' + s.hp + '/' + s.hpMax + ').' };
  }
  function longRest(s) {
    ensure(s); var h = hdInfo(s); s.hp = s.hpMax; s.tempHp = 0; s.deathSaves = { ok: 0, fail: 0 }; s.conditions = []; s.hdLeft = Math.min(h.total, s.hdLeft + Math.max(1, Math.floor(h.total / 2)));
    return { ok: true, msg: 'Long rest: full HP, hit dice ' + s.hdLeft + '/' + h.total + '.' };
  }
  // ---------- loot ----------
  var BEAST = /Rat|Wolf|Bear|Spider/;
  var DROPS = { 'Kobold': [['Dagger', 0.2]], 'Goblin': [['Scimitar', 0.2], ['Shortbow', 0.1]], 'Bandit': [['Scimitar', 0.2], ['Light crossbow', 0.15]], 'Guard': [['Spear', 0.2], ['Shield', 0.1]], 'Skeleton': [['Shortsword', 0.2]], 'Orc': [['Greataxe', 0.2]], 'Ogre': [['Greatclub', 0.25]] };
  /** names: defeated foe names (a " 2" suffix is ignored). Returns {gp, items:[{name,qty}], lines:[]} without touching any sheet. */
  function lootFor(names, BESTIARY, rng) {
    var gp = 0, got = {}, r = function () { return rng ? rng() : Math.random(); };
    names.forEach(function (n0) {
      var n = String(n0).replace(/\s+\d+$/, ''), m = BESTIARY && BESTIARY[n]; if (!m || BEAST.test(n)) return; var cr = m.cr || 0;
      gp += cr < 0.5 ? rollN(1, 6, rng) - 1 : cr < 1 ? rollN(2, 6, rng) : cr < 2 ? rollN(3, 6, rng) : rollN(4, 8, rng);
      (DROPS[n] || []).forEach(function (x) { if (r() < x[1]) got[x[0]] = (got[x[0]] || 0) + 1; });
      var p = cr < 0.5 ? 0.1 : cr < 1 ? 0.18 : cr < 2 ? 0.28 : 0.4; if (r() < p) got['Potion of Healing'] = (got['Potion of Healing'] || 0) + 1;
      if (cr >= 2 && r() < 0.15) got['Potion of Greater Healing'] = (got['Potion of Greater Healing'] || 0) + 1;
      if (cr >= 1 && r() < 0.04) got['Ring of Protection'] = (got['Ring of Protection'] || 0) + 1;
      if (cr >= 2 && r() < 0.04) got['Amulet of Health'] = (got['Amulet of Health'] || 0) + 1;
    });
    var items = Object.keys(got).map(function (k) { return { name: k, qty: got[k] }; }), lines = [];
    if (gp) lines.push(gp + ' gp'); items.forEach(function (x) { lines.push((x.qty > 1 ? x.qty + ' x ' : '') + x.name); });
    return { gp: gp, items: items, lines: lines };
  }
  function giveLoot(s, loot) { ensure(s); s.currency.gp += loot.gp || 0; (loot.items || []).forEach(function (x) { addItem(s, x.name, x.qty); }); recompute(s); return loot.lines || []; }
  function describe(name) {
    var w = DATA.WEAPONS[name], a = DATA.ARMOR[name];
    if (MAGIC[name]) return MAGIC[name].text;
    if (w) return w.dice + ' ' + w.type + (w.props.length ? ' - ' + w.props.join(', ') : '');
    if (a) return a.type === 'shield' ? '+2 AC' : 'AC ' + a.base + (a.type === 'heavy' ? '' : a.dexCap === null ? ' + Dex' : ' + Dex (max 2)') + (a.stealthDis ? ', stealth disadvantage' : '') + (a.str ? ', Str ' + a.str : '');
    return '';
  }
  /** Browser: write the sheet to dnd.active and to the matching saved character. */
  function saveActive(s) {
    try { localStorage.setItem('dnd.active', JSON.stringify(s)); var l = JSON.parse(localStorage.getItem('dnd.characters') || '[]'); for (var i = 0; i < l.length; i++) if (l[i].name === s.name && l[i].cls === s.cls) l[i] = s; localStorage.setItem('dnd.characters', JSON.stringify(l)); return true; } catch (e) { return false; }
  }
  var api = { SLOTS: SLOTS, MAGIC: MAGIC, ensure: ensure, recompute: recompute, equip: equip, unequip: unequip, drop: drop, addItem: addItem, qty: qty, kind: kind, describe: describe,
    usePotion: usePotion, shortRest: shortRest, longRest: longRest, lootFor: lootFor, giveLoot: giveLoot, hdInfo: hdInfo, saveActive: saveActive, armorProf: armorProf, weaponProf: weaponProf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDINV = api;
})(typeof window !== 'undefined' ? window : this);
