import {validate} from './board.js?v=2';

export const CONFIG_OFFSET=0x190000;
export const CONFIG_SIZE=0x1000;
export const CONFIG_RECORD_SIZE=48;

export function crc32(bytes){
  let c=0xffffffff;
  for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
}
export function encodeBoardConfig(p){
  validate(p);
  const record=new Uint8Array(CONFIG_RECORD_SIZE),view=new DataView(record.buffer);
  record.set(new TextEncoder().encode('ESPBRD01'));
  view.setUint16(8,1,true);view.setUint16(10,CONFIG_RECORD_SIZE,true);
  view.setUint32(12,Math.round(p.board*1000),true);
  view.setUint32(16,Math.round(p.tag*1000),true);
  view.setUint32(20,Math.round(p.margin*1000),true);
  record.set(p.ids,24);
  view.setUint32(44,crc32(record.subarray(0,44)),true);
  return record;
}
export function verifyTemplate(template,info){
  if(!(template instanceof Uint8Array)||template.length<0x10000+24||template[0]!==0xe9)throw Error('The scanner firmware image is invalid.');
  if(info?.board_config?.version!==1||info.board_config.offset!==CONFIG_OFFSET||info.board_config.size!==CONFIG_SIZE)throw Error('The firmware does not support board settings.');
  if(template.length>CONFIG_OFFSET)throw Error('The firmware image overlaps the board settings area.');
  const view=new DataView(template.buffer,template.byteOffset,template.byteLength);
  if(view.getUint16(12,true)!==9||view.getUint16(0x10000+12,true)!==9)throw Error('The firmware is not for ESP32-S3.');
  let found=false;
  for(let at=0x8000;at<0x9000;at+=32){
    if(view.getUint16(at,true)!==0x50aa)break;
    const name=new TextDecoder().decode(template.subarray(at+12,at+28)).replace(/\0.*$/s,'');
    const offset=view.getUint32(at+4,true),size=view.getUint32(at+8,true);
    if(name==='board_cfg'){
      if(template[at+2]!==1||template[at+3]!==0x40||offset!==CONFIG_OFFSET||size!==CONFIG_SIZE)throw Error('The board settings partition is invalid.');
      found=true;
    }
    else if(offset<CONFIG_OFFSET+CONFIG_SIZE&&offset+size>CONFIG_OFFSET)throw Error('The firmware partition layout overlaps board settings.');
  }
  if(!found)throw Error('The board settings partition is missing.');
}
export function configuredFirmware(template,info,p){
  verifyTemplate(template,info);
  const record=encodeBoardConfig(p),image=new Uint8Array(CONFIG_OFFSET+CONFIG_SIZE);
  image.fill(0xff);image.set(template);image.set(record,CONFIG_OFFSET);
  return {image,fingerprint:new DataView(record.buffer).getUint32(44,true).toString(16).padStart(8,'0')};
}
