import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PRESET,validate,buildMeshes,layout,svg,bundle,printNotes} from '../dist/board.js';
import {encodeBoardConfig,crc32} from '../dist/firmware-config.js';
const dictionaries=JSON.parse(readFileSync(new URL('../dist/assets/markers.json',import.meta.url)));
assert.deepEqual(Object.keys(dictionaries),['DICT_APRILTAG_16h5']);
const out=process.argv[2]||'/tmp/scanner-board-checks',host=process.argv[3];mkdirSync(out,{recursive:true});
const cases=[
 {...PRESET},
 {...PRESET,faceDown:false},
 {...PRESET,ids:[29,23,16,7]},
 {...PRESET,board:120,tag:24,margin:7,base:3.2,depth:.8,ids:[6,15,28,0]},
 {...PRESET,board:240,tag:50,margin:7.5,ids:[27,2,20,9]},
 {...PRESET,board:80,tag:12,margin:2,base:1.2,depth:.2,ids:[4,17,29,10]},
];
function volume(tris){return tris.reduce((sum,[a,b,c])=>sum+(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6,0);}
const results=[];
for(let i=0;i<cases.length;i++){
 const p=cases[i],m=buildMeshes(p,dictionaries),l=layout(p,dictionaries),blackArea=l.rects.reduce((s,[x0,y0,x1,y1])=>s+(x1-x0)*(y1-y0),0);
 assert.ok(Math.abs(volume(m.white)+volume(m.black)-p.board*p.board*p.base)<1e-6);
 assert.ok(Math.abs(volume(m.black)-blackArea*p.depth)<1e-6);
 for(const tri of [...m.white,...m.black]){
  assert.ok(tri.flat().every(Number.isFinite));const [a,b,c]=tri,u=b.map((x,j)=>x-a[j]),v=c.map((x,j)=>x-a[j]);
  assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10);
 }
 const record=encodeBoardConfig(p),view=new DataView(record.buffer);
 assert.equal(view.getUint32(12,true),Math.round(p.board*1000));assert.equal(view.getUint32(16,true),Math.round(p.tag*1000));assert.equal(view.getUint32(20,true),Math.round(p.margin*1000));
 assert.deepEqual([...record.subarray(24,28)],p.ids);assert.equal(view.getUint32(44,true),crc32(record.subarray(0,44)));
 writeFileSync(`${out}/scenario-${i}.record`,record);writeFileSync(`${out}/scenario-${i}.svg`,svg(p,dictionaries));writeFileSync(`${out}/scenario-${i}.zip`,bundle(p,dictionaries));
 assert.ok(!/github|Gabinson|source code|rebuild|#define/i.test(printNotes(p)));
 results.push({parameters:p,white:m.white,black:m.black,rects:l.rects});
 if(host)process.stdout.write(execFileSync(host,[`${out}/scenario-${i}.record`],{encoding:'utf8'}));
}
for(const bad of [{mode:'single'},{style:'raised'},{dictionary:'DICT_4X4_50'},{board:79.9},{board:240.1},{tag:11.9},{tag:50.1,board:240},{tag:20.1},{margin:2.9},{margin:10.1},{base:1.1},{depth:1.3},{base:1.2,depth:.9},{tag:NaN},{tag:20.05},{ids:[0,1,3,30]},{ids:[0,1,1,2]},{ids:[0,1,3]}]){
 assert.throws(()=>validate({...PRESET,...bad},dictionaries));assert.throws(()=>encodeBoardConfig({...PRESET,...bad}));
}
const corruptions=[
 r=>r[44]^=1,
 r=>r[0]=0,
 r=>new DataView(r.buffer).setUint16(8,2,true),
 r=>new DataView(r.buffer).setUint16(10,47,true),
 r=>new DataView(r.buffer).setUint32(12,79000,true),
 r=>new DataView(r.buffer).setUint32(16,20100,true),
 r=>new DataView(r.buffer).setUint32(20,2900,true),
 r=>new DataView(r.buffer).setUint32(20,10100,true),
 r=>new DataView(r.buffer).setUint32(12,80001,true),
 r=>r[25]=r[24],r=>r[26]=30,r=>r[28]=1,
];
if(host){
 for(let i=0;i<corruptions.length;i++){
  const r=encodeBoardConfig(PRESET);corruptions[i](r);
  if(i!==0)new DataView(r.buffer).setUint32(44,crc32(r.subarray(0,44)),true);
  const path=`${out}/rejected-${i}.record`;writeFileSync(path,r);execFileSync(host,[path,'reject']);
 }
 const path=`${out}/truncated.record`;writeFileSync(path,encodeBoardConfig(PRESET).subarray(0,30));execFileSync(host,[path,'reject']);
}
writeFileSync(`${out}/meshes.json`,JSON.stringify(results));
console.log(`Passed: ${cases.length} export/configuration cases, dimension and ID bounds, supported-mode restrictions${host?', 96 real AprilTag detections, unknown-tag rejection, and 13 invalid firmware records':''}.`);
