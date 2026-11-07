const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('site/cap-nhat-tthc-2026-11.html','utf8');
const sections=[...html.matchAll(/<section id="([^"]+)" class="procedure"/g)].map(m=>m[1]);
assert.deepEqual(sections,['dang-phi','noi-cu-tru','chinh-thuc','tam-thoi']);
assert.equal((html.match(/class="diagram"/g)||[]).length,4,'exactly one compact diagram per procedure');
for(const [slug,pic] of [
 ['dang-phi','tthc-flow-dang-phi-v47.svg'],
 ['noi-cu-tru','tthc-flow-noi-cu-tru-v47.svg'],
 ['chinh-thuc','tthc-flow-chinh-thuc-v47.svg'],
 ['tam-thoi','tthc-flow-tam-thoi-v47.svg']]){
 assert(html.includes('downloads/tthc-20261105-'+slug+'.pdf'));
 assert(html.includes('assets/img/'+pic));
 assert(fs.existsSync('site/assets/img/'+pic));
 const svg=fs.readFileSync('site/assets/img/'+pic,'utf8');
 assert(svg.startsWith('<svg')&&svg.endsWith('</svg>'));
}
const start=html.indexOf('<section id="noi-cu-tru"'),end=html.indexOf('</section>',start),part=html.slice(start,end);
for(const id of ['gioi-thieu-noi-cu-tru','y-kien-can-bo','cuoi-nam'])assert(part.includes('id="'+id+'"'));
assert(part.indexOf('id="gioi-thieu-noi-cu-tru"')<part.indexOf('id="y-kien-can-bo"'));
assert(part.indexOf('id="y-kien-can-bo"')<part.indexOf('id="cuoi-nam"'));
assert(part.includes('Lập danh sách lấy ý kiến nơi cư trú'));
assert(part.includes('Lập danh sách và trình lên cấp trên'));
assert(part.includes('Chi bộ nơi cư trú')&&part.includes('Không đợi chi bộ nơi công tác lập danh sách'));
assert(html.includes('Ô 1 phê duyệt điện tử, không ký số'));
assert(html.includes('chiều về do chi bộ nơi tạm thời chủ động'));
assert(html.includes('00:00 ngày 06'));
assert(html.includes('background:var(--canvas)'));
assert(!/Georgia\s*,\s*serif/.test(html));
console.log('Four clear TTHC procedures, three independent residence flows and exactly four vector diagrams PASS');