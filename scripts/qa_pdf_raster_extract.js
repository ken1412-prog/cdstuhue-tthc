/* Decode embedded PDF raster images locally in memory. Only redacted crops may be committed. */
'use strict';
function bytesToLatin(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return s}
function images(pdf){
 const txt=bytesToLatin(pdf),out=[];
 const all=[...txt.matchAll(/(?:^|\r?\n)(\d+)\s+0\s+obj\b/g)].map(m=>({id:+m[1],pos:m.index}));
 for(let i=0;i<all.length;i++){
  const st=all[i].pos,en=i+1<all.length?all[i+1].pos:txt.length;
  const endOfHeader=txt.indexOf('stream',st);
  if(endOfHeader<st||endOfHeader>en)continue;
  const header=txt.slice(st,endOfHeader);
  if(!/\/Subtype\s*\/Image/.test(header))continue;
  const cap=(pat)=>{const m=pat.exec(header);return m?+m[1]:null};
  const width=cap(/\/Width\s+(\d+)/),height=cap(/\/Height\s+(\d+)/),length=cap(/\/Length\s+(\d+)/);
  if(!width||!height||!length)continue;
  let start=endOfHeader+6;
  if(pdf[start]===13&&pdf[start+1]===10)start+=2;else if(pdf[start]===10||pdf[start]===13)start++;
  const bytes=pdf.subarray(start,start+length);
  const filter=header.includes('/DCTDecode')?'DCT':header.includes('/FlateDecode')?'Flate':null;
  out.push({id:all[i].id,width,height,filter,bytes});
 }
 return out;
}
function inflateZlib(data,expected){
 const lenBase=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
 const lenExtra=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
 const distBase=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
 const distExtra=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
 let bit=16,index=0; // skip two-byte zlib header
 const out=new Uint8Array(expected);
 const bitOne=()=>((data[bit>>>3] >>> (bit++&7))&1);
 const bits=n=>{let x=0;for(let k=0;k<n;k++)x|=bitOne()<<k;return x};
 const huff=(lens)=>{let max=0;const cnt=new Uint16Array(16),first=new Uint16Array(16);for(const l of lens){if(l){cnt[l]++;if(l>max)max=l}}let c=0;for(let i=1;i<=max;i++){c=(c+cnt[i-1])<<1;first[i]=c}const maps=Array.from({length:max+1},()=>new Map());for(let s=0;s<lens.length;s++){const l=lens[s];if(l)maps[l].set(first[l]++,s)}return {maps,max}};
 const sym=(tree)=>{let code=0;for(let l=1;l<=tree.max;l++){code=(code<<1)|bitOne();const found=tree.maps[l].get(code);if(found!==undefined)return found}throw Error('Invalid Huffman code at bit '+bit)};
 const litFixed=new Uint8Array(288);for(let i=0;i<144;i++)litFixed[i]=8;for(let i=144;i<256;i++)litFixed[i]=9;for(let i=256;i<280;i++)litFixed[i]=7;for(let i=280;i<288;i++)litFixed[i]=8;const distFixed=new Uint8Array(32).fill(5);
 const fixedLit=huff(litFixed),fixedDist=huff(distFixed);
 const order=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
 let last=0,blocks=0;
 while(!last){
  if(++blocks>100000)throw Error('Block loop');
  last=bits(1);const type=bits(2);
  if(type===0){
   bit=(bit+7)&~7;
   let off=bit>>>3;const length=data[off]|data[off+1]<<8;off+=4;
   if(index+length>out.length)throw Error('Stored block overflow');
   out.set(data.subarray(off,off+length),index);index+=length;bit=(off+length)*8;continue;
  }
  if(type===3)throw Error('Invalid block type');
  let lit=type===1?fixedLit:null,dist=type===1?fixedDist:null;
  if(type===2){
   const hLit=bits(5)+257,hDist=bits(5)+1,hClen=bits(4)+4,cl=new Uint8Array(19);
   for(let i=0;i<hClen;i++)cl[order[i]]=bits(3);
   const tree=huff(cl),seq=new Uint8Array(hLit+hDist);let j=0;
   while(j<seq.length){const v=sym(tree);if(v<=15)seq[j++]=v;else{
    const repeat=v===16?bits(2)+3:v===17?bits(3)+3:bits(7)+11;
    const val=v===16?seq[j-1]:0;seq.fill(val,j,j+repeat);j+=repeat;
   }}
   lit=huff(seq.subarray(0,hLit));dist=huff(seq.subarray(hLit));
  }
  while(true){
   const v=sym(lit);
   if(v<256){if(index>=out.length)throw Error('Literal overflow');out[index++]=v;}
   else if(v===256)break;
   else{
    const k=v-257;if(k>28)throw Error('bad length');
    let n=lenBase[k]+bits(lenExtra[k]);const d=sym(dist);
    if(d>=30)throw Error('bad distance');
    const back=distBase[d]+bits(distExtra[d]);
    if(index<back||index+n>out.length)throw Error('Copy out of range '+index+' back '+back+' n '+n);
    for(let i=0;i<n;i++)out[index]=out[index++-back];
   }
  }
 }
 if(index!==expected)throw Error('Unexpected length '+index+' != '+expected);
 return out;
}
module.exports={bytesToLatin,images,inflateZlib};
