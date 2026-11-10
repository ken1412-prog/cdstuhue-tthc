/* V36 QA image processing helpers. Input JPEG bytes are received privately at runtime.
   This module contains no source IDs, no user data, and no bundled input images.
   Redaction is applied to RGB pixels BEFORE PNG encoding; no removable SVG overlays. */
'use strict';
const tbl="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function fromB64(s){const ix=new Int16Array(128).fill(-1);for(let i=0;i<64;i++)ix[tbl.charCodeAt(i)]=i;const out=new Uint8Array(Math.floor(s.length*3/4));let a=0,b=0,j=0;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c===61)break;const v=c<128?ix[c]:-1;if(v<0)continue;a=(a<<6)|v;b+=6;if(b>=8){b-=8;out[j++]=(a>>>b)&255}}return out.subarray(0,j)}
function toB64(bytes){const out=[];for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0,n=(a<<16)|(b<<8)|c;out.push(tbl[(n>>18)&63]+tbl[(n>>12)&63]+(i+1<bytes.length?tbl[(n>>6)&63]:"=")+(i+2<bytes.length?tbl[n&63]:"="));}return out.join("")}
const crcTable=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}
function crc32(bs){let c=0xffffffff;for(const x of bs)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function put32(buf,i,n){buf[i]=n>>>24;buf[i+1]=(n>>>16)&255;buf[i+2]=(n>>>8)&255;buf[i+3]=n&255}
function chunk(name,data){const n=data.length,buf=new Uint8Array(12+n);put32(buf,0,n);for(let i=0;i<4;i++)buf[4+i]=name.charCodeAt(i);buf.set(data,8);put32(buf,8+n,crc32(buf.subarray(4,8+n)));return buf}
function png(rgb,w,h){const row=1+w*3,raw=new Uint8Array(row*h);for(let y=0;y<h;y++)raw.set(rgb.subarray(y*w*3,(y+1)*w*3),y*row+1);const blocks=Math.ceil(raw.length/65535),z=new Uint8Array(2+raw.length+blocks*5+4);let p=0;z[p++]=0x78;z[p++]=0x01;let a=1,b=0;for(const v of raw){a=(a+v)%65521;b=(b+a)%65521}for(let start=0;start<raw.length;){const size=Math.min(65535,raw.length-start),end=start+size===raw.length;z[p++]=end?1:0;z[p++]=size&255;z[p++]=size>>>8;const inv=(~size)&65535;z[p++]=inv&255;z[p++]=inv>>>8;z.set(raw.subarray(start,start+size),p);p+=size;start+=size}put32(z,p,((b<<16)|a)>>>0);p+=4;const ih=new Uint8Array(13);put32(ih,0,w);put32(ih,4,h);ih[8]=8;ih[9]=2;const parts=[Uint8Array.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ih),chunk("IDAT",z.subarray(0,p)),chunk("IEND",new Uint8Array(0))];const n=parts.reduce((s,x)=>s+x.length,0),out=new Uint8Array(n);let i=0;for(const x of parts){out.set(x,i);i+=x.length}return out}
function crop(img,x,y,w,h){if(x<0||y<0||x+w>img.width||y+h>img.height)throw Error("outside source");const out=new Uint8Array(w*h*3);for(let j=0;j<h;j++)out.set(img.data.subarray(((y+j)*img.width+x)*3,((y+j)*img.width+x+w)*3),j*w*3);return out}
function fill(rgb,w,h,x,y,bw,bh,color=[242,224,211]){for(let j=Math.max(0,y);j<Math.min(h,y+bh);j++)for(let i=Math.max(0,x);i<Math.min(w,x+bw);i++){const k=(j*w+i)*3;rgb[k]=color[0];rgb[k+1]=color[1];rgb[k+2]=color[2]}}
function stroke(rgb,w,h,x,y,bw,bh,color=[225,36,32],th=6){for(let j=Math.max(0,y);j<Math.min(h,y+bh);j++)for(let i=Math.max(0,x);i<Math.min(w,x+bw);i++)if(i<x+th||i>=x+bw-th||j<y+th||j>=y+bh-th){const k=(j*w+i)*3;rgb[k]=color[0];rgb[k+1]=color[1];rgb[k+2]=color[2]}}
function apply(img,config){const {x,y,w,h,mask=[],boxes=[]}=config;const rgb=crop(img,x,y,w,h);for(const [mx,my,mw,mh] of mask)fill(rgb,w,h,mx-x,my-y,mw,mh);for(const [bx,by,bw,bh,color] of boxes)stroke(rgb,w,h,bx-x,by-y,bw,bh,color||[224,32,29]);return png(rgb,w,h)}
module.exports={fromB64,toB64,png,crop,fill,stroke,apply};
