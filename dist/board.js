// Four-corner AprilTag 16h5 print-board generator.
// Physical units are millimeters. All geometry and file generation is local.
export const PRESET = Object.freeze({mode:'quad',dictionary:'DICT_APRILTAG_16h5',ids:[0,1,3,2],board:80,tag:20,margin:3.0,base:2,depth:0.6,style:'flat',faceDown:true});
export function validate(p, dictionaries) {
  if (p.mode!=='quad' || p.dictionary!=='DICT_APRILTAG_16h5' || p.style!=='flat') throw Error('Only four-corner AprilTag 16h5 boards with flat color inlay are supported.');
  for (const key of ['board','tag','margin','base','depth']) {
    if (!Number.isFinite(p[key])) throw Error('Enter a number for every dimension.');
    if (Math.abs(p[key]*10-Math.round(p[key]*10))>1e-6) throw Error('Use dimensions in 0.1 mm increments.');
  }
  if (p.board<80 || p.board>240) throw Error('Board size must be between 80 and 240 mm.');
  if (p.tag<12 || p.tag>50) throw Error('Tag size must be between 12 and 50 mm.');
  if (4*p.tag>p.board+1e-8) throw Error(`The board must be at least ${4*p.tag} mm for ${p.tag} mm tags (four tag widths).`);
  const minMargin=Math.max(2,p.tag*.15),maxMargin=(p.board-3*p.tag)/2;
  if (p.margin+1e-8<minMargin) throw Error(`White margin must be at least ${(Math.ceil(minMargin*10)/10).toFixed(1)} mm for these tags.`);
  if (p.margin>maxMargin+1e-8) throw Error(`White margin must be at most ${maxMargin.toFixed(1)} mm to leave a tag-width of white space in the center.`);
  if (p.base<1.2 || p.base>6) throw Error('Base thickness must be between 1.2 and 6 mm.');
  if (p.depth<0.2 || p.depth>1.2 || p.depth>p.base-0.4+1e-8) throw Error('Color depth must be 0.2–1.2 mm and leave at least 0.4 mm of white backing.');
  if (!Array.isArray(p.ids) || p.ids.length!==4 || p.ids.some(id=>!Number.isInteger(id)||id<0||id>29)) throw Error('Choose four whole-number tag IDs from 0 to 29.');
  if (new Set(p.ids).size!==4) throw Error('Each corner needs a different tag ID.');
  if (dictionaries && (!dictionaries[p.dictionary] || dictionaries[p.dictionary].grids.length!==30)) throw Error('The AprilTag dictionary could not be loaded.');
  return p;
}
function mergeRectangles(grid,n) {
  const used=new Uint8Array(n*n), result=[];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++) {
    if(grid[r*n+c]!=='1'||used[r*n+c])continue;
    let w=1,h=1;
    while(c+w<n&&grid[r*n+c+w]==='1'&&!used[r*n+c+w])w++;
    while(r+h<n&&Array.from({length:w},(_,x)=>grid[(r+h)*n+c+x]==='1'&&!used[(r+h)*n+c+x]).every(Boolean))h++;
    for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++)used[y*n+x]=1;
    result.push([c,r,w,h]);
  }
  return result;
}
export function layout(p,dictionaries) {
  validate(p,dictionaries);
  const width=p.mode==='single'?p.tag+2*p.margin:p.board, height=width;
  const low=p.margin, high=width-p.margin-p.tag;
  const offsets=p.mode==='single'?[[low,low]]:[[low,high],[high,high],[low,low],[high,low]];
  const d=dictionaries[p.dictionary],n=d.size,cell=p.tag/n;
  const rects=[];
  offsets.forEach(([ox,oy],i)=>{
    for(const [c,r,w,h] of mergeRectangles(d.grids[p.ids[i]],n))rects.push([ox+c*cell,oy+(n-r-h)*cell,ox+(c+w)*cell,oy+(n-r)*cell]);
  });
  return {width,height,rects,offsets};
}
function unique(a) {return a.sort((x,y)=>x-y).filter((x,i,arr)=>!i||x-arr[i-1]>1e-8);}
function gridMesh(xs,ys,zs,occupied) {
  const out=[],nx=xs.length-1,ny=ys.length-1,nz=zs.length-1;
  const occ=(x,y,z)=>x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz&&occupied[z][y*nx+x];
  const quad=(a,b,c,d)=>{out.push([a,b,c],[a,c,d]);};
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++) {
    if(!occ(i,j,k))continue;
    const x0=xs[i],x1=xs[i+1],y0=ys[j],y1=ys[j+1],z0=zs[k],z1=zs[k+1];
    if(!occ(i-1,j,k))quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);
    if(!occ(i+1,j,k))quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);
    if(!occ(i,j-1,k))quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);
    if(!occ(i,j+1,k))quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);
    if(!occ(i,j,k-1))quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);
    if(!occ(i,j,k+1))quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);
  }
  return out;
}
export function buildMeshes(p,dictionaries) {
  const l=layout(p,dictionaries),{width,height}=l;
  let rects=l.rects;
  const fd=p.style==='flat'&&p.faceDown;
  if(fd)rects=rects.map(([x0,y0,x1,y1])=>[x0,height-y1,x1,height-y0]);
  const xs=unique([0,width,...rects.flatMap(r=>[r[0],r[2]])]);
  const ys=unique([0,height,...rects.flatMap(r=>[r[1],r[3]])]);
  const nx=xs.length-1,ny=ys.length-1;
  const mask=Array.from({length:nx*ny},(_,i)=>{
    const x=(xs[i%nx]+xs[i%nx+1])/2,y=(ys[Math.floor(i/nx)]+ys[Math.floor(i/nx)+1])/2;
    return rects.some(([x0,y0,x1,y1])=>x>=x0-1e-8&&x<=x1+1e-8&&y>=y0-1e-8&&y<=y1+1e-8);
  });
  const all=mask.map(()=>true),empty=mask.map(()=>false),inv=mask.map(x=>!x);
  let zs,white,black;
  if(p.style==='flat') {
    zs=fd?[0,p.depth,p.base]:[0,p.base-p.depth,p.base];
    white=fd?[inv,all]:[all,inv];black=fd?[mask,empty]:[empty,mask];
  } else {zs=[0,p.base,p.base+p.depth];white=[all,empty];black=[empty,mask];}
  return {white:gridMesh(xs,ys,zs,white),black:gridMesh(xs,ys,zs,black),layout:l,height:p.style==='flat'?p.base:p.base+p.depth};
}
export function svg(p,dictionaries) {
  const l=layout(p,dictionaries),n=x=>Number(x.toFixed(6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(l.width)}mm" height="${n(l.height)}mm" viewBox="0 0 ${n(l.width)} ${n(l.height)}"><rect width="100%" height="100%" fill="white"/>${l.rects.map(([x0,y0,x1,y1])=>`<rect x="${n(x0)}" y="${n(l.height-y1)}" width="${n(x1-x0)}" height="${n(y1-y0)}" fill="black"/>`).join('')}</svg>`;
}
export function stl(triangles,name) {
  const data=new Uint8Array(84+triangles.length*50),view=new DataView(data.buffer);
  data.set(new TextEncoder().encode(name.slice(0,80)));view.setUint32(80,triangles.length,true);
  triangles.forEach((tri,i)=>{
    const a=tri[1].map((x,j)=>x-tri[0][j]),b=tri[2].map((x,j)=>x-tri[0][j]);
    const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=Math.hypot(...n)||1;
    [...n.map(x=>x/len),...tri.flat()].forEach((v,j)=>view.setFloat32(84+i*50+j*4,v,true));
  });return data;
}
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
// Standards-compliant ZIP (stored files), avoiding a runtime archive dependency.
export function zip(files) {
  const local=[],central=[];let offset=0,centralSize=0;
  for(const [name,input] of Object.entries(files)) {
    const file=typeof input==='string'?encoder.encode(input):input,n=encoder.encode(name),crc=crc32(file);
    const h=new Uint8Array(30+n.length),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,file.length,true);v.setUint32(22,file.length,true);v.setUint16(26,n.length,true);h.set(n,30);
    local.push(h,file);
    const c=new Uint8Array(46+n.length),d=new DataView(c.buffer);
    d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,file.length,true);d.setUint32(24,file.length,true);d.setUint16(28,n.length,true);d.setUint32(42,offset,true);c.set(n,46);central.push(c);centralSize+=c.length;offset+=h.length+file.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  const result=new Uint8Array(offset+centralSize+22);let at=0;for(const part of [...local,...central,end]){result.set(part,at);at+=part.length;}return result;
}
function indexed(triangles) {
  const vertices=[],faces=[],map=new Map();
  for(const tri of triangles)faces.push(tri.map(v=>{const key=v.map(x=>x.toFixed(6)).join(',');if(!map.has(key)){map.set(key,vertices.length);vertices.push(v);}return map.get(key);}));
  return {vertices,faces};
}
export function threeMF(meshes) {
  function object(id,name,triangles,material) {
    const m=indexed(triangles);
    return `<object id="${id}" type="model" name="${name}" pid="1" pindex="${material}"><mesh><vertices>${m.vertices.map(v=>`<vertex x="${v[0].toFixed(6)}" y="${v[1].toFixed(6)}" z="${v[2].toFixed(6)}"/>`).join('')}</vertices><triangles>${m.faces.map(f=>`<triangle v1="${f[0]}" v2="${f[1]}" v3="${f[2]}" pid="1" p1="${material}" p2="${material}" p3="${material}"/>`).join('')}</triangles></mesh></object>`;
  }
  const model=`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Title">ESP32 Scanner Board</metadata><metadata name="Application">ESP32 Object Scanner</metadata><resources><basematerials id="1"><base name="White / Base" displaycolor="#FFFFFFFF"/><base name="Black / Marker" displaycolor="#000000FF"/></basematerials>${object(2,'WHITE_BASE',meshes.white,0)}${object(3,'BLACK_MARKER',meshes.black,1)}<object id="4" type="model" name="Scanner Board"><components><component objectid="2"/><component objectid="3"/></components></object></resources><build><item objectid="4"/></build></model>`;
  return zip({'[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>','_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>','3D/3dmodel.model':model});
}
export function printNotes(p) {
  return `SCANNER BOARD — PRINT NOTES\n\nAprilTag 16h5, four corner markers.\nIDs (top-left, top-right, bottom-left, bottom-right): ${p.ids.join(', ')}\nTag black-square edge: ${p.tag} mm\nBoard: ${p.board} × ${p.board} mm\nWhite outer margin: ${p.margin} mm\nBase: ${p.base} mm | Inlay depth: ${p.depth} mm\nTag center coordinates: ±${((p.board-p.tag)/2-p.margin).toFixed(3)} mm\n\n${p.faceDown?'FACE DOWN: files are mirrored in Y and the pattern starts at Z=0. Print as exported, then lift and flip to reveal the readable board. Do not mirror again.':'FACE UP: print exactly as exported.'}\n\nOpen board.3mf as a multipart object. Assign WHITE_BASE to matte white filament and BLACK_MARKER to matte black filament. Colors are included, but printer-specific filament slots must be assigned in the slicer. If colors are ignored, import WHITE.stl and BLACK.stl together as parts of ONE object and keep their common origins. Do not auto-arrange or independently drop parts to the bed.\n\nPrint in millimeters at 100% scale. Choose a layer height that divides the selected color depth (0.2 mm layers for a 0.6 mm inlay). Keep edges sharp and the surface matte.\n\nINSTALLATION\nUse the same tag IDs and dimensions in the board setup page when installing the scanner. The generated flash image applies those settings automatically. Run camera calibration after installation. Enlarging the board does not enlarge the scanner's approximately 47 mm reconstruction volume.\n`;
}
export function bundle(p,dictionaries) {
  const meshes=buildMeshes(p,dictionaries);
  return zip({'WHITE.stl':stl(meshes.white,'WHITE_BASE'),'BLACK.stl':stl(meshes.black,'BLACK_MARKER'),'board.3mf':threeMF(meshes),'board.svg':svg(p,dictionaries),'settings.json':JSON.stringify(p,null,2),'README.txt':printNotes(p)});
}
