import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchesCatalogRecord} from '../scripts/catalog-families.mjs';
const records=JSON.parse(fs.readFileSync('public/research/vehicle-catalog.json')).records;
const sc=records.find(r=>r.id==='lineage-60012618');

test('year discovery includes known closed source ranges with inclusive boundaries',()=>{
 assert.equal(sc.introductionMonth,'200508');assert.equal(sc.endMonth,'201007');
 for(const year of [2005,2006,2010])assert(matchesCatalogRecord(sc,'SC430 '+year));
 for(const year of [2004,2011])assert(!matchesCatalogRecord(sc,'SC430 '+year));
 assert(!matchesCatalogRecord(sc,'LS430 2006'));
 assert(!matchesCatalogRecord(sc,'SC430 20060'));
});

test('missing, reversed or malformed end dates do not invent year coverage',()=>{
 for(const endMonth of [null,'','2005','201013','200401']){
  const record={...sc,endMonth};
  assert(!matchesCatalogRecord(record,'SC430 2006'));
  assert(matchesCatalogRecord(record,'SC430 2005'));
 }
 assert(!matchesCatalogRecord({...sc,introductionMonth:null},'SC430 2006'));
});
