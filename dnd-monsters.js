/* dnd-monsters.js - a starter bestiary of SRD 5.1 monsters (CR 0-2), as combatant-ready stat blocks. Stats follow the SRD; CC-BY-4.0. */
(function (root) {
  'use strict';
  function M(name, cr, xp, hp, ac, speed, ab, saves, attacks, extra) {
    var mods = {}; ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(function (a, i) { mods[a] = Math.floor((ab[i] - 10) / 2); });
    var o = { name: name, cr: cr, xp: xp, hp: hp, hpMax: hp, ac: ac, speed: speed, mods: mods, prof: cr >= 1 ? 2 : 2, saves: {}, attacks: attacks, resist: [], vulnerable: [], immune: [], traits: [] };
    Object.keys(saves || {}).forEach(function (k) { o.saves[k] = { bonus: saves[k] }; }); Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; }); return o;
  }
  function A(name, bonus, dice, mod, type, ranged, rider) { return { name: name, bonus: bonus, dice: dice, mod: mod, type: type, ranged: !!ranged, rider: rider || null }; }
  var LIST = [
    M('Giant Rat', 0.125, 25, 7, 12, 30, [7, 15, 11, 2, 10, 4], {}, [A('Bite', 4, '1d4', 2, 'piercing')]),
    M('Kobold', 0.125, 25, 5, 12, 30, [7, 15, 9, 8, 7, 8], {}, [A('Dagger', 4, '1d4', 2, 'piercing')], { traits: ['Pack Tactics: advantage when an ally is next to the target'], packTactics: true }),
    M('Goblin', 0.25, 50, 7, 15, 30, [8, 14, 10, 10, 8, 8], {}, [A('Scimitar', 4, '1d6', 2, 'slashing'), A('Shortbow', 4, '1d6', 2, 'piercing', true)], { traits: ['Nimble Escape: Disengage or Hide as a bonus action'] }),
    M('Skeleton', 0.25, 50, 13, 13, 30, [10, 14, 15, 6, 8, 5], {}, [A('Shortsword', 4, '1d6', 2, 'piercing'), A('Shortbow', 4, '1d6', 2, 'piercing', true)], { vulnerable: ['bludgeoning'], immune: ['poison'] }),
    M('Zombie', 0.25, 50, 22, 8, 20, [13, 6, 16, 3, 6, 5], { wis: 0 }, [A('Slam', 3, '1d6', 1, 'bludgeoning')], { immune: ['poison'], traits: ['Undead Fortitude: at 0 HP, Con save to drop to 1 HP instead'], undeadFortitude: true }),
    M('Wolf', 0.25, 50, 11, 13, 40, [12, 15, 12, 3, 12, 6], {}, [A('Bite', 4, '2d4', 2, 'piercing', false, { save: 'str', dc: 11, cond: 'prone' })], { packTactics: true, traits: ['Pack Tactics', 'Keen hearing and smell'] }),
    M('Bandit', 0.125, 25, 11, 12, 30, [11, 12, 12, 10, 10, 10], {}, [A('Scimitar', 3, '1d6', 1, 'slashing'), A('Light crossbow', 3, '1d8', 1, 'piercing', true)]),
    M('Guard', 0.125, 25, 11, 16, 30, [13, 12, 12, 10, 11, 10], {}, [A('Spear', 3, '1d6', 1, 'piercing')]),
    M('Orc', 0.5, 100, 15, 13, 30, [16, 12, 16, 7, 11, 10], {}, [A('Greataxe', 5, '1d12', 3, 'slashing')], { traits: ['Aggressive: bonus action to move toward a foe'] }),
    M('Brown Bear', 1, 200, 34, 11, 40, [19, 10, 16, 2, 13, 7], {}, [A('Bite', 5, '1d8', 4, 'piercing'), A('Claws', 5, '2d6', 4, 'slashing')], { multiattack: 2 }),
    M('Giant Spider', 1, 200, 26, 14, 30, [14, 16, 12, 2, 11, 4], {}, [A('Bite', 5, '1d8', 3, 'piercing', false, { save: 'con', dc: 11, dmg: '2d8', type: 'poison', half: true })]),
    M('Ogre', 2, 450, 59, 11, 40, [19, 8, 16, 5, 7, 7], {}, [A('Greatclub', 6, '2d8', 4, 'bludgeoning'), A('Javelin', 6, '2d6', 4, 'piercing', true)])
  ];
  var BESTIARY = {}; LIST.forEach(function (m) { BESTIARY[m.name] = m; });
  function make(name) { return JSON.parse(JSON.stringify(BESTIARY[name])); }
  var api = { BESTIARY: BESTIARY, LIST: LIST, make: make };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DNDMONSTERS = api;
})(typeof window !== 'undefined' ? window : this);
