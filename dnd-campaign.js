/* dnd-campaign.js — campaign state, persistence and player-facing utilities.
   Uses the existing DND / DNDDATA rules modules; keeps campaign data separate from map and chess state. */
(function (root) {
  'use strict';
  var D = root.DND, DATA = root.DNDDATA;
  var KEY = 'dnd.campaigns.v1', ACTIVE = 'dnd.campaign.active.v1';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function id() { return 'camp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function read(k, fallback) { try { var v = root.localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function write(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function now() { return new Date().toISOString(); }
  function normalizeCharacter(ch) {
    var c = copy(ch || {});
    c.id = c.id || ('char-' + Math.random().toString(36).slice(2, 10));
    c.currentHp = Number.isFinite(c.currentHp) ? c.currentHp : (Number.isFinite(c.hp) ? c.hp : c.hpMax || 1);
    c.hpMax = Math.max(1, Number(c.hpMax || c.hp || 1));
    c.currentHp = Math.max(0, Math.min(c.hpMax, c.currentHp));
    c.tempHp = Math.max(0, Number(c.tempHp || 0));
    c.inspiration = !!c.inspiration;
    c.conditions = Array.isArray(c.conditions) ? c.conditions : [];
    c.deathSaves = c.deathSaves || { ok: 0, fail: 0 };
    c.hitDice = c.hitDice || { die: c.hitDie || 'd8', total: Number(c.level || 1), remaining: Number(c.level || 1) };
    c.hitDice.total = Math.max(1, Number(c.hitDice.total || c.level || 1));
    c.hitDice.remaining = Math.max(0, Math.min(c.hitDice.total, Number(c.hitDice.remaining === undefined ? c.hitDice.total : c.hitDice.remaining)));
    c.inventory = Array.isArray(c.inventory) ? c.inventory : [];
    c.equipment = c.equipment || { armor: null, mainHand: null, offHand: null, shield: null, rings: [], amulet: null, other: [] };
    c.currency = c.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    c.attuned = Array.isArray(c.attuned) ? c.attuned : [];
    c.xp = Number(c.xp || (c.details && c.details.xp) || 0);
    return c;
  }
  function makeCampaign(name) {
    return { schemaVersion: 1, id: id(), name: String(name || 'New Campaign').trim().slice(0, 80) || 'New Campaign',
      createdAt: now(), updatedAt: now(), activeCharacterId: null, characters: [], party: [],
      quests: [], journal: [], npcs: [], world: { discovered: [], flags: {}, notes: '' },
      settings: { optionalEncumbrance: false, survivalRules: false, dmMode: false }, session: { number: 1, notes: '' } };
  }
  function validate(c) {
    if (!c || c.schemaVersion !== 1 || typeof c.id !== 'string' || !Array.isArray(c.characters) || !Array.isArray(c.quests) || !Array.isArray(c.journal)) throw new Error('This is not a supported D&D campaign save.');
    c.characters = c.characters.map(normalizeCharacter);
    if (c.activeCharacterId && !c.characters.some(function (x) { return x.id === c.activeCharacterId; })) c.activeCharacterId = c.characters[0] ? c.characters[0].id : null;
    return c;
  }
  function slots() { return read(KEY, []); }
  function save(c) {
    validate(c); c.updatedAt = now();
    var a = slots(), i = a.findIndex(function (x) { return x.id === c.id; });
    if (i < 0) a.push(copy(c)); else a[i] = copy(c);
    if (!write(KEY, a) || !write(ACTIVE, c.id)) throw new Error('Browser storage is full or unavailable. Export a backup and free storage space.');
    return c;
  }
  function create(name) { var c = makeCampaign(name); save(c); return c; }
  function load(campaignId) {
    var c = slots().find(function (x) { return x.id === campaignId; });
    if (!c) throw new Error('Campaign save not found.');
    write(ACTIVE, c.id); return validate(copy(c));
  }
  function active() { var aid = read(ACTIVE, null), a = slots(), c = a.find(function (x) { return x.id === aid; }); return c ? validate(copy(c)) : null; }
  function remove(campaignId) { var a = slots().filter(function (x) { return x.id !== campaignId; }); write(KEY, a); if (read(ACTIVE, null) === campaignId) write(ACTIVE, a[0] ? a[0].id : null); }
  function exportSave(c) { return JSON.stringify(validate(copy(c)), null, 2); }
  function importSave(json) { var c; try { c = validate(JSON.parse(json)); } catch (e) { throw new Error(e.message || 'Invalid campaign JSON.'); } c.id = id(); c.name = (c.name || 'Imported Campaign').slice(0, 72) + ' (imported)'; c.createdAt = now(); c.updatedAt = now(); save(c); return c; }
  function activeCharacter(c) { return c.characters.find(function (x) { return x.id === c.activeCharacterId; }) || c.characters[0] || null; }
  function addCharacter(c, ch) {
    var x = normalizeCharacter(ch);
    if (c.characters.some(function (v) { return v.id === x.id; })) x.id = 'char-' + Math.random().toString(36).slice(2, 10);
    c.characters.push(x); c.party.push({ id: x.id, name: x.name, kind: 'character', active: true });
    if (!c.activeCharacterId) c.activeCharacterId = x.id; return x;
  }
  function syncCharacterToLegacy(c, ch) {
    var all = read('dnd.characters', []), x = copy(ch);
    x.hp = ch.currentHp; x.tempHp = ch.tempHp; x.xp = ch.xp; x.conditions = copy(ch.conditions);
    var i = all.findIndex(function (v) { return v.id === ch.id || (v.name === ch.name && v.cls === ch.cls); });
    if (i >= 0) all[i] = x; else all.push(x);
    write('dnd.characters', all); write('dnd.active', x);
  }
  function roll(expr, mode, rng) {
    rng = rng || Math.random; var source = String(expr || '1d20').replace(/\s+/g, '');
    var adv = mode === 'adv' || mode === 'dis', isD20 = /^1d20$/i.test(source);
    if (adv && !isD20) throw new Error('Advantage and disadvantage apply to a d20 roll.');
    var terms = source.match(/[+-]?[^+-]+/g); if (!terms) throw new Error('Enter a dice expression such as 2d6+3.');
    var rolls = [], total = 0;
    terms.forEach(function (term) {
      var sign = term.charAt(0) === '-' ? -1 : 1, t = /^[+-]/.test(term) ? term.slice(1) : term, m = /^(\d*)d(\d+)$/i.exec(t);
      if (m) { var n = +(m[1] || 1), sides = +m[2]; if (n < 1 || n > 100 || sides < 2 || sides > 1000) throw new Error('Dice count or die size is outside the supported range.'); for (var i=0;i<n;i++) { var v = 1 + Math.floor(rng()*sides); rolls.push({ die: 'd'+sides, value: v, sign: sign }); total += sign*v; } }
      else if (/^\d+$/.test(t)) total += sign*(+t); else throw new Error('Invalid dice term: '+term);
    });
    if (adv) { var a=1+Math.floor(rng()*20), b=1+Math.floor(rng()*20), chosen=mode==='adv'?Math.max(a,b):Math.min(a,b); return { expression:source, mode:mode, rolls:[{die:'d20',value:a},{die:'d20',value:b}], natural:chosen, total:chosen, critical:chosen===20, fumble:chosen===1 }; }
    return { expression:source, mode:'normal', rolls:rolls, total:total, natural:rolls.length===1&&rolls[0].die==='d20'?rolls[0].value:null, critical:rolls.length===1&&rolls[0].die==='d20'&&rolls[0].value===20, fumble:rolls.length===1&&rolls[0].die==='d20'&&rolls[0].value===1 };
  }
  function addItem(ch, name, qty, extra) {
    qty = Math.max(1, Math.floor(Number(qty || 1))); var item = Object.assign({ id:'item-'+Math.random().toString(36).slice(2,9), name:String(name).slice(0,100), qty:qty, weight:0, category:'gear', magical:false, rarity:null, attunement:false, description:'' }, extra || {});
    var old = ch.inventory.find(function (x) { return x.name === item.name && x.category === item.category && !x.magical; });
    if (old) old.qty += qty; else ch.inventory.push(item); return old || item;
  }
  function removeItem(ch, itemId, qty) { var x=ch.inventory.find(function(i){return i.id===itemId}); if(!x)return false; x.qty-=Math.max(1,Math.floor(qty||1)); if(x.qty<=0){ch.inventory=ch.inventory.filter(function(i){return i.id!==itemId}); Object.keys(ch.equipment).forEach(function(k){if(ch.equipment[k]===itemId)ch.equipment[k]=null})} return true; }
  function equip(ch, itemId, slot) {
    var x=ch.inventory.find(function(i){return i.id===itemId}); if(!x)throw new Error('Item is not in this character’s inventory.');
    var allowed=['armor','mainHand','offHand','shield','amulet'];
    if(allowed.indexOf(slot)<0)throw new Error('Unsupported equipment slot.');
    if(slot==='armor'&&!(DATA.ARMOR&&DATA.ARMOR[x.name]&&DATA.ARMOR[x.name].type!=='shield'))throw new Error('Select an armor item.');
    if(slot==='shield'&&x.name!=='Shield')throw new Error('Select a shield.');
    if((slot==='mainHand'||slot==='offHand')&&!(DATA.WEAPONS&&DATA.WEAPONS[x.name]))throw new Error('Select a weapon.');
    ch.equipment[slot]=itemId; return recalculate(ch);
  }
  function unequip(ch, slot) { if(ch.equipment[slot]!==undefined)ch.equipment[slot]=null; return recalculate(ch); }
  function recalculate(ch) {
    var dex=(ch.mods&&ch.mods.dex)||0, str=(ch.mods&&ch.mods.str)||0, base=10+dex, armorId=ch.equipment.armor, shieldId=ch.equipment.shield;
    var armor=ch.inventory.find(function(x){return x.id===armorId}), shield=ch.inventory.find(function(x){return x.id===shieldId});
    if(armor&&DATA.ARMOR[armor.name]){var a=DATA.ARMOR[armor.name];base=a.base+(a.dexCap===null?dex:Math.min(dex,a.dexCap));if(a.str&&str<a.str)ch.armorWarning=a.name+' requires Strength '+a.str+'.';else ch.armorWarning='';}
    if(shield&&shield.name==='Shield')base+=2;
    if(ch.cls==='Monk'&&!armor)base=10+dex+((ch.mods&&ch.mods.wis)||0);
    if(ch.cls==='Barbarian'&&!armor)base=10+dex+((ch.mods&&ch.mods.con)||0);
    if(ch.fightingStyle==='Defense'&&armor)base+=1;
    if(armor&&armor.name==='Studded leather'&&ch.race==='Dwarf'&&false){} // reserved for explicit feature hooks
    ch.ac=base; return base;
  }
  function shortRest(ch, diceCount, rng) {
    rng=rng||Math.random; var available=ch.hitDice.remaining, spend=Math.max(0,Math.min(available,Math.floor(Number(diceCount||0)))), results=[], healed=0, con=(ch.mods&&ch.mods.con)||0;
    if(!spend)return {spent:0,healed:0,remaining:available,rolls:[]};
    var die=String(ch.hitDice.die||ch.hitDie||'d8'), sides=+(die.replace(/^d/i,''))||8;
    for(var i=0;i<spend;i++){var r=1+Math.floor(rng()*sides), gain=Math.max(0,r+con), got=Math.min(gain,ch.hpMax-ch.currentHp);ch.currentHp+=got;healed+=got;results.push({roll:r,modifier:con,healed:got});}
    ch.hitDice.remaining-=spend; return {spent:spend,healed:healed,remaining:ch.hitDice.remaining,rolls:results};
  }
  function longRest(ch, timestamp) {
    var at=timestamp?new Date(timestamp).getTime():Date.now(), last=ch.lastLongRestAt?new Date(ch.lastLongRestAt).getTime():0;
    if(last&&at-last<24*60*60*1000)throw new Error('A character can benefit from only one long rest in a 24-hour period.');
    var before=ch.currentHp; ch.currentHp=ch.hpMax; ch.tempHp=0; ch.deathSaves={ok:0,fail:0}; ch.stable=false; ch.conditions=ch.conditions.filter(function(x){return x!=='unconscious'&&x!=='prone'}); 
    ch.hitDice.remaining=Math.min(ch.hitDice.total,ch.hitDice.remaining+Math.max(1,Math.floor(ch.hitDice.total/2)));
    ch.lastLongRestAt=new Date(at).toISOString();
    if(ch.spellcasting&&ch.spellcasting.slots)ch.spellSlots=copy(ch.spellcasting.slots);
    ch.classResources=ch.classResources||{}; Object.keys(ch.classResources).forEach(function(k){var r=ch.classResources[k];if(r&&r.max!==undefined)r.current=r.max;});
    return {healed:ch.currentHp-before,hitDiceRecovered:Math.min(Math.max(1,Math.floor(ch.hitDice.total/2)),ch.hitDice.total-(ch.hitDice.remaining-Math.max(1,Math.floor(ch.hitDice.total/2))))};
  }
  function addQuest(c, quest) { var q=Object.assign({id:'quest-'+Math.random().toString(36).slice(2,9),title:'Untitled quest',description:'',status:'active',objectives:[],rewards:{xp:0,gp:0,items:[]},createdAt:now()},quest||{}); c.quests.push(q); return q; }
  function setObjective(c, questId, objectiveId, done) { var q=c.quests.find(function(x){return x.id===questId}); if(!q)throw new Error('Quest not found.'); var o=q.objectives.find(function(x){return x.id===objectiveId}); if(!o)throw new Error('Objective not found.'); o.done=!!done; if(q.objectives.length&&q.objectives.every(function(x){return x.done;}))q.status='completed'; else if(q.status==='completed')q.status='active'; }
  function award(c, ch, rewards) { rewards=rewards||{}; ch.xp+=Math.max(0,Number(rewards.xp||0)); ch.currency.gp+=Math.max(0,Number(rewards.gp||0)); (rewards.items||[]).forEach(function(x){addItem(ch,x.name,x.qty||1,x)}); return {xp:ch.xp,gp:ch.currency.gp}; }
  function journal(c, entry) { c.journal.push({id:'entry-'+Math.random().toString(36).slice(2,9),at:now(),type:entry.type||'note',title:String(entry.title||'Session note').slice(0,100),body:String(entry.body||'').slice(0,4000)}); }
  function carryWeight(ch) { return ch.inventory.reduce(function(a,x){return a+(Number(x.weight)||0)*(Number(x.qty)||1)},0); }
  function carryCapacity(ch) { return Math.max(0,Number(ch.scores&&ch.scores.str||10)*15); }
  var api={KEY:KEY,makeCampaign:makeCampaign,create:create,slots:slots,save:save,load:load,active:active,remove:remove,exportSave:exportSave,importSave:importSave,activeCharacter:activeCharacter,addCharacter:addCharacter,syncCharacterToLegacy:syncCharacterToLegacy,normalizeCharacter:normalizeCharacter,roll:roll,addItem:addItem,removeItem:removeItem,equip:equip,unequip:unequip,recalculate:recalculate,shortRest:shortRest,longRest:longRest,addQuest:addQuest,setObjective:setObjective,award:award,journal:journal,carryWeight:carryWeight,carryCapacity:carryCapacity};
  root.DNDCAMPAIGN=api;
})(typeof window!=='undefined'?window:this);
