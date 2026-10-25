'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(path.join(__dirname,'../apps-script/ExcelIntake.gs'),'utf8');
const runtime={};vm.createContext(runtime);vm.runInContext(source,runtime);
const {cdstuhueExcelIdentify_:identify,cdstuhueExcelValidate_:validate,
  cdstuhueExcelDescribe_:describe,cdstuhueNormalizeStagedSheet_:standardize}=runtime;

function fake(rows){
  const colCount=Math.max(...rows.map(r=>r.length));
  const reads=[];
  let normalized=null;
  const original={
    getLastRow:()=>rows.length,
    getLastColumn:()=>colCount,
    getMaxColumns:()=>colCount,
    getRange:(r,c,n=1,w=1)=>{
      reads.push({r,c,n,w});
      return {
        getDisplayValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>String(rows[r+i-1]?.[c+j-1]??''))),
        getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:w},(_,j)=>rows[r+i-1]?.[c+j-1]??''))
      };
    },
    getParent:()=>({
      getSheetByName:()=>null,
      insertSheet:()=>{
        normalized={value:[],getMaxRows:()=>1000,
          insertRowsAfter:()=>{},
          setFrozenRows:()=>{},
          getRange:(row,col,n,w)=>({setValues:data=>{
            for(let i=0;i<n;i++)normalized.value[row+i-1]=data[i];
          }})};
        return normalized;
      }
    }),
    getWritten:()=>normalized?.value,
    getReads:()=>reads
  };
  return original;
}
const title=['STT','Tên đơn vị','Đảng viên','','','','','Hồ sơ đảng phí','','','','Số tiền','',''];
const detail=['','','Tổng sl đảng viên (1)','','','','','Chưa duyệt (6)',
  'Đã duyệt, chưa nộp (7)','Đã duyệt, đã nộp (8)','Số đảng viên chưa có hồ sơ (9)',
  'Tổng tiền theo hồ sơ đã khai báo','Tổng tiền đã nộp','Tỷ lệ hoàn thành'];
function payRow(i,name,members,due,paid,notFiled){
  const a=Array(14).fill(0);
  a[0]=i;a[1]=name;a[2]=members;a[7]=0;a[8]=0;a[9]=members-notFiled;
  a[10]=notFiled;a[11]=due;a[12]=paid;return a;
}
const base=[title,detail,...Array.from({length:46},(_,i)=>payRow(i+1,'Đảng bộ '+(i+1),100,10000,9000,10))];
const normal=fake(base);
assert.equal(identify(normal),'THU_NOP');
assert.equal(validate('THU_NOP',normal).rows,46);
// Delete six unused columns, including STT; randomize the remaining columns.
const order=[12,10,1,9,11,2,8,7];
const compact=fake(base.map(row=>order.map(idx=>row[idx])));
assert.equal(identify(compact),'THU_NOP');
assert.equal(compact.getLastColumn(),8);
assert.equal(validate('THU_NOP',compact).received,414000);
assert.equal(standardize('THU_NOP',compact),'CDSTUHUE_CHUAN');
const paymentStandard=compact.getWritten();
assert.equal(paymentStandard.length,48);
assert.equal(paymentStandard[2][0],1);
assert.equal(paymentStandard[2][1],'Đảng bộ 1');
assert.equal(paymentStandard[2][11],10000);
assert.equal(paymentStandard[2][12],9000);
assert.equal(paymentStandard[2][13],'');
// One-row city header, aliases and order changed; still one city report, not a 47th unit.
const city=fake([['Tổng tiền đã thu','Tên đảng bộ','Đã duyệt đã nộp','Tổng số đảng viên',
 'Chưa duyệt','Tổng tiền phải nộp','Chưa có hồ sơ','Đã duyệt chưa nộp'],
 [2674296551,'Đảng bộ Thành phố Huế',41320,56558,0,3095344951,15238,0]]);
assert.equal(identify(city),'THU_NOP_CITY');
assert.equal(validate('THU_NOP_CITY',city).notFiled,15238);
assert.equal(standardize('THU_NOP_CITY',city),'CDSTUHUE_CHUAN');
assert.equal(city.getWritten()[2][1],'Đảng bộ Thành phố Huế');

// The city control report does not need any filing-status columns.
const cityMinimal=fake([
 ['Tổng tiền đã nộp','Tên đơn vị','Tổng đảng viên',
  'Tổng tiền phải nộp','Chưa có hồ sơ'],
 [2674296551,'Đảng bộ Thành phố Huế',56558,3095344951,15238]
]);
assert.equal(identify(cityMinimal),'THU_NOP_CITY');
assert.equal(validate('THU_NOP_CITY',cityMinimal).members,56558);
standardize('THU_NOP_CITY',cityMinimal);
assert.equal(cityMinimal.getWritten()[2][7],0);
assert.equal(validate('THU_NOP_CITY',fake(cityMinimal.getWritten())).members,56558);
assert.equal(cityMinimal.getWritten()[2][10],15238);

