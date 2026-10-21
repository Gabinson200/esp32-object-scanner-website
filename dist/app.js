import {PRESET,validate,layout,buildMeshes,svg,bundle,threeMF} from './board.js?v=2';
import {configuredFirmware,encodeBoardConfig} from './firmware-config.js?v=2';

const $=id=>document.getElementById(id),form=$('board-form');
const fmt=x=>Number(x.toFixed(3)).toString();
const printButtons=[$('download-bundle'),$('download-3mf'),$('download-svg')];
let dictionaries=null,current=null,viewer=null,printBusy=false;
let template=null,buildInfo=null,prepared=null,installer=null,activate=null;
let installerLoading=false,installerError='',modulePromise=null;
const installURLs=new Set();
function installURL(blob){const url=URL.createObjectURL(blob);installURLs.add(url);return url;}
window.addEventListener('pagehide',()=>installURLs.forEach(url=>URL.revokeObjectURL(url)));
function readForm(){
  const value=k=>form.elements.namedItem(k).value;
  const number=k=>value(k).trim()===''?NaN:Number(value(k));
  return {...PRESET,ids:[0,1,2,3].map(i=>number(`id${i}`)),...Object.fromEntries(['board','tag','margin','base','depth'].map(k=>[k,number(k)])),faceDown:form.elements.namedItem('faceDown').checked};
}
function setForm(p){for(const key of ['board','tag','margin','base','depth'])form.elements.namedItem(key).value=p[key];p.ids.forEach((id,i)=>form.elements.namedItem(`id${i}`).value=id);form.elements.namedItem('faceDown').checked=p.faceDown;}
function printEnabled(enabled){printButtons.forEach(b=>b.disabled=!enabled);}
function setView(mode){
  $('viewer').classList.toggle('flat',mode==='2d'||!viewer);
  for(const [id,m] of [['view-3d','3d'],['view-2d','2d']]){$(id).classList.toggle('active',mode===m);$(id).setAttribute('aria-pressed',String(mode===m));}
  $('view-hint').textContent=mode==='2d'?'Exact layout · millimeters':'Drag to orbit · scroll to zoom';
  $('reset-camera').disabled=mode==='2d'||!viewer;
}
function dynamicBounds(p){
  const board=form.elements.namedItem('board'),tag=form.elements.namedItem('tag'),margin=form.elements.namedItem('margin');
  board.min=Number.isFinite(p.tag)?Math.max(80,p.tag*4):80;
  tag.max=Number.isFinite(p.board)?Math.min(50,p.board/4):50;
  margin.min=Number.isFinite(p.tag)?Math.ceil(Math.max(2,p.tag*.15)*10-1e-8)/10:2;
  margin.max=Number.isFinite(p.tag)&&Number.isFinite(p.board)?Math.floor((p.board-3*p.tag)*5+1e-8)/10:30;
  form.elements.namedItem('depth').max=Number.isFinite(p.base)?Math.min(1.2,Math.round((p.base-.4)*10)/10):1.2;
}
function regenerate(){
  if(!dictionaries)return;
  $('download-status').textContent='';
  try{
    const p=readForm();dynamicBounds(p);validate(p,dictionaries);
    const l=layout(p,dictionaries);
    $('board-dim').textContent=`${fmt(l.width)} × ${fmt(l.height)} mm`;
    $('tag-dim').textContent=`${fmt(p.tag)} mm`;$('height-dim').textContent=`${fmt(p.base)} mm`;
    $('orientation-label').textContent=p.faceDown?'Finished board · files face down':'Finished board · files face up';
    $('flat-preview').innerHTML=svg(p,dictionaries);
    viewer?.update(buildMeshes({...p,faceDown:false},dictionaries));
    current=p;printEnabled(!printBusy);
    $('generator-message').className='compatibility';
    $('generator-message').textContent='Board settings are valid. The same IDs and dimensions will be included when you install below.';
  }catch(error){
    current=null;printEnabled(false);
    $('generator-message').className='compatibility error';$('generator-message').textContent=error.message;
  }
  refreshInstall();
}
function status(text,kind=''){$('install-status').textContent=text;$('install-status').className='status'+(kind?' '+kind:'');}
function refreshInstall(){
  $('download-firmware').disabled=true;
  if(activate)activate.disabled=true;
  if(!current){
    $('install-board').textContent='Correct the board settings above before installing.';
    installer?.removeAttribute('manifest');
    status(dictionaries?'Correct the board settings above before installing.':'Loading board settings…');
    return;
  }
  $('install-board').replaceChildren();
  const size=document.createElement('b');size.textContent=`${fmt(current.board)} × ${fmt(current.board)} mm board · ${fmt(current.tag)} mm tags`;
  const ids=document.createElement('small');ids.textContent=`Tag IDs: top left ${current.ids[0]} · top right ${current.ids[1]} · bottom left ${current.ids[2]} · bottom right ${current.ids[3]}`;
  const margin=document.createElement('small');margin.textContent=`White outer margin: ${fmt(current.margin)} mm`;
  $('install-board').append(size,ids,margin);
  if(!template||!buildInfo){status(installerError||'Loading scanner firmware…',installerError?'error':'');return;}
  try{
    // One immutable image/manifest per geometry. Retain URLs while a native
    // flashing dialog may still be using a previous selected-board snapshot.
    const record=encodeBoardConfig(current);
    const fingerprint=new DataView(record.buffer).getUint32(44,true).toString(16).padStart(8,'0');
    if(!prepared||prepared.fingerprint!==fingerprint){
      if(prepared&&!prepared.activated)for(const url of [prepared.imageURL,prepared.manifestURL]){URL.revokeObjectURL(url);installURLs.delete(url);}
      const next=configuredFirmware(template,buildInfo,current);
      const imageURL=installURL(new Blob([next.image],{type:'application/octet-stream'}));
      const manifest={name:'ESP32 Object Scanner',version:String(buildInfo.version),new_install_prompt_erase:false,new_install_improv_wait_time:0,builds:[{chipFamily:'ESP32-S3',parts:[{path:imageURL,offset:0}]}]};
      const manifestURL=installURL(new Blob([JSON.stringify(manifest)],{type:'application/json'}));
      prepared={...next,imageURL,manifestURL,parameters:structuredClone(current)};
    }
    $('download-firmware').disabled=false;
    if(installer)installer.setAttribute('manifest',prepared.manifestURL);
    if(!window.isSecureContext){status('Open this page over HTTPS or localhost to flash from the browser.','error');return;}
    if(!('serial' in navigator)){status('Browser flashing needs Web Serial. Use a supported desktop browser, such as Chrome or Edge. You can still download the configured firmware.','error');return;}
    if(installerError){status(installerError,'error');return;}
    if(!activate){status('Loading ESP Web Tools…');return;}
    activate.disabled=false;
    status('Ready to install with the board settings shown above.','good');
  }catch(error){installer?.removeAttribute('manifest');status(error.message,'error');}
}
function saveFile(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function exportPrint(kind){
  if(!current||printBusy)return;
  const p=structuredClone(current);printBusy=true;printEnabled(false);$('download-status').textContent='Preparing print files…';
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  try{
    const name=`board-${fmt(p.board)}mm-ids-${p.ids.join('-')}`;
    if(kind==='bundle')saveFile(bundle(p,dictionaries),name+'.zip','application/zip');
    if(kind==='3mf')saveFile(threeMF(buildMeshes(p,dictionaries)),name+'.3mf','model/3mf');
    if(kind==='svg')saveFile(svg(p,dictionaries),name+'.svg','image/svg+xml');
    $('download-status').textContent='Print files prepared. Keep these settings for installation.';
  }catch(error){$('download-status').textContent=`Could not generate files: ${error.message}`;}
  finally{printBusy=false;printEnabled(!!current);}
}
form.addEventListener('submit',event=>event.preventDefault());
form.addEventListener('input',regenerate);form.addEventListener('change',regenerate);
$('reset-preset').addEventListener('click',()=>{setForm(PRESET);regenerate();});
$('view-3d').addEventListener('click',()=>setView('3d'));$('view-2d').addEventListener('click',()=>setView('2d'));$('reset-camera').addEventListener('click',()=>viewer?.reset());
for(const kind of ['bundle','3mf','svg'])$('download-'+kind).addEventListener('click',()=>exportPrint(kind));
$('download-firmware').addEventListener('click',()=>{
  if(!current||!prepared||$('download-firmware').disabled)return;
  const p=prepared.parameters;saveFile(prepared.image,`scanner-${fmt(p.board)}mm-ids-${p.ids.join('-')}.bin`,'application/octet-stream');
});
async function setupBoard(){
  try{
    const response=await fetch('./assets/markers.json',{cache:'no-store'});if(!response.ok)throw Error('The marker dictionary could not be loaded. Reload the page.');dictionaries=await response.json();
    setForm(PRESET);regenerate();
    try{const module=await import('./viewer.js');viewer=module.createViewer($('viewer'));regenerate();setView('3d');}
    catch(error){console.warn('3D preview unavailable:',error);$('view-3d').disabled=true;setView('2d');$('view-hint').textContent='3D unavailable · showing top view';}
    $('preview-loading').hidden=true;
  }catch(error){$('generator-message').className='compatibility error';$('generator-message').textContent=error.message;$('preview-loading').textContent='Reload the page to load the board.';}
  finally{$('generator').setAttribute('aria-busy','false');}
}
function loadWebTools(){
  if(customElements.get('esp-web-install-button'))return Promise.resolve();
  if(modulePromise)return modulePromise;
  modulePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.type='module';script.src='https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module';
    const timer=setTimeout(()=>{script.remove();reject(Error('ESP Web Tools did not load. Check your connection and retry.'));},25000);
    script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('ESP Web Tools could not be loaded. Check your connection and retry.'));};document.head.append(script);
  }).catch(error=>{modulePromise=null;throw error;});
  return modulePromise;
}
async function setupInstaller(){
  if(installerLoading)return;installerLoading=true;installerError='';$('retry-install').hidden=true;refreshInstall();
  try{
    const manifestURL=new URL('./firmware/manifest.json',location.href);
    const [mr,ir]=await Promise.all([fetch(manifestURL,{cache:'no-store'}),fetch('./firmware/build.json',{cache:'no-store'})]);
    if(!mr.ok||!ir.ok)throw Error('The scanner firmware could not be loaded. Please retry.');
    const manifest=await mr.json(),info=await ir.json(),build=manifest.builds?.find(b=>b.chipFamily==='ESP32-S3');
    if(!build||build.parts.length!==1||build.parts[0].offset!==0)throw Error('The firmware manifest is invalid.');
    const response=await fetch(new URL(build.parts[0].path,manifestURL),{cache:'no-store'});if(!response.ok)throw Error('The firmware image is unavailable. Please retry.');
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(!crypto.subtle||!info.sha256)throw Error('Open this page over HTTPS or localhost to prepare firmware.');
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==info.sha256)throw Error('The firmware checksum did not match. Reload the page.');
    // Validate the new board-config partition before making any image available.
    configuredFirmware(bytes,info,current||PRESET);
    template=bytes;buildInfo=info;refreshInstall();
    if(!window.isSecureContext||!('serial' in navigator))return;
    await loadWebTools();
    if(!customElements.get('esp-web-install-button'))throw Error('ESP Web Tools is unavailable. Please retry.');
    installer=document.createElement('esp-web-install-button');
    activate=document.createElement('button');activate.slot='activate';activate.className='button primary full';activate.textContent='Connect & install scanner ↗';activate.disabled=true;installer.append(activate);
    activate.addEventListener('click',()=>{if(prepared)prepared.activated=true;},{capture:true});
    const unsupported=document.createElement('span');unsupported.slot='unsupported';unsupported.className='small';unsupported.textContent='Use a desktop browser with Web Serial support.';installer.append(unsupported);
    const insecure=document.createElement('span');insecure.slot='not-allowed';insecure.className='small';insecure.textContent='Open this page over HTTPS or localhost.';installer.append(insecure);
    $('installer-mount').replaceChildren(installer);
    installer.addEventListener('install-success',()=>status('Installation finished. Allow the scanner to start, then run CALIBRATE.','good'));
    refreshInstall();
  }catch(error){installerError=error.message;$('retry-install').hidden=false;refreshInstall();}
  finally{installerLoading=false;}
}
$('retry-install').addEventListener('click',setupInstaller);
setupBoard();setupInstaller();
