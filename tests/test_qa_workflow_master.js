'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base=JSON.parse(fs.readFileSync('site/data/approved.json','utf8')).items;
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('site/assets/qa-v36-20261110.js','utf8'),sandbox);
const qa=sandbox.window.CDSTUHUE_V36_QA;
const all=[...base,...qa.newItems];
assert(base.length>=247,'Retain at least 247 signed-off source questions');
assert(all.length>=250,'Inventory must retain the original 250 IDs and allow future signed-off additions');
assert.equal(new Set(all.map(x=>x.id)).size,all.length,'All IDs remain unique');
assert(all.every(x=>x.question&&x.answer),'Original questions and answers remain available');
const aliases=Object.entries(qa.mergedInto);
assert.equal(aliases.length,6,'Only six source-backed duplicate cards merged');
for(const [from,to] of aliases){
 assert(all.some(x=>x.id===from),'Alias source missing: '+from);
 assert(all.some(x=>x.id===to),'Canonical QA missing: '+to);
 assert(!qa.mergedInto[to],'No chained redirects: '+to);
}
const visible=all.filter(x=>!qa.mergedInto[x.id]);
assert.equal(visible.length,all.length-6,'Do not add duplicate fragmented cards');
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
assert(groups.csdl>=32);assert(groups.stdv>=101);assert(groups.tthc>=114);
console.log('QA workflow audit PASS: '+all.length+' source/added IDs, '+visible.length+' visible, 6 aliases, 10 canonical workflows checked');
