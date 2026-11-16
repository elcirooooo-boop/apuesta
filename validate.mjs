import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
const result=vm.runInNewContext(source.split('const safeStorage=')[0]+`
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
let rows=0;
for(const f of FIXTURES){
 const gs=getMarkets(f);assert(gs.length>0,f.id+' has no markets');
 for(const g of gs)for(const r of g.rows){rows++;assert(Number.isFinite(r.p)&&r.p>=0&&r.p<=1+1e-12,f.id+' '+r.label+' invalid probability');}
 const sum=gs[0].rows.reduce((s,r)=>s+r.p,0);assert(Math.abs(sum-1)<1e-9,f.id+' winner distribution does not sum to 1');
 for(const g of gs.filter(g=>g.name==='Ambos equipos marcan'||g.name==='Goles totales'||g.name.startsWith('Goles de ')||g.name.startsWith('Total de '))){for(let i=0;i<g.rows.length;i+=2)assert(Math.abs(g.rows[i].p+g.rows[i+1].p-1)<1e-9,f.id+' non-complementary totals');}
 const exact=gs.find(g=>g.name==='Resultado exacto en sets / mapas');if(exact)assert(Math.abs(exact.rows.reduce((s,r)=>s+r.p,0)-1)<1e-9,f.id+' set scores do not sum to 1');
 const goals=gs.find(g=>g.name==='Goles totales');if(goals)for(let i=2;i<goals.rows.length;i+=2)assert(goals.rows[i].p<=goals.rows[i-2].p,f.id+' over probability not monotonic');
}
({fixtures:FIXTURES.length,sports:SPORTS.length-1,outcomes:rows,status:'All probability invariants passed'})
`);
console.log(JSON.stringify(result));
