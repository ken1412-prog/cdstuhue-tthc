'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base=JSON.parse(fs.readFileSync('site/data/approved.json','utf8')).items;
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('site/assets/qa-v36-20261110.js','utf8'),sandbox);
const qa=sandbox.window.CDSTUHUE_V36_QA;
const all=[...base,...qa.newItems];
assert.equal(base.length,247,'Retain 247 signed-off source questions');
assert.equal(all.length,250,'Inventory must retain 250 source/added IDs');
assert.equal(new Set(all.map(x=>x.id)).size,250,'All IDs remain unique');
assert(all.every(x=>x.question&&x.answer),'Original questions and answers remain available');
const aliases=Object.entries(qa.mergedInto);
assert.equal(aliases.length,6,'Only six source-backed duplicate cards merged');
for(const [from,to] of aliases){
 assert(all.some(x=>x.id===from),'Alias source missing: '+from);
 assert(all.some(x=>x.id===to),'Canonical QA missing: '+to);
 assert(!qa.mergedInto[to],'No chained redirects: '+to);
}
const visible=all.filter(x=>!qa.mergedInto[x.id]);
assert.equal(visible.length,244,'Do not add duplicate fragmented cards');
const master={
 QA007:['TỰ TÍNH','ĐẢNG VIÊN','THANH TOÁN','ĐIỀU CHỈNH'],
 QA104:['BHXH','Gửi yêu cầu','phê duyệt'],
 QA111:['NỘP HỘ','TRA CỨU','KIỂM TRA KẾT QUẢ'],
 QA113:['CHIỀU ĐI','CHIỀU VỀ','ô 8'],
 QA101:['QUY TRÌNH 3','Xem trước','Lưu'],
 QA115:['QUY TRÌNH 2','CHI BỘ NƠI CÔNG TÁC','Xuất kết quả xử lý'],
 QA129:['QUY TRÌNH 1','CHI BỘ NƠI CƯ TRÚ'],
 QA132:['Cài đặt','Thông tin cá nhân','BÍ THƯ'],
 STDV028:['ĐĂNG KÝ','Điểm danh','HỌP CHI ỦY','Gửi báo cáo'],
 CSDL043:['CHỈNH SỬA','KHÓA CÂY','CÔNG KHAI']
};
const lookup=id=>qa.revisions[id]||qa.newItems.find(x=>x.id===id)||base.find(x=>x.id===id);
for(const [id,needles] of Object.entries(master)){
 const ans=lookup(id).answer;
 for(const needle of needles)assert(ans.toLowerCase().includes(needle.toLowerCase()),id+' missing '+needle);
 assert(ans.length>350,id+' main workflow is too fragmentary');
}
const app=fs.readFileSync('site/assets/app.js','utf8');
assert(app.includes('const aliases=window.CDSTUHUE_V36_QA?.mergedInto||{}'),'Filter obsolete cards during both QA loads');
assert(app.includes('const resolved=window.CDSTUHUE_V36_QA?.mergedInto?.[id]||id'),'Keep old QA links working');
assert((app.match(/mergedInto\?\.\[pendingQuestionId\]/g)||[]).length===2,'Pending deep links must work after both load paths');
const groups=base.reduce((a,q)=>(a[q.group]=(a[q.group]||0)+1,a),{});
assert.equal(groups.csdl,32);assert.equal(groups.stdv,101);assert.equal(groups.tthc,114);
console.log('QA workflow audit PASS: 247 original + 3 added = 250, 244 visible, 6 aliases, 10 canonical workflows checked');
