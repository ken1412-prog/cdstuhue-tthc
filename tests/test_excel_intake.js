'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const file=path.join(__dirname,'../apps-script/ExcelIntake.gs');
const source=fs.readFileSync(file,'utf8');
const sandbox={};
vm.createContext(sandbox);vm.runInContext(source,sandbox,{filename:file});
const {cdstuhueExcelIdentify_:identify,cdstuhueExcelValidate_:validate}=sandbox;
function fake(rows,cols) {
  return {getLastRow:()=>rows.length,getMaxColumns:()=>cols||rows[0].length,
    getRange:(r,c,h,w)=>({
      getDisplayValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>String(rows[r+i-1]?.[c+j-1]??''))),
      getValues:()=>Array.from({length:h},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1]?.[c+j-1]??''))})};
}
const titles=['STT','Tên đơn vị','Đảng viên','','','','','Hồ sơ đảng phí','','','','Số tiền','',''];
const sub=['','','Tổng sl đảng viên (1)','','','','','','','','','Tổng tiền theo hồ sơ đã khai báo','',''];
function payRow(i,name,members,due,paid,notFiled) {
  const a=Array(14).fill(0);
  a[0]=i;a[1]=name;a[2]=members;a[7]=0;a[8]=0;a[9]=members-notFiled;
  a[10]=notFiled;a[11]=due;a[12]=paid;
  return a;
}
const fortySix=fake([titles,sub,...Array.from({length:46},(_,i)=>payRow(i+1,'Đảng bộ '+(i+1),100,10000,9000,10))],14);
const city=fake([titles,sub,payRow(1,'Đảng bộ Thành phố Huế',56558,3095344951,2674296551,15238)],14);
assert.strictEqual(identify(fortySix),'THU_NOP');
assert.strictEqual(identify(city),'THU_NOP_CITY');
assert.strictEqual(validate('THU_NOP',fortySix).rows,46);
assert.strictEqual(validate('THU_NOP_CITY',city).members,56558);
const incomingMissing=fake([
 ['STT','MÃ ĐƠN VỊ','TÊN ĐƠN VỊ','TÊN ĐẢNG VIÊN','ĐƠN VỊ CHA','KỲ ĐẢNG PHÍ'],
 [1,'A57.X','Đơn vị A','(private)','Đảng bộ A','2026-10']
],6);
const oldMissing=fake([
 ['STT','TÊN ĐƠN VỊ','TÊN ĐẢNG VIÊN','ĐƠN VỊ CHA','KỲ ĐẢNG PHÍ','MÃ ĐƠN VỊ'],
 [1,'Đơn vị A','(private)','Đảng bộ A','2026-10','A57.X']
],6);
assert.strictEqual(identify(incomingMissing),'CHUA_KHAI');
assert.strictEqual(identify(oldMissing),'CHUA_KHAI');
assert.strictEqual(validate('CHUA_KHAI',incomingMissing).rows,1);
assert.strictEqual(validate('CHUA_KHAI',oldMissing).rows,1);
const bankHeader=['STT','Mã cơ quan','Tên cơ quan','Mã cơ quan cha','Cơ quan cha',
 'Trạng thái cấu hình tài khoản ngân hàng'];
const bank6=fake([bankHeader,[1,'A57.X','Đơn vị X','A57','TP Huế','Đã có tài khoản ngân hàng']],6);
const bank8=fake([[...bankHeader,'Ngày tạo TKNH','Trạng thái cấu hình tài khoản ngân hàng'],
 [1,'A57.X','Đơn vị X','A57','TP Huế','Đã có tài khoản ngân hàng','',
 'Đã có tài khoản ngân hàng']],8);
assert.strictEqual(identify(bank6),'NGAN_HANG');
assert.strictEqual(identify(bank8),'NGAN_HANG');
assert.strictEqual(validate('NGAN_HANG',bank6).registered,1);
assert.strictEqual(validate('NGAN_HANG',bank8).registered,1);
assert.strictEqual(validate('NGAN_HANG',bank6).layout,'uploaded6');
assert.strictEqual(validate('NGAN_HANG',bank8).layout,'canonical');
assert.strictEqual(identify(fake([['random'],['random']],6)),'');
assert.strictEqual(source.includes("function cdstuhueStageExcel4()"),true);
assert.strictEqual(source.includes("function cdstuhueInstallIntakeWatch()"),true);
assert.strictEqual(source.includes("DU_LIEU_CHO_DUYET"),true);
assert(!source.includes("'PHAN_BO'"),'Retired allocation must not return to import logic');
console.log('Excel intake four-source synthetic validation PASS');
