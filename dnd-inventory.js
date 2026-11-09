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
  /** Per-rest resources carried between fights: s.res = {used:{rage,surge,secondWind}, slots:{lvl:left}, layPool}. */
  function maxLay(s) { return s.cls === 'Paladin' ? 5 * (s.level || 1) : 0; }
  function resetRes(s, which) {
    var r = s.res = s.res || {}; r.used = r.used || {};
    if (which === 'long') { r.used = {}; if (s.spellcasting) r.slots = JSON.parse(JSON.stringify(s.spellcasting.slots)); if (s.cls === 'Paladin') r.layPool = maxLay(s); }
    else { delete r.used.surge; delete r.used.secondWind; if (s.cls === 'Warlock' && s.spellcasting) r.slots = JSON.parse(JSON.stringify(s.spellcasting.slots)); }
    return r;
  }
  /** Readable list for the sheet panel, e.g. ['Rage 1/2', 'Spell slots L1 1/2']. */
  function resLines(s) {
    var r = s.res || {}, u = r.used || {}, o = [], sc = s.spellcasting;
    if (s.cls === 'Barbarian') { var mx = s.level >= 3 ? 3 : 2; o.push('Rage ' + (mx - (u.rage || 0)) + '/' + mx); }
    if (s.cls === 'Fighter') { o.push('Second Wind ' + (u.secondWind ? '0/1' : '1/1')); if (s.level >= 2) o.push('Action Surge ' + (u.surge ? '0/1' : '1/1')); }
    if (s.cls === 'Paladin') o.push('Lay on Hands ' + (r.layPool !== undefined ? r.layPool : maxLay(s)) + '/' + maxLay(s));
    if (sc && sc.slots) Object.keys(sc.slots).forEach(function (k) { o.push('Level ' + k + ' slots ' + ((r.slots && r.slots[k] !== undefined) ? r.slots[k] : sc.slots[k]) + '/' + sc.slots[k]); });
    return o;
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
    resetRes(s, 'short');
    for (i = 0; i < n && s.hp < s.hpMax; i++) { var g = Math.max(0, d(h.die, rng) + s.mods.con), b = s.hp; s.hp = Math.min(s.hpMax, s.hp + g); healed += s.hp - b; s.hdLeft--; }
    return { ok: true, healed: healed, used: i, msg: 'Short rest (Second Wind, Action Surge' + (s.cls === 'Warlock' ? ', pact slots' : '') + ' restored): spent ' + i + ' hit di' + (i === 1 ? 'e' : 'ce') + ', +' + healed + ' HP (' + s.hp + '/' + s.hpMax + ').' };
  }
  function longRest(s) {
    ensure(s); var h = hdInfo(s); s.hp = s.hpMax; s.tempHp = 0; s.deathSaves = { ok: 0, fail: 0 }; s.conditions = []; s.hdLeft = Math.min(h.total, s.hdLeft + Math.max(1, Math.floor(h.total / 2))); resetRes(s, 'long');
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
    if (GOODS[name]) return GOODS[name][2];
    return '';
  }
  /** Browser: write the sheet to dnd.active and to the matching saved character. */
  function saveActive(s) {
    try { localStorage.setItem('dnd.active', JSON.stringify(s)); var l = JSON.parse(localStorage.getItem('dnd.characters') || '[]'); for (var i = 0; i < l.length; i++) if (l[i].name === s.name && l[i].cls === s.cls) l[i] = s; localStorage.setItem('dnd.characters', JSON.stringify(l)); return true; } catch (e) { return false; }
  }

  // ---------- shops: prices, money in copper, merchant stock ----------
  var PACK_PRICE = { "Burglar's Pack": 16, "Diplomat's Pack": 39, "Dungeoneer's Pack": 12, "Entertainer's Pack": 40, "Explorer's Pack": 10, "Priest's Pack": 19, "Scholar's Pack": 40 };

  // ---------- everyday goods: name -> [gp, group, blurb]. group 'f' food/drink (consumable), others are gear ----------
  var GOODS = {
    'Mug of ale': [0.04, 'f', 'A frothing mug. Restores a little spirit.'], 'Jug of wine': [0.2, 'f', 'Common table wine.'], 'Bottle of fine wine': [10, 'f', 'A vintage worth savouring.'], 'Hot meal': [0.3, 'f', 'Stew, bread and a mug. Filling.'],
    'Loaf of bread': [0.02, 'f', 'Fresh baked.'], 'Hunk of cheese': [0.1, 'f', 'Sharp and keeps well.'], 'Smoked sausage': [0.1, 'f', 'Salty, keeps for weeks.'], 'Salted pork': [0.2, 'f', 'Preserved for the road.'],
    'Joint of beef': [0.4, 'f', 'A heavy cut, fresh from the block.'], 'Roast chicken': [0.3, 'f', 'Whole, still warm.'], 'Venison haunch': [0.8, 'f', 'Wild game, well hung.'], 'Rack of lamb': [0.6, 'f', 'Tender and fresh.'],
    'Pork chops': [0.25, 'f', 'Fresh cut.'], 'Fresh fish': [0.1, 'f', 'Caught this morning.'], 'Smoked fish': [0.15, 'f', 'Keeps for many days.'], 'Sack of apples': [0.2, 'f', 'Crisp orchard apples.'],
    'Basket of vegetables': [0.15, 'f', 'Roots, greens and onions.'], 'Sack of grain': [0.1, 'f', 'For bread or porridge.'], 'Sack of flour': [0.1, 'f', 'Milled fine.'], 'Honey pot': [0.5, 'f', 'Sweet and golden.'],
    'Meat pie': [0.1, 'f', 'Hot and flaky.'], 'Sweet pastry': [0.05, 'f', 'Glazed and sugary.'], 'Honey cake': [0.2, 'f', 'A treat for festivals.'], 'Rations (1 day)': [0.5, 'f', 'Dried food for one day of travel.'],
    'Salt (1 lb)': [0.05, 'f', 'Preserves meat. Valuable.'], 'Spices (pouch)': [2, 'f', 'Pepper, clove and saffron.'], 'Waterskin': [0.2, 'g', 'Holds 4 pints.'], 'Bottle of cider': [0.1, 'f', 'Dry and cloudy.'],
    "Healer's kit": [5, 'f', 'Ten uses to stabilise the dying.'], 'Antitoxin': [50, 'f', 'Advantage vs poison for 1 hour.'], 'Bandages': [0.1, 'f', 'Clean linen strips.'], 'Herbal salve': [1, 'f', 'Soothes cuts and burns.'],
    'Herbalism kit': [5, 'g', 'Pouches and clippers for plants.'], 'Dried herbs': [0.2, 'f', 'Thyme, sage, willow bark.'], 'Healing poultice': [2, 'f', 'Draws out fever and infection.'], 'Vial of acid': [25, 'g', '2d6 acid damage when thrown.'],
    "Alchemist's fire": [50, 'g', '1d4 fire damage each turn when thrown.'], 'Vial of perfume': [5, 'g', 'Floral and expensive.'],
    'Common clothes': [0.5, 'g', 'Plain and durable.'], "Traveler's clothes": [2, 'g', 'Hardwearing and weatherproof.'], 'Fine clothes': [15, 'g', 'Cut for a noble.'], 'Costume': [5, 'g', 'Bright, for the stage.'],
    'Cloak': [1, 'g', 'Wool, hooded.'], 'Boots': [1, 'g', 'Stout leather.'], 'Gloves': [0.5, 'g', 'Supple leather.'], 'Hat': [0.3, 'g', 'Felt or straw.'], 'Fur-lined cloak': [8, 'g', 'Warm against the cold.'],
    'Bolt of linen': [1, 'g', 'Ten yards.'], 'Bolt of wool': [1, 'g', 'Ten yards.'], 'Bolt of silk': [20, 'g', 'Ten yards of fine silk.'], 'Spool of thread': [0.05, 'g', 'Strong thread.'], 'Sewing needles': [0.05, 'g', 'A tin of needles.'],
    'Leather (hide)': [1, 'g', 'Cured and ready to work.'], 'Saddle': [10, 'g', 'Riding saddle.'], 'Bit and bridle': [2, 'g', 'Tack for a horse.'], 'Saddlebags': [4, 'g', 'Two leather pouches.'], 'Belt pouch': [0.5, 'g', 'Holds coin and trinkets.'], 'Leather belt': [0.3, 'g', 'Sturdy.'],
    'Rope, hempen (50 ft)': [1, 'g', 'Holds 2 hit points of load.'], 'Rope, silk (50 ft)': [10, 'g', 'Light and strong.'], 'Torch': [0.01, 'g', 'Burns for 1 hour.'], 'Hooded lantern': [5, 'g', 'Bright light, can be dimmed.'], 'Oil (flask)': [0.1, 'g', 'Fuel for lanterns.'],
    'Candles (10)': [0.1, 'g', 'Tallow candles.'], 'Beeswax candle': [0.2, 'g', 'Burns clean.'], 'Lamp': [0.5, 'g', 'Clay oil lamp.'], 'Tinderbox': [0.5, 'g', 'Flint, steel and tinder.'], 'Bedroll': [1, 'g', 'Sleeps one.'],
    'Blanket': [0.5, 'g', 'Thick wool.'], 'Backpack': [2, 'g', 'Holds a pack of gear.'], 'Crowbar': [2, 'g', 'Advantage on Strength checks to pry.'], 'Hammer': [1, 'g', 'A carpenter\'s hammer.'], 'Pitons (10)': [0.5, 'g', 'Iron spikes for climbing.'],
    'Mess kit': [0.2, 'g', 'Tin cup and cutlery.'], 'Shovel': [2, 'g', 'Iron-shod.'], 'Iron pot': [2, 'g', 'For cooking.'], 'Fishing tackle': [1, 'g', 'Rod, line and hooks.'], 'Padlock': [10, 'g', 'Needs a key or picks.'], 'Chain (10 ft)': [5, 'g', 'Heavy iron links.'],
    'Hunting trap': [5, 'g', 'Spring jaws.'], 'Grappling hook': [2, 'g', 'Iron hook for ropes.'], 'Ladder (10 ft)': [0.1, 'g', 'Plain wooden.'], 'Barrel': [2, 'g', 'Oak barrel.'], 'Bucket': [0.05, 'g', 'Wood and iron.'], 'Mirror, steel': [5, 'g', 'Small polished plate.'],
    'Whetstone': [0.01, 'g', 'Keeps an edge keen.'], 'Ball bearings (bag)': [1, 'g', '1,000 steel balls.'], 'Caltrops (bag)': [1, 'g', 'Twenty iron spikes.'], 'Hunting knife': [1, 'g', 'Skinning blade.'], "Smith's tools": [20, 'g', 'Hammers, tongs and punches.'],
    "Carpenter's tools": [8, 'g', 'Saws, chisels and planes.'], "Tinker's tools": [50, 'g', 'Small tools for repairs.'], "Cook's utensils": [1, 'g', 'Pots, knives and ladles.'], "Cobbler's tools": [5, 'g', 'Awl and lasts.'], "Leatherworker's tools": [5, 'g', 'Knives and stitching tools.'],
    "Potter's tools": [10, 'g', 'Wheel tools.'], "Weaver's tools": [1, 'g', 'Shuttles and shears.'], "Jeweler's tools": [25, 'g', 'Loupe and tweezers.'], "Alchemist's supplies": [50, 'g', 'Flasks and reagents.'], "Calligrapher's supplies": [10, 'g', 'Pens and fine ink.'], "Brewer's supplies": [20, 'g', 'Brewing kit.'],
    'Ink (1 oz bottle)': [10, 'g', 'Black writing ink.'], 'Ink pen': [0.02, 'g', 'A quill.'], 'Parchment (sheet)': [0.1, 'g', 'Writing surface.'], 'Paper (sheet)': [0.2, 'g', 'Costly, smooth.'], 'Book': [25, 'g', 'Bound volume of lore.'], 'Blank book': [10, 'g', '100 empty pages.'], 'Scroll case': [1, 'g', 'Holds parchment.'],
    'Map': [10, 'g', 'Regional map.'], 'Sealing wax': [0.5, 'g', 'For letters.'],
    'Silver ring': [8, 'g', 'Plain band.'], 'Gold ring': [30, 'g', 'Polished gold band.'], 'Silver necklace': [20, 'g', 'Fine chain.'], 'Gold necklace': [60, 'g', 'Heavy gold chain.'], 'Gemstone (small)': [50, 'g', 'Cut and polished.'], 'Gemstone (large)': [250, 'g', 'A flawless stone.'], 'Brooch': [15, 'g', 'Silver, with enamel.'], 'Gold bracelet': [45, 'g', 'Engraved.'], 'Signet ring': [20, 'g', 'Engraved with a crest.'],
    'Flute': [2, 'g', 'Wooden flute.'], 'Drum': [6, 'g', 'Hide drum.'], 'Horn': [3, 'g', 'Carved from a ram.'], 'Lyre': [30, 'g', 'Strung lyre.'], 'Pan flute': [12, 'g', 'Reed pipes.'], 'Viol': [30, 'g', 'Bowed strings.'], 'Bagpipes': [30, 'g', 'Droning pipes.'], 'Shawm': [2, 'g', 'Reed horn.'], 'Dulcimer': [25, 'g', 'Hammered strings.'],
    'Soap': [0.02, 'g', 'Lye soap.'], 'Comb': [0.02, 'g', 'Bone comb.'], 'Perfume (vial)': [5, 'g', 'Floral scent.'], 'Razor': [0.5, 'g', 'Folding razor.'],
    'Dice set': [0.1, 'g', 'Bone dice.'], 'Playing cards': [0.5, 'g', 'Painted deck.'], 'Pottery jug': [0.2, 'g', 'Glazed.'], 'Wicker basket': [0.4, 'g', 'Woven.'], 'Glass bottle': [2, 'g', 'Blown glass.'], 'Candlestick': [0.5, 'g', 'Brass.'], 'Tankard': [0.4, 'g', 'Pewter.'], 'Wooden bowl': [0.05, 'g', 'Carved.'], 'Wooden plank': [0.1, 'g', 'Planed board.'], 'Firewood bundle': [0.05, 'g', 'Seasoned logs.']
  };
  var EXTRA_PRICE = { '20 bolts': 1, '20 arrows': 1, 'Quiver of 20 arrows': 1, '10 darts': 0.5, "Thieves' tools": 25, 'Holy symbol': 5, 'Component pouch': 25, 'Arcane focus': 10, 'Spellbook': 50, 'Druidic focus': 1, 'Lute': 35, 'Wooden shield': 10 };
  Object.keys(GOODS).forEach(function (k) { EXTRA_PRICE[k] = GOODS[k][0]; });
  function costGp(str) { var m = /([\d.,]+)\s*(cp|sp|ep|gp|pp)/.exec(str || ''); return m ? parseFloat(m[1].replace(/,/g, '')) * { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }[m[2]] : null; }
  /** Base value in gp, or null when merchants do not deal in it. */
  function price(name) {
    var w = DATA.WEAPONS[name], a = DATA.ARMOR[name]; if (w) return costGp(w.cost); if (a) return costGp(a.cost); if (MAGIC[name]) return MAGIC[name].value;
    if (PACK_PRICE[name] !== undefined) return PACK_PRICE[name]; return EXTRA_PRICE[name] !== undefined ? EXTRA_PRICE[name] : null;
  }
  function priceCp(name) { var g = price(name); return g === null ? null : Math.max(1, Math.round(g * 100)); }
  /** weapons | armor | consumables | magic | gear */
  function category(name) { var k = kind(name); if (k === 'weapon') return 'weapons'; if (k === 'armor' || k === 'shield') return 'armor'; if (MAGIC[name]) return MAGIC[name].type === 'potion' ? 'consumables' : 'magic'; if (GOODS[name] && GOODS[name][1] === 'f') return 'consumables'; return 'gear'; }
  function wealthCp(s) { var c = s.currency || {}; return (c.cp || 0) + 10 * (c.sp || 0) + 50 * (c.ep || 0) + 100 * (c.gp || 0) + 1000 * (c.pp || 0); }
  function setWealthCp(s, t) { t = Math.max(0, Math.round(t)); s.currency = { cp: t % 10, sp: Math.floor(t / 10) % 10, ep: 0, gp: Math.floor(t / 100), pp: 0 }; }
  function rngFor(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var POOLS = {
    simple: ['Club', 'Dagger', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Spear', 'Light crossbow', 'Shortbow', 'Sickle'],
    martial: ['Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Longsword', 'Morningstar', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Longbow', 'Heavy crossbow', 'Hand crossbow', 'Maul'],
    bows: ['Shortbow', 'Longbow', 'Light crossbow', 'Hand crossbow', 'Heavy crossbow', 'Javelin', 'Spear', 'Dagger'],
    light: ['Padded', 'Leather', 'Studded leather'], medium: ['Hide', 'Chain shirt', 'Scale mail', 'Breastplate', 'Half plate'], heavy: ['Ring mail', 'Chain mail', 'Splint', 'Plate'],
    shield: ['Shield'], ammo: ['20 arrows', '20 bolts'], packs: Object.keys(PACK_PRICE), tools: ['Holy symbol', 'Component pouch', 'Arcane focus', "Thieves' tools", 'Druidic focus'],
    healing: ['Potion of Healing'], greater: ['Potion of Greater Healing'], magic: ['Ring of Protection', 'Amulet of Health'],
    meat: ['Joint of beef', 'Roast chicken', 'Venison haunch', 'Rack of lamb', 'Pork chops', 'Salted pork', 'Smoked sausage'], bakery: ['Loaf of bread', 'Meat pie', 'Sweet pastry', 'Honey cake'],
    produce: ['Sack of apples', 'Basket of vegetables', 'Sack of grain', 'Sack of flour', 'Honey pot', 'Hunk of cheese', 'Salt (1 lb)', 'Loaf of bread', 'Bottle of cider'], fish: ['Fresh fish', 'Smoked fish', 'Salt (1 lb)'],
    drink: ['Mug of ale', 'Jug of wine', 'Bottle of cider', 'Bottle of fine wine'], meals: ['Hot meal', 'Meat pie', 'Roast chicken', 'Loaf of bread', 'Hunk of cheese'], rations: ['Rations (1 day)', 'Smoked sausage', 'Smoked fish', 'Salted pork'],
    herbs: ['Dried herbs', 'Herbal salve', 'Healing poultice', 'Herbalism kit', 'Spices (pouch)', 'Bandages'], medic: ["Healer's kit", 'Antitoxin', 'Bandages', 'Herbal salve', 'Healing poultice'],
    clothes: ['Common clothes', "Traveler's clothes", 'Fine clothes', 'Cloak', 'Gloves', 'Hat', 'Fur-lined cloak', 'Costume'], cloth: ['Bolt of linen', 'Bolt of wool', 'Bolt of silk', 'Spool of thread', 'Sewing needles', "Weaver's tools"], boots: ['Boots', 'Leather belt', 'Gloves', "Cobbler's tools"],
    leather: ['Leather (hide)', 'Saddle', 'Bit and bridle', 'Saddlebags', 'Belt pouch', 'Leather belt', 'Backpack', 'Waterskin', "Leatherworker's tools"],
    camp: ['Rope, hempen (50 ft)', 'Torch', 'Hooded lantern', 'Oil (flask)', 'Tinderbox', 'Bedroll', 'Blanket', 'Backpack', 'Waterskin', 'Mess kit', 'Pitons (10)', 'Fishing tackle', 'Hunting trap', 'Grappling hook'],
    tools: ['Holy symbol', 'Component pouch', 'Arcane focus', "Thieves' tools", 'Druidic focus', 'Crowbar', 'Hammer', 'Shovel'],
    smithy: ["Smith's tools", 'Crowbar', 'Hammer', 'Whetstone', 'Chain (10 ft)', 'Padlock', 'Iron pot', 'Shovel', 'Pitons (10)', 'Caltrops (bag)', 'Hunting knife', 'Bucket', "Tinker's tools"],
    books: ['Book', 'Blank book', 'Parchment (sheet)', 'Paper (sheet)', 'Ink (1 oz bottle)', 'Ink pen', 'Scroll case', 'Map', 'Sealing wax', "Calligrapher's supplies"],
    gems: ['Silver ring', 'Gold ring', 'Silver necklace', 'Gold necklace', 'Gemstone (small)', 'Gemstone (large)', 'Brooch', 'Gold bracelet', 'Signet ring', "Jeweler's tools"],
    arcane: ['Spellbook', 'Component pouch', 'Arcane focus', 'Vial of acid', "Alchemist's fire", "Alchemist's supplies", 'Ink (1 oz bottle)', 'Parchment (sheet)', 'Vial of perfume'],
    lights: ['Candles (10)', 'Beeswax candle', 'Lamp', 'Torch', 'Hooded lantern', 'Oil (flask)', 'Tinderbox', 'Candlestick'],
    wood: ['Wooden plank', 'Barrel', 'Bucket', 'Ladder (10 ft)', 'Firewood bundle', "Carpenter's tools", 'Hammer', 'Wooden bowl', 'Tankard', 'Wooden shield'],
    home: ['Pottery jug', 'Wicker basket', 'Glass bottle', 'Candlestick', 'Tankard', 'Wooden bowl', 'Iron pot', 'Mirror, steel', "Potter's tools", "Cook's utensils", 'Blanket', 'Bucket'],
    toilet: ['Soap', 'Comb', 'Perfume (vial)', 'Razor', 'Mirror, steel', 'Vial of perfume'], music: ['Lute', 'Flute', 'Drum', 'Horn', 'Lyre', 'Pan flute', 'Viol', 'Bagpipes', 'Shawm', 'Dulcimer'],
    games: ['Dice set', 'Playing cards'], keeps: ['Hot meal', 'Mug of ale', 'Jug of wine']
  };
  // role -> merchant gold and what they stock: [pool, how many kinds, chance]
  var SHOPS = {
    'armorer': { gold: 900, p: [['simple', 1], ['martial', 5], ['light', 2], ['medium', 3], ['heavy', 3], ['shield', 1], ['ammo', 1], ['smithy', 1]] },
    'weaponsmith': { gold: 700, p: [['simple', 4], ['martial', 7], ['bows', 2], ['ammo', 2], ['shield', 1], ['smithy', 1]] },
    'butcher': { gold: 120, p: [['meat', 6], ['rations', 1], ['fish', 1, 0.3]] },
    'baker': { gold: 90, p: [['bakery', 4], ['produce', 2], ['drink', 1, 0.4]] },
    'grocer': { gold: 140, p: [['produce', 7], ['rations', 2], ['drink', 1]] },
    'fishmonger': { gold: 110, p: [['fish', 3], ['rations', 1, 0.5], ['camp', 1]] },
    'herbalist': { gold: 220, p: [['herbs', 5], ['medic', 2], ['healing', 1, 0.5]] },
    'apothecary': { gold: 450, p: [['medic', 4], ['herbs', 2], ['healing', 1], ['greater', 1, 0.4], ['arcane', 1, 0.5]] },
    'tailor': { gold: 300, p: [['clothes', 5], ['cloth', 3], ['boots', 1]] },
    'cobbler': { gold: 160, p: [['boots', 4], ['leather', 2], ['clothes', 1]] },
    'leatherworker': { gold: 260, p: [['leather', 6], ['light', 2], ['boots', 1], ['camp', 1]] },
    'bookseller': { gold: 380, p: [['books', 7], ['arcane', 1, 0.5]] },
    'jeweler': { gold: 1600, p: [['gems', 7], ['magic', 1, 0.3]] },
    'arcane dealer': { gold: 1400, p: [['arcane', 6], ['healing', 1], ['greater', 1], ['magic', 2, 0.7], ['tools', 1]] },
    'chandler': { gold: 130, p: [['lights', 6], ['camp', 2]] },
    'carpenter': { gold: 220, p: [['wood', 7], ['smithy', 1]] },
    'household': { gold: 180, p: [['home', 7]] },
    'toiletries': { gold: 150, p: [['toilet', 5], ['clothes', 1]] },
    'music': { gold: 380, p: [['music', 6], ['games', 1]] },
    'market': { gold: 500, p: [['produce', 4], ['meat', 2], ['fish', 1], ['bakery', 2], ['clothes', 1], ['home', 2], ['camp', 2], ['rations', 1]] },
    'tavern': { gold: 200, p: [['drink', 4], ['meals', 4], ['rations', 1, 0.5], ['games', 1, 0.5]] },
    'general store': { gold: 500, p: [['camp', 6], ['rations', 2], ['packs', 2], ['clothes', 2], ['leather', 1], ['tools', 1], ['healing', 1, 0.5], ['simple', 1], ['ammo', 1]] },
    'blacksmith': { gold: 700, p: [['simple', 3], ['martial', 4], ['medium', 1], ['heavy', 1], ['shield', 1], ['smithy', 5]] },
    'merchant': { gold: 900, p: [['simple', 2], ['martial', 2], ['light', 1], ['medium', 1], ['shield', 1], ['healing', 1], ['greater', 1, 0.4], ['packs', 3], ['ammo', 1], ['tools', 2], ['magic', 1, 0.3]] },
    'city official': { gold: 1800, p: [['martial', 3], ['medium', 2], ['heavy', 1], ['shield', 1], ['healing', 1], ['greater', 1], ['packs', 2], ['tools', 2], ['magic', 1, 0.6]] },
    'priest': { gold: 350, p: [['healing', 1], ['greater', 1, 0.5], ['tools', 2], ['simple', 1], ['shield', 1], ['light', 1], ['packs', 1]] },
    'innkeeper': { gold: 300, p: [['meals', 3], ['drink', 4], ['rations', 2], ['healing', 1, 0.5], ['camp', 1]] },
    'hunter': { gold: 300, p: [['bows', 5], ['ammo', 2], ['light', 1], ['camp', 2], ['meat', 1, 0.5]] },
    'guard captain': { gold: 450, p: [['simple', 1], ['martial', 3], ['medium', 1], ['heavy', 1], ['shield', 1], ['ammo', 1], ['healing', 1]] },
    'village elder': { gold: 250, p: [['simple', 3], ['light', 1], ['healing', 1, 0.7], ['packs', 2], ['tools', 1]] },
    'ferrywoman': { gold: 220, p: [['simple', 2], ['packs', 2], ['ammo', 1], ['healing', 1, 0.5]] }
  };
  /** A merchant's starting stock and purse (in copper), the same every time for the same town + role. */
  function shopFor(town, role) {
    var def = SHOPS[role] || SHOPS.merchant, rng = rngFor(town + '|' + role), stock = {};
    def.p.forEach(function (e) {
      if (e[2] !== undefined && rng() > e[2]) return; var pool = POOLS[e[0]].slice(), n = Math.min(e[1], pool.length);
      for (var i = 0; i < n; i++) { var nm = pool.splice(Math.floor(rng() * pool.length), 1)[0], c = category(nm), q = GOODS[nm] && GOODS[nm][0] < 3 ? 2 + Math.floor(rng() * 7) : GOODS[nm] && GOODS[nm][0] >= 20 ? 1 : (c === 'weapons' || c === 'armor' || c === 'magic') ? 1 : nm.indexOf('arrows') > 0 || nm.indexOf('bolts') > 0 ? 2 + Math.floor(rng() * 5) : 1 + Math.floor(rng() * 3); stock[nm] = (stock[nm] || 0) + q; }
    });
    return { role: role, town: town, cp: Math.round(def.gold * (0.8 + rng() * 0.5)) * 100, stock: Object.keys(stock).map(function (k) { return { name: k, qty: stock[k] }; }) };
  }
  var api = { price: price, priceCp: priceCp, category: category, wealthCp: wealthCp, setWealthCp: setWealthCp, shopFor: shopFor, SLOTS: SLOTS, MAGIC: MAGIC, ensure: ensure, recompute: recompute, equip: equip, unequip: unequip, drop: drop, addItem: addItem, qty: qty, kind: kind, describe: describe,
    usePotion: usePotion, shortRest: shortRest, longRest: longRest, lootFor: lootFor, giveLoot: giveLoot, hdInfo: hdInfo, resetRes: resetRes, resLines: resLines, saveActive: saveActive, armorProf: armorProf, weaponProf: weaponProf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDINV = api;
})(typeof window !== 'undefined' ? window : this);
