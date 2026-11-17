import assert from 'node:assert/strict';
import {normalizeTriunfoEvent,normalizeTriunfoMarkets} from './triunfobet-source.mjs';
const data={sports:[{id:67,name:'Baloncesto'}],champs:[{id:10,name:'NBA'}],competitors:[{id:1,name:'Home'},{id:2,name:'Away'}]};
const raw={id:42,sportId:67,champId:10,competitorIds:[1,2],startDate:'2026-11-18T01:00Z',status:0,score:[0,0]};
const event=normalizeTriunfoEvent(raw,data);assert.equal(event.sportKey,'basketball');assert.equal(event.tournament.name,'NBA');assert.deepEqual(event.homeScore,{});assert.equal(normalizeTriunfoEvent({...raw,competitorIds:[1,999]},data),null);
assert.equal(normalizeTriunfoEvent({...raw,status:1,score:[20,30]},data).homeScore.current,20);
const response={id:42,markets:[{id:5,name:'1x2',isBB:true,desktopOddIds:[[1],[2]],mobileOddIds:[[2],[1]]},{id:6,name:'Córners',isBB:true,desktopOddIds:[[3,4,5,6,7]]}],odds:[{id:1,name:'Local',oddStatus:0,price:2},{id:2,name:'Visitante',oddStatus:0,price:3},{id:3,name:'Suspendida',oddStatus:7,price:2},{id:4,name:'Sin cuota',oddStatus:0,price:0},{id:5,name:'Inválida',oddStatus:0,price:Infinity},{id:6,name:'Sin estado',price:2},{id:7,name:'Cuota texto',oddStatus:0,price:'2'}]};
const f=normalizeTriunfoMarkets(response,42);assert.equal(f.kind,'implied-odds');assert.equal(f.resultCount,7);assert.equal(f.groups[0].rows[0].p,.5);assert.equal(f.groups[0].rows[1].p,1/3);assert.equal(f.groups[1].category,'corners');assert.ok(f.groups[1].rows.every(r=>r.p===null&&r.odds===null));assert.throws(()=>normalizeTriunfoMarkets(response,43));
// Overlapping selections and different thresholds must never be normalized together.
assert.equal(f.groups[0].rows.reduce((s,r)=>s+r.p,0),.5+1/3);
const secret=JSON.stringify(normalizeTriunfoMarkets({...response,cookie:'secret',token:'secret'},42));assert.ok(!secret.includes('secret'));
console.log('Triunfobet checks passed: event identity, absent scores, market mapping, deduplication, suspended odds, implicit probability, no forced normalization and credential exclusion.');

const restricted=normalizeTriunfoMarkets({...response,marketGroups:[{type:3,name:'Crear Apuesta',marketIds:[5,6]}],markets:[...response.markets,{id:5,name:'Variante normal',isBB:false,desktopOddIds:[[99]]},{id:8,name:'Otro mercado',desktopOddIds:[[1]]}]},42);assert.equal(restricted.resultCount,7);assert.equal(restricted.marketScope,'bet-builder');assert.ok(!restricted.groups.some(g=>g.name==='Variante normal'||g.name==='Otro mercado'));const absent=normalizeTriunfoMarkets({...response,markets:response.markets.map(m=>({...m,isBB:false}))},42);assert.equal(absent.available,false);assert.equal(absent.groups.length,0);const forbidden=normalizeTriunfoMarkets({...response,odds:response.odds.map(o=>({...o,isDBB:false}))},42);assert.equal(forbidden.groups.length,0);
