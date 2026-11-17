import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SourceError} from './source-error.mjs';

const FRONT='https://sb2frontend-altenar2.biahosted.com';
const KEYS={66:'football',67:'basketball',68:'hockey',76:'baseball',75:'american'};
const sportKey=s=>KEYS[s.id]||'triunfo-'+s.id;
const text=v=>String(v??'').slice(0,250);
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const category=name=>/jugador|goleador|anotador|asistencia/i.test(name)?'players':/córner|corner|esquina/i.test(name)?'corners':/tarjeta/i.test(name)?'cards':/remate|tiro/i.test(name)?'shots':/falta/i.test(name)?'fouls':'match';
export function normalizeTriunfoEvent(e,data){
 const people=new Map((data.competitors||[]).map(p=>[p.id,p]));
 const teams=(e.competitorIds||[]).map(id=>people.get(id));
 if(!Number.isSafeInteger(e.id)||teams.length!==2||teams.some(t=>!t?.name)||!Number.isFinite(Date.parse(e.startDate)))return null;
 const s=(data.sports||[]).find(s=>s.id===e.sportId)||{id:e.sportId};
 const champ=(data.champs||[]).find(c=>c.id===e.champId);
 const type=e.status===0?'notstarted':e.status===1?'inprogress':'unknown';
 const score=i=>type==='inprogress'&&Number.isFinite(e.score?.[i])?{current:e.score[i]}:{};
 return {id:e.id,provider:'triunfobet',sportKey:sportKey(s),leagueKey:String(e.champId),homeTeam:{id:teams[0].id,name:text(teams[0].name)},awayTeam:{id:teams[1].id,name:text(teams[1].name)},tournament:{name:text(champ?.name||'Competición')},startTimestamp:Date.parse(e.startDate)/1000,status:{type,description:type==='inprogress'?text(e.ls||'En directo'):'Programado'},homeScore:score(0),awayScore:score(1)};
}
export function normalizeTriunfoMarkets(d,id){
 if(d.id!==Number(id)||!Array.isArray(d.markets)||!Array.isArray(d.odds))throw new SourceError('Los mercados no corresponden al encuentro solicitado.',502);
 const odds=new Map(d.odds.map(o=>[o.id,o]));
 const builderIds=new Set([...(d.marketGroups||[]),...(d.childMarketGroups||[])].filter(g=>g.type===3||/crear\s*apuesta|bet\s*builder/i.test(g.name||'')).flatMap(g=>g.marketIds||[]).map(String));
 const markets=[...new Map([...d.markets,...(d.childMarkets||[])].filter(m=>m?.id&&m.name&&(m.isBB===true||(m.isBB==null&&builderIds.has(String(m.id))))).map(m=>[m.id,m])).values()];
 const groups=markets.map(m=>({id:'triunfo-'+m.id,name:text(m.name),category:category(m.name),rows:[...new Set([...(m.desktopOddIds||[]).flat(Infinity),...(m.mobileOddIds||[]).flat(Infinity)])].flatMap(id=>{const o=odds.get(id);if(!o?.name||o.isDBB===false)return[];const valid=o.oddStatus===0&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>1;return[{id:String(o.id),label:text(o.name),p:valid?1/o.price:null,odds:valid?o.price:null,unavailable:!valid,probabilityKind:'implied-with-margin'}];})})).filter(g=>g.rows.length);
 return {eventId:Number(id),source:'Triunfobet',kind:'implied-odds',marketScope:'bet-builder',message:groups.length?'':'Crear Apuesta no está disponible para este encuentro.',available:groups.length>0,groups,historicalTrends:[],marketCount:groups.length,resultCount:groups.reduce((s,g)=>s+g.rows.length,0),fetchedAt:new Date().toISOString(),method:'Solo se incluyen mercados identificados por Triunfobet como Crear Apuesta. Los porcentajes corresponden a selecciones individuales, no a una combinada. Probabilidad implícita = 1 / cuota decimal. Incluye el margen de la casa; no es una estimación estadística independiente. En mercados con devolución o liquidación parcial, esta conversión no equivale a la probabilidad de acertar. No se normalizan juntos resultados solapados ni líneas distintas. Las cuotas suspendidas o ausentes no reciben porcentaje.'};
}
export function createTriunfoConnector(){
 let context,page,boot,params,queue=Promise.resolve();const cache=new Map(),pending=new Map();
 async function start(){
  if(boot)return boot;
  if(context&&page&&!page.isClosed())return;
  boot=(async()=>{
   const executable=process.env.TRIUNFOBET_CHROME_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
   if(!executable)throw new SourceError('No se encontró Chrome o Edge para consultar Triunfobet.',503);
   const profile=process.env.TRIUNFOBET_BROWSER_PROFILE||fileURLToPath(new URL('./.local/triunfobet-browser/',import.meta.url));
   context=await chromium.launchPersistentContext(path.resolve(profile),{executablePath:executable,headless:false,viewport:null});
   context.on('close',()=>{context=null;page=null;});page=context.pages()[0]||await context.newPage();
   const ready=page.waitForResponse(r=>r.url().startsWith(FRONT+'/api/widget/GetUpcoming?')&&r.status()===200,{timeout:45000});ready.catch(()=>{});
   try{await page.goto('https://triunfobet.com/altenar#/sport/66',{waitUntil:'domcontentloaded',timeout:45000});const response=await ready;params=new URL(response.url()).searchParams;for(const k of ['sportId','eventCount','page'])params.delete(k);}
   catch{await context?.close();throw new SourceError('Triunfobet no ha cargado sus datos en el navegador. Comprueba la ventana de Chrome y vuelve a intentarlo.',503);}
  })();try{await boot;}finally{boot=null;}
 }
 async function get(endpoint,extra={},ttl=60000){
  const key=endpoint+JSON.stringify(extra),hit=cache.get(key);if(hit&&Date.now()-hit.at<ttl)return hit.data;if(pending.has(key))return pending.get(key);
  const job=(async()=>{await start();const query=new URLSearchParams(params);query.set('timezoneOffset','240');for(const [k,v]of Object.entries(extra))query.set(k,String(v));const url=FRONT+'/api/widget/'+endpoint+'?'+query;
   // Only public, fixed-host GET requests; no account or wagering operations.
   const task=queue.then(()=>page.evaluate(async url=>{const r=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(20000)});return {status:r.status,body:await r.text()};},url));queue=task.catch(()=>{});
   let result;try{result=await task;}catch{throw new SourceError('No se pudo leer Triunfobet desde su navegador.',502);}if(result.status!==200)throw new SourceError('Triunfobet ha respondido con HTTP '+result.status+'.',502);if(result.body.length>16*1024*1024)throw new SourceError('La respuesta de Triunfobet supera el tamaño admitido.',502);
   let data;try{data=JSON.parse(result.body);}catch{throw new SourceError('Triunfobet no devolvió JSON válido.',502);}if(cache.size>128)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),data});return data;
  })();pending.set(key,job);try{return await job;}finally{pending.delete(key);}
 }
 async function menu(){return get('GetClickableSportMenu',{period:0},300000);}
 return {
  async status(){const d=await menu();return {source:'Triunfobet',configured:true,refreshSeconds:60,sports:(d.sports||[]).map(s=>({id:sportKey(s),name:text(s.name),providerId:s.id}))};},
  async matches(sport,league,date){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00Z'))||new Date(date+'T12:00Z').toISOString().slice(0,10)!==date)throw new SourceError('Fecha no válida.',400);
   const m=await menu(),selected=(m.sports||[]).find(s=>sportKey(s)===sport);if(!selected)throw new SourceError('Selecciona un deporte de Triunfobet.',400);
   const all=[],leagues=new Map();const collect=d=>{if(!Array.isArray(d.events))throw new SourceError('Agenda de Triunfobet no reconocida.',502);for(const raw of d.events){const e=normalizeTriunfoEvent(raw,d);if(!e||day(raw.startDate)!==date)continue;all.push(e);leagues.set(e.leagueKey,{key:e.leagueKey,sport:e.sportKey,name:e.tournament.name});}};
   const first=await get('GetUpcoming',{sportId:selected.id,eventCount:100,page:1});collect(first);const pages=Number(first.pageCount)||1;
   if(pages>100)throw new SourceError('Triunfobet devuelve una agenda demasiado extensa para esta consulta.',502);
   for(let n=2;n<=pages;n++)collect(await get('GetUpcoming',{sportId:selected.id,eventCount:100,page:n}));
   collect(await get('GetLivenow',{sportId:selected.id,eventCount:100}));
   const unique=[...new Map(all.map(e=>[e.id,e])).values()];return {source:'Triunfobet',provider:'triunfobet',timezone:'America/Caracas',events:unique.filter(e=>league==='all'||e.leagueKey===league).sort((a,b)=>a.startTimestamp-b.startTimestamp),leagues:[...leagues.values()],sports:(m.sports||[]).map(s=>({id:sportKey(s),name:text(s.name)})),sportCounts:{[sport]:unique.length},fetchedAt:new Date().toISOString(),scope:'Encuentros próximos y en directo disponibles; no incluye archivo de terminados.'};
  },
  async probabilities(id){if(!/^\d{1,12}$/.test(String(id)))throw new SourceError('ID no válido.',400);return normalizeTriunfoMarkets(await get('GetEventDetails',{eventId:id,showNonBoosts:false},30000),id);},
  async close(){await context?.close();}
 };
}