// Missing-source report can omit private individual names, STT, IDs and period.
const missing=fake([
  ['ĐƠN VỊ CHA','TÊN TỔ CHỨC'],
  ['Đảng bộ cấp 2','Chi bộ 1']
]);
assert.equal(identify(missing),'CHUA_KHAI');
assert.equal(validate('CHUA_KHAI',missing).rows,1);
assert.equal(standardize('CHUA_KHAI',missing),'CDSTUHUE_CHUAN');
assert.equal(missing.getWritten()[1][1],'Chi bộ 1');
assert.equal(missing.getWritten()[1][2],''); // no personal names
assert.equal(missing.getWritten()[1][3],'Đảng bộ cấp 2');

// Original six-column file with a person name: never read its personal-name column.
const privateMissing=fake([['STT','MÃ ĐƠN VỊ','TÊN ĐƠN VỊ','TÊN ĐẢNG VIÊN','ĐƠN VỊ CHA','KỲ ĐẢNG PHÍ'],
 [1,'A57.3','Chi bộ A','Tên cá nhân','Đảng bộ A','2026-10']]);
assert.equal(identify(privateMissing),'CHUA_KHAI');
assert.equal(validate('CHUA_KHAI',privateMissing).rows,1);
standardize('CHUA_KHAI',privateMissing);
assert.equal(privateMissing.getWritten()[1][2],'');
assert.equal(privateMissing.getReads().filter(read=>read.r>1&&read.c===4).length,0);
// Bank status can be anywhere, and optional date/account-related columns can vanish.
const bank=fake([
 ['Trạng thái đăng ký TKNH','Tên cơ quan cha','Mã đơn vị','Tên đơn vị','Mã cơ quan cha'],
 ['Đã có tài khoản ngân hàng','Thành phố Huế','A57.9','Tổ chức 9','A57']
]);
assert.equal(identify(bank),'NGAN_HANG');
assert.equal(validate('NGAN_HANG',bank).registered,1);
assert.equal(standardize('NGAN_HANG',bank),'CDSTUHUE_CHUAN');
assert.equal(bank.getWritten()[1][1],'A57.9');
assert.equal(bank.getWritten()[1][7],'Đã có tài khoản ngân hàng');
// Original exports with two identical status columns are accepted if consistent.
const doubleBank=fake([
 ['STT','Mã cơ quan','Tên cơ quan','Mã cơ quan cha','Cơ quan cha',
  'Trạng thái cấu hình tài khoản ngân hàng','Ngày tạo TKNH','Trạng thái cấu hình tài khoản ngân hàng'],
 [1,'A57.10','Cơ quan 10','A57','TP Huế','Đã có tài khoản ngân hàng','',
 'Đã có tài khoản ngân hàng']
]);
assert.equal(validate('NGAN_HANG',doubleBank).registered,1);
const mismatch=fake([
 doubleBank.getRange(1,1,1,8).getValues()[0],
 [1,'A57.10','Cơ quan 10','A57','TP Huế','Chưa có tài khoản ngân hàng','',
 'Đã có tài khoản ngân hàng']
]);
assert.throws(()=>validate('NGAN_HANG',mismatch),/mâu thuẫn/);
// A critical field removed must fail, never guess shifted positions or zero.
const withoutPaid=fake(base.map(row=>row.filter((_,i)=>i!==12)));
assert.throws(()=>validate('THU_NOP',withoutPaid),/paid/);
const unknown=fake([['Mã','Tên gì đó'],['A','B']]);
assert.equal(identify(unknown),'');
assert(source.includes('function cdstuhueStageExcel4()'));
assert(source.includes('function cdstuhueInstallIntakeWatch()'));
assert(source.includes('function cdstuhueApproveStagedBatch()'));
assert(source.includes('DUYET '));
assert(!source.includes("'PHAN_BO'"));
const combined=fs.readFileSync(path.join(__dirname,'../apps-script/CDSTUHUE_DEPLOY_SINGLE.gs'),'utf8');
const sourceQa=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
assert(combined.includes(sourceQa),'Deploy single-file bundle is missing current QA/public API module');
assert(combined.includes(source),'Deploy single-file bundle is missing current Excel intake module');
assert(combined.includes('function doGet('),'Public website feed must remain available');
assert(combined.includes('function cdstuhueApproveStagedBatch()'),'Private approval action missing');

console.log('Flexible Excel header mapping, optional drops, shuffle, canonicalization and privacy PASS');
