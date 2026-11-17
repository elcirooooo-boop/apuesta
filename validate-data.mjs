import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const data=vm.runInNewContext(fs.readFileSync(new URL('./dist/match-data.js',import.meta.url),'utf8')+';MatchData');
const event={id:42,homeTeam:{name:'Home'},awayTeam:{name:'Away'},headers:{Authorization:'TEST_SECRET'},cookie:'TEST_SECRET'};
const record=data.bundle({event,cookie:'TEST_SECRET'});assert.equal(record.eventId,42);assert.equal(record.source,'Triunfobet');assert.ok(!JSON.stringify(record).includes('TEST_SECRET'));
assert.throws(()=>data.bundle({event,eventId:43}));assert.throws(()=>data.event({id:42}));assert.throws(()=>data.statistics([{}]));
assert.equal(data.statistics([{period:'ALL',groups:[{groupName:'Team',statisticsItems:[{key:'shots',name:'Shots',home:'0',away:'3'}]}]}])[0].groups[0].statisticsItems[0].home,'0');
console.log('Match data checks passed: IDs, field whitelist, secret exclusion, missing fields, and zero values.');
