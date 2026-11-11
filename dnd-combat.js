/* dnd-combat.js - 5e SRD combat rules (no graphics). Depends on dnd-rules.js (window.DND / require). Turn-based core that a real-time
   "pause-and-command" mode can drive too: everything is a function of explicit state, with an injectable RNG for tests and replays. */
(function (root) {
  'use strict';
  var DND = typeof require === 'function' && typeof module !== 'undefined' ? require('./dnd-rules.js') : root.DND;
  var ABIL = DND.ABILITIES;
  var CONDITIONS = ['blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];

  /** Make a combatant from a character sheet or a plain monster block {name, hp, ac, mods:{..}, prof, speed, saves:{}, attacks:[{name,bonus,dice,type}]} */
  function combatant(src, team) {
    var c = {
      id: src.id || (src.name + '#' + Math.floor(Math.random() * 1e6)), name: src.name, team: team || 'party',
      hp: (src.hp !== undefined && src.hpMax) ? src.hp : (src.hpMax || src.hp), hpMax: src.hpMax || src.hp, temp: 0, ac: src.ac, mods: src.mods || { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      prof: src.profBonus || src.prof || 2, speed: src.speed || 30, saves: src.saves || {}, attacks: src.attacks || [], spellcasting: src.spellcasting || null,
      conditions: {}, resist: src.resist || [], vulnerable: src.vulnerable || [], immune: src.immune || [], dead: false, stable: false, deathSaves: { ok: 0, fail: 0 },
      concentrating: null, initiative: 0, turn: null, level: src.level || 1, cls: src.cls || null, monster: !src.cls, used: src.res && src.res.used ? JSON.parse(JSON.stringify(src.res.used)) : {}, acBonus: 0, dodging: false, rage: false, packTactics: !!src.packTactics, multiattack: src.multiattack || 1, undeadFortitude: !!src.undeadFortitude, layPool: src.res && src.res.layPool !== undefined ? src.res.layPool : (src.cls === 'Paladin' ? 5 * (src.level || 1) : 0), xp: src.xp || 0, critMin: (src.features || []).some(function (f) { return /Improved Critical/.test(f); }) ? 19 : 20, slots: src.res && src.res.slots ? JSON.parse(JSON.stringify(src.res.slots)) : (src.spellcasting ? JSON.parse(JSON.stringify(src.spellcasting.slots)) : {})
    };
    c.baseAC = c.ac; c.potions = { h: 0, g: 0 }; c.potionsUsed = { h: 0, g: 0 };
    (src.inventory || []).forEach(function (x) { if (x.name === 'Potion of Healing') c.potions.h += x.qty; else if (x.name === 'Potion of Greater Healing') c.potions.g += x.qty; });
    return c;
  }
  function has(c, k) { return !!c.conditions[k]; }
  function addCondition(c, k) { c.conditions[k] = true; if (k === 'unconscious' || k === 'paralyzed' || k === 'stunned') c.conditions.incapacitated = true; }
  function removeCondition(c, k) { delete c.conditions[k]; }

  /** Advantage / disadvantage for an attack: returns 'adv' | 'dis' | null (they cancel). ranged = attacker 5 ft or less from target for "within 5 ft" rules. */
  function attackMode(att, tgt, o) {
    o = o || {}; var adv = !!o.adv, dis = !!o.dis, close = o.range === undefined || o.range <= 5;
    if (has(att, 'blinded') || has(att, 'poisoned') || has(att, 'frightened') || has(att, 'prone') || has(att, 'restrained')) dis = true;
    if (has(att, 'invisible')) adv = true;
    if (has(tgt, 'blinded') || has(tgt, 'restrained') || has(tgt, 'stunned') || has(tgt, 'paralyzed') || has(tgt, 'unconscious') || has(tgt, 'petrified')) adv = true;
    if (has(tgt, 'invisible')) dis = true;
    if (has(tgt, 'prone')) { if (close) adv = true; else dis = true; }
    return adv && dis ? null : adv ? 'adv' : dis ? 'dis' : null;
  }
  /** Resolve one attack. atk: {name, bonus, dice:'1d8', mod, type, ranged?, magical?}. Returns a log-friendly result and applies damage. */
  function attack(att, tgt, atk, o, rng) {
    o = o || {}; var mode = attackMode(att, tgt, { adv: o.adv, dis: o.dis, range: o.range });
    var r = DND.d20(atk.bonus, mode, rng); if (att.critMin < 20 && !r.fumble && r.natural >= att.critMin) r.crit = true; var autoCrit = (has(tgt, 'paralyzed') || has(tgt, 'unconscious')) && (o.range === undefined || o.range <= 5);
    var hit = r.crit || (!r.fumble && r.total >= tgt.ac), crit = r.crit || (hit && autoCrit), out = { attacker: att.name, target: tgt.name, attack: atk.name, roll: r, mode: mode, hit: hit, crit: crit, damage: 0 };
    if (!hit) return out;
    var dmg = rollDamage(atk.dice, atk.mod || 0, crit, rng); out.damage = dmg; out.applied = damage(tgt, dmg, atk.type, { crit: crit, magical: atk.magical, melee: !atk.ranged });
    return out;
  }
  function rollDamage(dice, mod, crit, rng) {
    var m = /^(\d*)d(\d+)$/.exec(dice); if (!m) return Math.max(0, (+dice || 0) + mod);
    var n = (+(m[1] || 1)) * (crit ? 2 : 1), t = mod; for (var i = 0; i < n; i++) t += DND.d(+m[2], rng); return Math.max(1, t);
  }
  /** Apply typed damage: immunity / resistance (half, rounded down) / vulnerability (double), then temp HP, then HP. Handles 0 HP rules. */
  function damage(c, amount, type, o) {
    o = o || {}; if (c.immune.indexOf(type) >= 0) amount = 0; else { if (c.resist.indexOf(type) >= 0) amount = Math.floor(amount / 2); if (c.vulnerable.indexOf(type) >= 0) amount *= 2; }
    var res = { amount: amount, type: type, absorbed: 0, hp: 0, droppedToZero: false, killed: false, concentrationDC: null };
    if (amount <= 0 || c.dead) return res;
    if (c.hp === 0) { // already down: each hit is a death save failure (crit = 2); damage >= max HP kills outright
      c.deathSaves.fail += o.crit ? 2 : 1; c.stable = false; if (amount >= c.hpMax || c.deathSaves.fail >= 3) { c.dead = true; res.killed = true; } return res;
    }
    var t = Math.min(c.temp, amount); c.temp -= t; res.absorbed = t; amount -= t;
    var before = c.hp; c.hp = Math.max(0, c.hp - amount); res.hp = before - c.hp;
    if (c.concentrating && res.hp > 0) res.concentrationDC = Math.max(10, Math.floor(res.hp / 2));
    if (c.hp === 0 && c.monster) { res.droppedToZero = true; if (!c.undeadFortitude) { c.dead = true; res.killed = true; } return res; }
    if (c.hp === 0) { res.droppedToZero = true; var overflow = amount - before; if (overflow >= c.hpMax) { c.dead = true; res.killed = true; } else if (!c.dead) { addCondition(c, 'unconscious'); addCondition(c, 'prone'); c.deathSaves = { ok: 0, fail: 0 }; } }
    return res;
  }
  function heal(c, amount) { if (c.dead) return 0; var b = c.hp; c.hp = Math.min(c.hpMax, c.hp + amount); if (b === 0 && c.hp > 0) { removeCondition(c, 'unconscious'); c.deathSaves = { ok: 0, fail: 0 }; c.stable = false; } return c.hp - b; }
  /** Saving throw: returns {roll,total,success}. Uses sheet-style saves {str:{bonus}} or falls back to the ability modifier. */
  function save(c, ability, dc, o, rng) {
    o = o || {}; var s = c.saves[ability], bonus = s && s.bonus !== undefined ? s.bonus : c.mods[ability] || 0, mode = o.mode || null;
    if ((ability === 'str' || ability === 'dex') && (has(c, 'paralyzed') || has(c, 'stunned') || has(c, 'unconscious') || has(c, 'petrified'))) return { natural: 0, total: -99, success: false, auto: true };
    if (ability === 'dex' && has(c, 'restrained')) mode = mode === 'adv' ? null : 'dis';
    var r = DND.d20(bonus, mode, rng); return { natural: r.natural, total: r.total, success: r.total >= dc, dc: dc };
  }
  /** Death saving throw at 0 HP: 10+ success, nat 1 = two failures, nat 20 = back up with 1 HP. */
  function deathSave(c, rng) {
    if (c.hp > 0 || c.dead || c.stable) return null; var r = DND.d20(0, null, rng), res = { natural: r.natural, outcome: '' };
    if (r.natural === 20) { c.hp = 1; removeCondition(c, 'unconscious'); c.deathSaves = { ok: 0, fail: 0 }; res.outcome = 'revived'; return res; }
    if (r.natural === 1) c.deathSaves.fail += 2; else if (r.total >= 10) c.deathSaves.ok++; else c.deathSaves.fail++;
    if (c.deathSaves.fail >= 3) { c.dead = true; res.outcome = 'dead'; } else if (c.deathSaves.ok >= 3) { c.stable = true; res.outcome = 'stable'; } else res.outcome = r.total >= 10 ? 'success' : 'failure';
    return res;
  }
  function concentrationCheck(c, dc, rng) { var r = save(c, 'con', dc, null, rng); if (!r.success) c.concentrating = null; return r; }
  function abilityCheck(c, ability, dc, o, rng) { o = o || {}; var r = DND.d20((c.mods[ability] || 0) + (o.bonus || 0), o.mode || null, rng); return { natural: r.natural, total: r.total, success: dc === undefined ? null : r.total >= dc }; }
  /** Spell save DC / spell attack for a combatant with spellcasting. */
  function castSave(caster, target, spell, rng) { var sc = caster.spellcasting; return save(target, spell.save, sc.saveDC, null, rng); }
  function useSlot(c, level) { if (!c.slots[level]) return false; c.slots[level]--; return true; }
  function shortRest(c, rng) { return c; }
  function longRest(c) { if (c.dead) return; c.hp = c.hpMax; c.temp = 0; c.deathSaves = { ok: 0, fail: 0 }; c.stable = false; c.conditions = {}; if (c.spellcasting) c.slots = JSON.parse(JSON.stringify(c.spellcasting.slots)); c.concentrating = null; }

  /** Encounter: initiative order, rounds, per-turn resources. */
  function Encounter(rng) { this.rng = rng; this.units = []; this.order = []; this.round = 0; this.index = -1; this.log = []; }
  Encounter.prototype.add = function (c) { this.units.push(c); return c; };
  Encounter.prototype.start = function () {
    var self = this; this.units.forEach(function (u) { u.initiative = DND.d20(u.mods.dex, null, self.rng).total + u.mods.dex / 100; });   // dex breaks ties
    this.order = this.units.slice().sort(function (a, b) { return b.initiative - a.initiative; }); this.round = 1; this.index = -1; this.next(); return this.order;
  };
  Encounter.prototype.current = function () { return this.order[this.index] || null; };
  Encounter.prototype.next = function () {
    var guard = 0; do {
      this.index++; if (this.index >= this.order.length) { this.index = 0; this.round++; }
      var u = this.order[this.index]; if (u && !u.dead) { if (u.holdDC && has(u, 'paralyzed')) { var hs = save(u, 'wis', u.holdDC, null, this.rng); if (hs.success) { delete u.conditions.paralyzed; delete u.conditions.incapacitated; u.holdDC = 0; this.log.push(u.name + ' shakes off Hold Person.'); } } u.dodging = false; u.disengaged = false; u.acBonus = 0; u.turn = { action: true, bonus: true, reaction: true, move: u.speed * (has(u, 'grappled') || has(u, 'restrained') ? 0 : 1) }; if (u.hp === 0 && !u.stable) { var ds = deathSave(u, this.rng); this.log.push(u.name + ' death save: ' + ds.outcome); } return u; }
    } while (++guard < this.order.length + 1); return null;
  };
  Encounter.prototype.winner = function () { if (this.escape) return this.escape; var teams = {}; this.units.forEach(function (u) { if (!u.dead && u.hp > 0) teams[u.team] = 1; }); var k = Object.keys(teams); return k.length === 1 ? k[0] : k.length === 0 ? 'none' : null; };
  /** Spend a part of the current turn; returns false if it is not available. */
  Encounter.prototype.spend = function (what, amount) { var u = this.current(); if (!u || !u.turn) return false; if (what === 'move') { if (u.turn.move < amount) return false; u.turn.move -= amount; return true; } if (!u.turn[what]) return false; u.turn[what] = false; return true; };


  // ---------- spell effects (level 0-1) ----------
  var SPELL_FX = {
    'Fire Bolt': { kind: 'attack', dice: '1d10', type: 'fire' }, 'Ray of Frost': { kind: 'attack', dice: '1d8', type: 'cold' }, 'Eldritch Blast': { kind: 'attack', dice: '1d10', type: 'force' },
    'Chill Touch': { kind: 'attack', dice: '1d8', type: 'necrotic' }, 'Shocking Grasp': { kind: 'attack', dice: '1d8', type: 'lightning', melee: true }, 'Produce Flame': { kind: 'attack', dice: '1d8', type: 'fire' },
    'Guiding Bolt': { kind: 'attack', dice: '4d6', type: 'radiant', slot: 1 }, 'Inflict Wounds': { kind: 'attack', dice: '3d10', type: 'necrotic', slot: 1, melee: true }, 'Witch Bolt': { kind: 'attack', dice: '1d12', type: 'lightning', slot: 1 },
    'Ray of Sickness': { kind: 'attack', dice: '2d8', type: 'poison', slot: 1 },
    'Sacred Flame': { kind: 'save', save: 'dex', dice: '1d8', type: 'radiant', half: false }, 'Acid Splash': { kind: 'save', save: 'dex', dice: '1d6', type: 'acid', half: false }, 'Poison Spray': { kind: 'save', save: 'con', dice: '1d12', type: 'poison', half: false },
    'Vicious Mockery': { kind: 'save', save: 'wis', dice: '1d4', type: 'psychic', half: false },
    'Burning Hands': { kind: 'save', save: 'dex', dice: '3d6', type: 'fire', half: true, slot: 1, aoe: true }, 'Thunderwave': { kind: 'save', save: 'con', dice: '2d8', type: 'thunder', half: true, slot: 1, aoe: true },
    'Arms of Hadar': { kind: 'save', save: 'str', dice: '2d6', type: 'necrotic', half: true, slot: 1, aoe: true }, 'Dissonant Whispers': { kind: 'save', save: 'wis', dice: '3d6', type: 'psychic', half: true, slot: 1 },
    'Magic Missile': { kind: 'missiles', slot: 1 }, 'Cure Wounds': { kind: 'heal', dice: '1d8', slot: 1 }, 'Healing Word': { kind: 'heal', dice: '1d4', slot: 1, bonus: true },
    'Scorching Ray': { kind: 'rays', dice: '2d6', type: 'fire', rays: 3, slot: 2 }, 'Melf\'s Acid Arrow': { kind: 'attack', dice: '4d4', type: 'acid', slot: 2 }, 'Spiritual Weapon': { kind: 'attack', dice: '1d8', type: 'force', slot: 2, bonus: true, addMod: true },
    'Shatter': { kind: 'save', save: 'con', dice: '3d8', type: 'thunder', half: true, slot: 2, aoe: true }, 'Moonbeam': { kind: 'save', save: 'con', dice: '2d10', type: 'radiant', half: true, slot: 2, aoe: true }, 'Flaming Sphere': { kind: 'save', save: 'dex', dice: '2d6', type: 'fire', half: true, slot: 2 },
    'Hold Person': { kind: 'hold', save: 'wis', slot: 2 }, 'Prayer of Healing': { kind: 'heal', dice: '2d8', slot: 2 },
    'Fireball': { kind: 'save', save: 'dex', dice: '8d6', type: 'fire', half: true, slot: 3, aoe: true }, 'Lightning Bolt': { kind: 'save', save: 'dex', dice: '8d6', type: 'lightning', half: true, slot: 3, aoe: true },
    'Spirit Guardians': { kind: 'save', save: 'wis', dice: '3d8', type: 'radiant', half: true, slot: 3, aoe: true }, 'Call Lightning': { kind: 'save', save: 'dex', dice: '3d10', type: 'lightning', half: true, slot: 3, aoe: true },
    'Vampiric Touch': { kind: 'attack', dice: '3d6', type: 'necrotic', slot: 3, melee: true, drain: true },
    'Shield': { kind: 'shield', slot: 1, reaction: true }, 'Mage Armor': { kind: 'magearmor', slot: 1 }, 'Sleep': { kind: 'sleep', slot: 1 }, 'Hellish Rebuke': { kind: 'save', save: 'dex', dice: '2d10', type: 'fire', half: true, slot: 1, reaction: true }
  };
  function modeOf(enc, actor, tgt, o) {
    var adv = !!(o && o.adv), dis = !!(o && o.dis);
    if (actor.packTactics && enc && enc.units.some(function (u) { return u !== actor && u.team === actor.team && !u.dead && u.hp > 0; })) adv = true;
    if (tgt.dodging) dis = true; return { adv: adv, dis: dis };
  }
  function effectiveAC(c) { return c.ac + (c.acBonus || 0); }
  function doAttack(enc, actor, tgt, atk, o, rng, log) {
    o = o || {}; var m = modeOf(enc, actor, tgt, o), a = { name: atk.name, bonus: atk.bonus, dice: atk.dice, mod: atk.mod || 0, type: atk.type, ranged: atk.ranged, magical: atk.magical };
    var melee = !a.ranged, strBased = !atk.ability || atk.ability === 'str';
    if (actor.rage && melee && strBased) a.mod += 2;
    var realAC = tgt.ac; tgt.ac = effectiveAC(tgt);
    var r = attack(actor, tgt, a, { adv: m.adv, dis: m.dis, range: o.range }, rng); tgt.ac = realAC;
    var line = actor.name + ' attacks ' + tgt.name + ' with ' + atk.name + ' (' + r.roll.natural + (r.roll.total !== r.roll.natural ? '=' + r.roll.total : '') + (r.mode ? ' ' + r.mode : '') + ' vs AC ' + effectiveAC(tgt) + '): ';
    if (!r.hit) { log.push(line + 'miss.'); return r; }
    var dealt = r.applied ? r.applied.hp + r.applied.absorbed : 0, text = (r.crit ? 'CRITICAL HIT, ' : 'hit, ') + r.damage + ' ' + atk.type;
    if (actor.cls === 'Rogue' && !actor.used.sneak && (r.mode === 'adv' || o.allyNear) && (atk.ranged || (atk.props || []).indexOf('finesse') >= 0)) {
      var sn = rollDamage(Math.ceil((actor.level || 1) / 2) + 'd6', 0, r.crit, rng); damage(tgt, sn, atk.type, { magical: false }); actor.used.sneak = true; text += ' + ' + sn + ' sneak attack'; }
    if (atk.rider && !tgt.dead) { var rd = atk.rider, sv = save(tgt, rd.save, rd.dc, null, rng);
      if (rd.cond && !sv.success) { addCondition(tgt, rd.cond); text += ', ' + tgt.name + ' falls ' + rd.cond; }
      if (rd.dmg) { var d2 = rollDamage(rd.dmg, 0, false, rng); if (sv.success && rd.half) d2 = Math.floor(d2 / 2); if (!sv.success || rd.half) { damage(tgt, d2, rd.type, {}); text += ', +' + d2 + ' ' + rd.type; } } }
    log.push(line + text + (tgt.hp === 0 ? ' - ' + tgt.name + (tgt.dead ? ' is slain!' : ' drops to 0 HP!') : ' (' + tgt.hp + '/' + tgt.hpMax + ' HP).')); return r;
  }
  function checkUndead(tgt, enc, rng, log) {
    if (tgt.undeadFortitude && tgt.hp === 0 && !tgt.dead) { var sv = save(tgt, 'con', 5, null, rng); if (sv.success) { tgt.hp = 1; log.push(tgt.name + ' hangs on (Undead Fortitude).'); } else tgt.dead = true; }
  }
  function hpPool(units, pool, rng) { return units; }
  /** Perform a combat action. action: {id:'attack'|'cast'|'dodge'|'dash'|'secondWind'|'rage'|'layOnHands'|'move', attack:index, spell:name, amount, distance}. targets: array of combatants.
   *  Returns {ok, log:[strings]} and spends the actor's action economy via enc.spend. */
  function act(enc, actor, action, targets, rng) {
    var log = [], t = targets && targets[0], id = action.id;
    function fail(m) { return { ok: false, log: [m] }; }
    if (actor.dead || actor.hp <= 0) return fail(actor.name + ' cannot act.');
    if (has(actor, 'incapacitated') && id !== 'move') return fail(actor.name + ' is incapacitated.');
    if (id === 'attack') {
      if (!t) return fail('Choose a target.'); var list = actor.attacks, n = actor.multiattack || 1, first = list[action.attack || 0]; if (!first) return fail('No such attack.');
      if (!enc.spend('action')) return fail('No action left.'); var ex = (actor.cls === 'Fighter' || actor.cls === 'Barbarian' || actor.cls === 'Paladin' || actor.cls === 'Ranger') && actor.level >= 5 ? 2 : 1; n = Math.max(n, ex);
      for (var i = 0; i < n && !t.dead && t.hp > 0; i++) { var atk = n > 1 && !actor.cls ? list[i % list.length] : first; doAttack(enc, actor, t, atk, action, rng, log); checkUndead(t, enc, rng, log); }
      return { ok: true, log: log };
    }
    if (id === 'cast') {
      var sc = actor.spellcasting, fx = SPELL_FX[action.spell]; if (!sc || !fx) return fail('That spell has no combat effect here.');
      var lvl = fx.slot || 0; if (lvl && !(actor.slots[lvl] > 0)) return fail('No level-' + lvl + ' spell slot left.');
      if (!enc.spend(fx.bonus ? 'bonus' : fx.reaction ? 'reaction' : 'action')) return fail('That action is not available.');
      if (lvl) useSlot(actor, lvl); var mod = actor.mods[sc.ability] || 0;
      if (fx.kind === 'attack') { if (!t) return fail('Choose a target.'); var sa = { name: action.spell, bonus: sc.attackBonus, dice: fx.dice, mod: fx.addMod ? mod : 0, type: fx.type, ranged: !fx.melee, magical: true }, hp0 = t.hp; doAttack(enc, actor, t, sa, { range: fx.melee ? 5 : 30 }, rng, log);
        if (fx.drain && t.hp < hp0) { var dr = heal(actor, Math.floor((hp0 - t.hp) / 2)); if (dr) log.push(actor.name + ' drains ' + dr + ' HP.'); } }
      else if (fx.kind === 'rays') { if (!t) return fail('Choose a target.'); for (var ri = 0; ri < fx.rays && !t.dead && t.hp > 0; ri++) doAttack(enc, actor, t, { name: action.spell + ' ray ' + (ri + 1), bonus: sc.attackBonus, dice: fx.dice, mod: 0, type: fx.type, ranged: true, magical: true }, { range: 30 }, rng, log); }
      else if (fx.kind === 'hold') { if (!t) return fail('Choose a target.'); var hv = save(t, fx.save, sc.saveDC, null, rng);
        if (hv.success) log.push(actor.name + ' casts Hold Person: ' + t.name + ' resists (' + hv.total + ' vs DC ' + sc.saveDC + ').'); else { addCondition(t, 'paralyzed'); t.holdDC = sc.saveDC; log.push(actor.name + ' casts Hold Person: ' + t.name + ' is paralyzed (' + hv.total + ' vs DC ' + sc.saveDC + ').'); } }
      else if (fx.kind === 'save') { var tg = fx.aoe ? targets : [t]; if (!t) return fail('Choose a target.'); var dmg = rollDamage(fx.dice, 0, false, rng);
        tg.forEach(function (x) { if (x.dead) return; var sv = save(x, fx.save, sc.saveDC, null, rng), d3 = sv.success ? (fx.half ? Math.floor(dmg / 2) : 0) : dmg; if (d3 > 0) damage(x, d3, fx.type, { magical: true }); log.push(actor.name + ' casts ' + action.spell + ': ' + x.name + ' ' + (sv.success ? 'saves (' + sv.total + ' vs DC ' + sc.saveDC + ')' : 'fails (' + sv.total + ' vs DC ' + sc.saveDC + ')') + ', takes ' + d3 + ' ' + fx.type + ' (' + x.hp + '/' + x.hpMax + ' HP)' + (x.hp === 0 ? (x.dead ? ' - slain' : ' - down') : '') + '.'); }); }
      else if (fx.kind === 'missiles') { if (!t) return fail('Choose a target.'); var tot = 0; for (var k = 0; k < 3; k++) tot += rollDamage('1d4', 1, false, rng); damage(t, tot, 'force', { magical: true }); log.push(actor.name + ' casts Magic Missile at ' + t.name + ': ' + tot + ' force (' + t.hp + '/' + t.hpMax + ' HP).'); }
      else if (fx.kind === 'heal') { var who = t || actor, amt = rollDamage(fx.dice, mod, false, rng); var got = heal(who, amt); log.push(actor.name + ' casts ' + action.spell + ' on ' + who.name + ': +' + got + ' HP (' + who.hp + '/' + who.hpMax + ').'); }
      else if (fx.kind === 'shield') { actor.acBonus = 5; log.push(actor.name + ' casts Shield (+5 AC until next turn).'); }
      else if (fx.kind === 'magearmor') { var w = t || actor; w.ac = 13 + (w.mods.dex || 0); w.baseAC = w.ac; log.push(actor.name + ' casts Mage Armor on ' + w.name + ' (AC ' + w.ac + ').'); }
      else if (fx.kind === 'sleep') { var pool = rollDamage('5d8', 0, false, rng), cand = (targets || []).filter(function (x) { return !x.dead && x.hp > 0; }).sort(function (a, b) { return a.hp - b.hp; }), put = [];
        cand.forEach(function (x) { if (x.hp <= pool && !has(x, 'unconscious')) { pool -= x.hp; addCondition(x, 'unconscious'); addCondition(x, 'prone'); put.push(x.name); } }); log.push(actor.name + ' casts Sleep: ' + (put.length ? put.join(', ') + ' fall asleep.' : 'nobody falls asleep.')); }
      return { ok: true, log: log };
    }
    if (id === 'flee') { var fo = enc.units.filter(function (u) { return u.team !== actor.team && !u.dead && u.hp > 0; }); if (!fo.length) return fail('Nobody to flee from.'); if (!enc.spend('action')) return fail('No action left.');
      var dc = 10 + Math.max.apply(null, fo.map(function (u) { return u.mods.dex || 0; })) + (fo.length - 1), fr = DND.d20(actor.mods.dex || 0, has(actor, 'restrained') || has(actor, 'grappled') ? 'dis' : null, rng);
      if (fr.total >= dc) { enc.escape = 'fled'; return { ok: true, log: [actor.name + ' breaks away and runs (' + fr.total + ' vs DC ' + dc + ').'] }; }
      return { ok: true, log: [actor.name + ' tries to run but cannot break away (' + fr.total + ' vs DC ' + dc + ').'] }; }
    if (id === 'surrender') { enc.escape = 'surrender'; return { ok: true, log: [actor.name + ' throws down their weapons and yields.'] }; }
    if (id === 'potion') { var pk = action.kind === 'g' ? 'g' : 'h'; if (!actor.potions || !(actor.potions[pk] > 0)) return fail('You have no such potion.'); if (actor.hp >= actor.hpMax) return fail('You are already at full hit points.'); if (!enc.spend('action')) return fail('No action left.');
      actor.potions[pk]--; actor.potionsUsed[pk]++; var ph = heal(actor, pk === 'g' ? rollDamage('4d4', 4, false, rng) : rollDamage('2d4', 2, false, rng)); return { ok: true, log: [actor.name + ' drinks a Potion of ' + (pk === 'g' ? 'Greater ' : '') + 'Healing: +' + ph + ' HP (' + actor.hp + '/' + actor.hpMax + ').'] }; }
    if (id === 'dodge') { if (!enc.spend('action')) return fail('No action left.'); actor.dodging = true; return { ok: true, log: [actor.name + ' takes the Dodge action.'] }; }
    if (id === 'disengage') { if (!enc.spend('action')) return fail('No action left.'); actor.disengaged = true; return { ok: true, log: [actor.name + ' disengages (no opportunity attacks this turn).'] }; }
    if (id === 'actionSurge') { if (actor.cls !== 'Fighter' || actor.level < 2 || actor.used.surge) return fail('Action Surge is not available.'); actor.used.surge = true; actor.turn.action = true; return { ok: true, log: [actor.name + ' uses Action Surge: one additional action.'] }; }
    if (id === 'dash') { if (!enc.spend('action')) return fail('No action left.'); actor.turn.move += actor.speed; return { ok: true, log: [actor.name + ' dashes.'] }; }
    if (id === 'secondWind') { if (actor.cls !== 'Fighter' || actor.used.secondWind) return fail('Second Wind is not available.'); if (!enc.spend('bonus')) return fail('No bonus action left.'); actor.used.secondWind = true; var g = heal(actor, rollDamage('1d10', actor.level, false, rng)); return { ok: true, log: [actor.name + ' uses Second Wind: +' + g + ' HP.'] }; }
    if (id === 'rage') { if (actor.cls !== 'Barbarian' || actor.rage) return fail('Rage is not available.'); if ((actor.used.rage || 0) >= (actor.level >= 3 ? 3 : 2)) return fail('No rages left.'); if (!enc.spend('bonus')) return fail('No bonus action left.'); actor.rage = true; actor.used.rage = (actor.used.rage || 0) + 1; ['bludgeoning', 'piercing', 'slashing'].forEach(function (x) { if (actor.resist.indexOf(x) < 0) actor.resist.push(x); }); return { ok: true, log: [actor.name + ' flies into a Rage! (+2 damage, resistance to weapon damage)'] }; }
    if (id === 'layOnHands') { var w2 = t || actor; if (actor.cls !== 'Paladin' || actor.layPool <= 0) return fail('Lay on Hands is not available.'); if (!enc.spend('action')) return fail('No action left.'); var amt2 = Math.min(actor.layPool, action.amount || 5, w2.hpMax - w2.hp); actor.layPool -= amt2; heal(w2, amt2); return { ok: true, log: [actor.name + ' lays hands on ' + w2.name + ': +' + amt2 + ' HP.'] }; }
    return fail('Unknown action.');
  }
  /** What the UI can offer the current actor. */
  function actions(c) {
    var o = [], i; c.attacks.forEach(function (a, i2) { o.push({ id: 'attack', attack: i2, label: a.name + ' (' + (a.bonus >= 0 ? '+' : '') + a.bonus + ', ' + (/^\d+$/.test(a.dice) ? Math.max(0, +a.dice + (a.mod || 0)) : a.dice + ((a.mod || 0) ? (a.mod > 0 ? '+' : '') + a.mod : '')) + ')', target: 'enemy' }); });
    var sc = c.spellcasting; if (sc) (sc.cantripList || []).concat(sc.preparedSpells || [], sc.domainSpells || []).filter(function (n, k, a) { return a.indexOf(n) === k; }).forEach(function (n) { var fx = SPELL_FX[n]; if (!fx) return;
      o.push({ id: 'cast', spell: n, label: n + (fx.slot ? ' (L' + fx.slot + ', ' + (c.slots[fx.slot] || 0) + ' left)' : ''), target: fx.kind === 'heal' || fx.kind === 'magearmor' ? 'ally' : fx.kind === 'shield' ? 'none' : 'enemy', aoe: !!fx.aoe || fx.kind === 'sleep' }); });
    if (c.cls === 'Fighter' && !c.used.secondWind) o.push({ id: 'secondWind', label: 'Second Wind', target: 'none' }); if (c.cls === 'Fighter' && c.level >= 2 && !c.used.surge) o.push({ id: 'actionSurge', label: 'Action Surge', target: 'none' }); if (c.cls === 'Barbarian' && !c.rage) o.push({ id: 'rage', label: 'Rage', target: 'none' });
    if (c.cls === 'Paladin' && c.layPool > 0) o.push({ id: 'layOnHands', label: 'Lay on Hands (' + c.layPool + ' HP pool)', target: 'ally' });
    if (c.potions && c.potions.h > 0) o.push({ id: 'potion', kind: 'h', label: 'Potion of Healing (' + c.potions.h + ')', target: 'none' }); if (c.potions && c.potions.g > 0) o.push({ id: 'potion', kind: 'g', label: 'Greater Healing potion (' + c.potions.g + ')', target: 'none' });
    if (c.team === 'party' && !c.companion) { o.push({ id: 'flee', label: 'Flee (Dex check)', target: 'none' }); o.push({ id: 'surrender', label: 'Surrender', target: 'none' }); }
    o.push({ id: 'dodge', label: 'Dodge', target: 'none' }); o.push({ id: 'dash', label: 'Dash', target: 'none' }); o.push({ id: 'disengage', label: 'Disengage', target: 'none' }); return o;
  }
  /** Simple monster / auto AI: attack the weakest living enemy. */
  function aiTurn(enc, actor, rng) {
    var foes = enc.units.filter(function (u) { return u.team !== actor.team && !u.dead && u.hp > 0; }); if (!foes.length) return [];
    foes.sort(function (a, b) { return a.hp - b.hp; }); var melee = 0; actor.attacks.forEach(function (a, i) { if (!a.ranged && !melee) melee = i; });
    var best = 0, bd = -1; actor.attacks.forEach(function (a, i) { var e = (a.bonus || 0) + 0 * i + DNDavg(a); if (e > bd) { bd = e; best = i; } });
    if (actor.potions && actor.hp > 0 && actor.hp <= actor.hpMax / 4 && (actor.potions.g > 0 || actor.potions.h > 0)) return act(enc, actor, { id: 'potion', kind: actor.potions.g > 0 ? 'g' : 'h' }, [], rng).log;
    if (actor.cls === 'Barbarian' && !actor.rage) act(enc, actor, { id: 'rage' }, [], rng);
    if (actor.cls === 'Fighter' && !actor.used.secondWind && actor.hp <= actor.hpMax / 2) return act(enc, actor, { id: 'secondWind' }, [], rng).log;
    var sc = actor.spellcasting; if (sc) { var opts = actions(actor).filter(function (a) { return a.id === 'cast' && a.target === 'enemy'; }); if (opts.length) { var pick = opts[opts.length - 1]; var ally = enc.units.filter(function (u) { return u.team === actor.team && !u.dead && u.hp > 0 && u.hp < u.hpMax / 2; }).sort(function (a, b) { return a.hp - b.hp; })[0];
      var heals = actions(actor).filter(function (a) { return a.id === 'cast' && a.target === 'ally' && /Cure|Healing/.test(a.spell); }); if (ally && heals.length && actor.slots[1] > 0) return act(enc, actor, { id: 'cast', spell: heals[0].spell }, [ally], rng).log;
      var withSlot = opts.filter(function (a) { var fx = SPELL_FX[a.spell]; return !fx.slot || actor.slots[fx.slot] > 0; }); pick = withSlot[withSlot.length - 1] || opts[0]; var fx2 = SPELL_FX[pick.spell]; return act(enc, actor, { id: 'cast', spell: pick.spell }, fx2.aoe || fx2.kind === 'sleep' ? foes : [foes[0]], rng).log; } }
    return act(enc, actor, { id: 'attack', attack: actor.multiattack > 1 ? 0 : best }, [foes[0]], rng).log;
  }
  function DNDavg(a) { var m = /^(\d*)d(\d+)$/.exec(a.dice); return m ? (+(m[1] || 1)) * (+m[2] + 1) / 2 + (a.mod || 0) : (+a.dice || 0) + (a.mod || 0); }

  var api = { doAttack: doAttack, SPELL_FX: SPELL_FX, act: act, actions: actions, aiTurn: aiTurn, effectiveAC: effectiveAC, CONDITIONS: CONDITIONS, combatant: combatant, attackMode: attackMode, attack: attack, rollDamage: rollDamage, damage: damage, heal: heal, save: save, deathSave: deathSave,
    concentrationCheck: concentrationCheck, abilityCheck: abilityCheck, castSave: castSave, useSlot: useSlot, longRest: longRest, addCondition: addCondition, removeCondition: removeCondition, Encounter: Encounter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDCOMBAT = api;
})(typeof window !== 'undefined' ? window : this);
