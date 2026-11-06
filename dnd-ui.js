/* dnd-ui.js - shared look for the game screens: item icons, rarity colours, money formatting, item tooltips.
   Needs dnd-data.js and dnd-inventory.js loaded first. Browser global window.DNDUI. */
(function (root) {
  'use strict';
  var I = root.DNDINV, DATA = root.DNDDATA;
  var IC = {
    sword: '<path d="M25 7 L12 20 M9 17 L15 23 M12 20 L7 25"/><circle cx="6" cy="26" r="1.4"/>', axe: '<path d="M9 26 L22 8"/><path d="M17 11 Q24 3 28 10 Q24 17 20 15 Z"/>',
    hammer: '<path d="M10 27 L20 14"/><rect x="14" y="5" width="13" height="8" rx="1.5" transform="rotate(35 20 9)"/>', bow: '<path d="M10 4 Q29 16 10 28 Z"/><path d="M5 16 H22 M19 13 L22 16 L19 19"/>',
    spear: '<path d="M6 27 L23 9"/><path d="M26 6 L19 8 L24 13 Z"/>', shield: '<path d="M16 4 L26 8 V16 Q26 24 16 29 Q6 24 6 16 V8 Z"/><path d="M16 9 V24 M10 15 H22"/>',
    armor: '<path d="M10 5 L16 8 L22 5 L28 10 L24 14 V27 H8 V14 L4 10 Z"/><path d="M16 8 V27"/>', potion: '<path d="M13 4 H19 M14 4 V11 L8 23 Q8 28 12 28 H20 Q24 28 24 23 L18 11 V4"/><path d="M10 20 H22"/>',
    ring: '<circle cx="16" cy="20" r="8"/><path d="M12 9 L16 4 L20 9 L16 12 Z"/>', amulet: '<path d="M7 4 Q16 16 25 4"/><circle cx="16" cy="21" r="6"/><circle cx="16" cy="21" r="1.5"/>',
    bag: '<path d="M11 11 Q16 2 21 11"/><path d="M9 11 H23 L26 27 H6 Z"/><path d="M12 17 H20"/>', arrows: '<path d="M6 26 L26 6 M26 6 H20 M26 6 V12 M6 26 L4 21 M6 26 L11 28"/>', tool: '<circle cx="16" cy="16" r="9"/><path d="M16 7 V25 M7 16 H25"/>'
  };
  var RC = ['#b5ad9d', '#7fc08a', '#7fa8ec', '#bf8ef0'];
  function esc(t) { return String(t === undefined || t === null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iconKey(n) {
    if (DATA.ARMOR[n]) return n === 'Shield' ? 'shield' : 'armor'; var w = DATA.WEAPONS[n];
    if (w) return /axe|glaive|halberd/i.test(n) ? 'axe' : /hammer|mace|club|maul|flail|morningstar|war pick/i.test(n) ? 'hammer' : /bow|sling|dart|blowgun/i.test(n) ? 'bow' : /spear|javelin|lance|pike|trident|staff/i.test(n) ? 'spear' : 'sword';
    if (I.MAGIC[n]) return I.MAGIC[n].type; if (/arrow|bolt|dart/i.test(n)) return 'arrows'; if (/pack/i.test(n)) return 'bag'; if (/shield/i.test(n)) return 'shield'; return 'tool';
  }
  function icon(n) { return '<svg viewBox="0 0 32 32">' + IC[iconKey(n)] + '</svg>'; }
  function slotIcon(k) { return '<svg viewBox="0 0 32 32">' + IC[{ mainHand: 'sword', offHand: 'shield', armor: 'armor', amulet: 'amulet', ring1: 'ring', ring2: 'ring' }[k]] + '</svg>'; }
  function rarity(n) { var p = I.price(n) || 0; return I.MAGIC[n] && I.MAGIC[n].type !== 'potion' ? (p >= 600 ? 3 : 2) : p >= 700 ? 3 : p >= 150 ? 2 : p >= 40 ? 1 : 0; }
  function fmt(cp) { cp = Math.round(cp); var g = Math.floor(cp / 100), s = Math.floor(cp / 10) % 10, c = cp % 10, o = []; if (g) o.push(g + ' gp'); if (s) o.push(s + ' sp'); if (c) o.push(c + ' cp'); return o.length ? o.join(' ') : '0 gp'; }
  /** What kind of thing it is, plus a warning when the hero cannot use it. */
  function itemInfo(n, H) {
    var w = DATA.WEAPONS[n], a = DATA.ARMOR[n], M = I.MAGIC[n], type = '', warn = '';
    if (w) { type = (w.cat === 'martial' ? 'Martial' : 'Simple') + ' ' + w.kind + ' weapon'; if (H && !I.weaponProf(H, w)) warn = 'You are not proficient with this weapon.'; }
    else if (a) { type = a.type === 'shield' ? 'Shield' : a.type.charAt(0).toUpperCase() + a.type.slice(1) + ' armour'; if (H && !I.armorProf(H, a)) warn = 'You are not proficient: you cannot equip this.'; else if (H && a.str && H.scores.str < a.str) warn = 'Needs Strength ' + a.str + ' (speed -10 ft otherwise).'; }
    else if (M) type = M.type === 'potion' ? 'Consumable' : M.type.charAt(0).toUpperCase() + M.type.slice(1) + (M.attune ? ' - requires attunement' : ''); else type = 'Adventuring gear';
    var desc = I.describe(n) || (/pack/i.test(n) ? 'A bundle of useful adventuring supplies.' : 'Useful kit.');
    if (DATA.PACKS[n]) desc += ' Contains: ' + DATA.PACKS[n].join(', ') + '.';
    return { type: type, desc: desc, warn: warn, color: RC[rarity(n)] };
  }
  function itemTip(n, H, extra) { var i = itemInfo(n, H); return '<h4 style="color:' + i.color + '">' + esc(n) + '</h4><div class="t">' + i.type + '</div><div>' + esc(i.desc) + '</div>' + (i.warn ? '<div class="w">' + i.warn + '</div>' : '') + (extra ? '<div class="pr">' + extra + '</div>' : ''); }
  root.DNDUI = { IC: IC, RC: RC, esc: esc, iconKey: iconKey, icon: icon, slotIcon: slotIcon, rarity: rarity, fmt: fmt, itemInfo: itemInfo, itemTip: itemTip };
})(window);
