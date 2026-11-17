'use strict';
// Whitelist public match fields. Request headers, cookies and tokens are never imported.
const MatchData=(()=>{
 const text=(v,max=140)=>typeof v==='string'?v.slice(0,max):'';
 const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 function event(raw){
  if(!raw||!Number.isSafeInteger(raw.id)||raw.id<=0||!text(raw.homeTeam?.name)||!text(raw.awayTeam?.name))throw new Error('El evento necesita ID y nombres de ambos equipos.');
  const team=t=>({id:number(t.id),name:text(t.name),sport:{name:text(t.sport?.name)}});
  const score=s=>Object.fromEntries(['current','display','period1','period2','normaltime'].filter(k=>number(s?.[k])!==null).map(k=>[k,s[k]]));
  return {id:raw.id,homeTeam:team(raw.homeTeam),awayTeam:team(raw.awayTeam),tournament:{name:text(raw.tournament?.name)},startTimestamp:number(raw.startTimestamp),status:{type:text(raw.status?.type,30),description:text(raw.status?.description,50)},homeScore:score(raw.homeScore),awayScore:score(raw.awayScore)};
 }
 function statistics(raw){
  if(!Array.isArray(raw)||raw.length>20)throw new Error('El archivo no contiene una lista válida de periodos.');
  const seen=new Set();return raw.map(p=>{
   if(!p||!text(p.period,30)||seen.has(p.period)||!Array.isArray(p.groups)||p.groups.length>60)throw new Error('Periodos o grupos no válidos.');seen.add(p.period);
   return {period:text(p.period,30),groups:p.groups.map(g=>{
    if(!Array.isArray(g.statisticsItems)||g.statisticsItems.length>200)throw new Error('Grupo de estadísticas no válido.');
    return {groupName:text(g.groupName),statisticsItems:g.statisticsItems.map(s=>{
     if(!s||!text(s.key)||!text(s.name))throw new Error('Estadística sin nombre o identificador.');
     return {key:text(s.key),name:text(s.name),home:text(s.home,100),away:text(s.away,100),homeValue:number(s.homeValue),awayValue:number(s.awayValue),homeTotal:number(s.homeTotal),awayTotal:number(s.awayTotal)};
    })};
   })};
  });
 }
 function bundle(raw){const e=event(raw.event);if(raw.eventId!==undefined&&raw.eventId!==e.id)throw new Error('El ID declarado no coincide con el evento.');return {eventId:e.id,event:e,statistics:statistics(raw.statistics||[]),source:'Triunfobet',normalizedAt:new Date().toISOString(),automaticConnection:true};}
 function uniqueItems(record,period='ALL'){const items=record.statistics.find(p=>p.period===period)?.groups.flatMap(g=>g.statisticsItems)||[];return [...new Map(items.map(s=>[s.key,s])).values()];}
 return {event,statistics,bundle,uniqueItems};
})();
