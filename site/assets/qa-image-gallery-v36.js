/* CDSTUHUE V36 — verified public QA image gallery (no image placeholders).
   Approved answers remain authoritative in site/data/approved.json.
   Only manually checked assets under assets/qa-media/ may be displayed.
   NEVER publish raw Zalo screenshots, Message rows, private Drive URLs,
   identifiers/OTP or internal notes from a message. */
(()=>{
'use strict';
const MANIFEST="data/qa-media-public.json?v=20261102-v36";
const ASSET=/^assets\/qa-media\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}\.(?:png|jpe?g|webp)$/i;
const QA_ID=/^QA\d{3,5}$/;
let entries=new Map();
let fetchDone=false;
const make=(tag,cls,label)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(label!==undefined)node.textContent=label;
 return node;
};
function safeEntry(item){
 if(!item||typeof item!=='object'||!QA_ID.test(item.id)||item.public!==true||!Array.isArray(item.images))return null;
 const images=item.images.filter(img=>{
  return img&&typeof img==='object'&&typeof img.src==='string'&&ASSET.test(img.src)
    &&typeof img.alt==='string'&&img.alt.trim().length>=10&&img.alt.length<=220
    &&typeof img.caption==='string'&&img.caption.trim().length>=8&&img.caption.length<=400
    &&img.reviewed===true;
 }).slice(0,12);
 return images.length?{id:item.id,images}:null;
}
function render(){
 if(!fetchDone)return;
 const body=document.getElementById('modalBody'),idNode=document.getElementById('modalId');
 if(!body||!idNode||body.querySelector('.qa-media-gallery'))return;
 const header=(idNode.textContent||'').trim();
 if(header.includes('MINH HỌA'))return;
 const id=header.split(/\s+/)[0];
 const entry=entries.get(id);
 if(!entry)return;
 // Only a legitimately opened public QA can have both a body and modal ID.
 if(!body.querySelector('.answer'))return;
 const section=make('section','qa-media-gallery');
 section.setAttribute('aria-label','Ảnh minh họa đã duyệt');
 section.append(make('h3','qa-media-heading','Ảnh minh họa theo câu hỏi'));

 const grid=make('div','qa-media-grid');
 for(const img of entry.images){
  const fig=make('figure','qa-media-card');
  const link=make('a','qa-media-link');
  link.href=img.src;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.setAttribute('aria-label',img.alt+' — mở ảnh đầy đủ');
  const image=make('img');
  image.src=img.src;
  image.alt=img.alt;
  image.loading='lazy';
  image.decoding='async';
  link.append(image);
  fig.append(link,make('figcaption','',img.caption));
  grid.append(fig);
 }
 section.append(grid);
 body.querySelector('.answer')?.append(section);
}
async function getManifest(){
 try{
  const res=await fetch(MANIFEST,{cache:'no-cache',credentials:'same-origin'});
  if(!res.ok)throw Error('No public QA media manifest');
  const doc=await res.json();
  if(doc&&doc.schema===1&&Array.isArray(doc.items)){
   for(const raw of doc.items){
    const e=safeEntry(raw);
    if(e)entries.set(e.id,e);
   }
  }
 }catch(_err){
  // Missing media never hides, delays or changes reviewed answers.
 }finally{fetchDone=true;render()}
}
function boot(){
 const body=document.getElementById('modalBody');
 if(!body)return;
 new MutationObserver(()=>render()).observe(body,{childList:true});
 getManifest();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
