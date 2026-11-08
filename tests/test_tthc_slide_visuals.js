const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('site/cap-nhat-tthc-2026-11.html','utf8');
const sections=[...html.matchAll(/<section id="([^"]+)" class="procedure procedure-[^"]+"/g)].map(m=>m[1]);
assert.deepEqual(sections,['dang-phi','noi-cu-tru','chinh-thuc','tam-thoi']);
assert.equal((html.match(/class="diagram"/g)||[]).length,4,'exactly one compact diagram per procedure');
assert.equal((html.match(/class="dashboard-preview"/g)||[]).length,4,'Four dashboard overview panels');
assert.equal((html.match(/class="procedure-details"/g)||[]).length,4,'Four expandable detailed instructions');
assert(html.includes('class="site-bar"')&&html.includes('class="hero-art"'),'Dashboard nav/hero must be visible');
assert(html.includes('class="preview-meta"')&&html.includes('class="preview-flow"')&&html.includes('class="preview-steps"')&&html.includes('class="preview-result"'));
assert(html.includes('procedure-noi-cu-tru{--accent:#10865c')&&html.includes('procedure-tam-thoi{--accent:#754bb2'));
assert(html.includes('function all(){for(const d of document.querySelectorAll(\'details\'))'),'All instructional details must be shown from page load');
assert(html.includes("d.open=true;d.addEventListener('toggle'"),'No collapsible instructions');

for(const [slug,pic] of [
 ['dang-phi','tthc-flow-dang-phi-v47.svg'],
 ['noi-cu-tru','tthc-flow-noi-cu-tru-v47.svg'],
 ['chinh-thuc','tthc-flow-chinh-thuc-v47.svg'],
 ['tam-thoi','tthc-flow-tam-thoi-v47.svg']]){
 assert(html.includes('downloads/cam-nang-04-tthc-2026-11.pdf'));
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

assert(html.includes('class="guide-sidebar"')&&html.includes('class="guide-menu"'));
assert.equal((html.match(/class="guide-menu-group/g)||[]).length,4);
for(const anchor of ['nop-thong-thuong','dieu-chinh-dang-phi','nop-ho-mien-giam','phan-bo-dang-phi',
 'chuan-bi-noi-cu-tru','gioi-thieu-noi-cu-tru','y-kien-can-bo','cuoi-nam','chinh-thuc-noi-di','chinh-thuc-noi-den',
 'tam-thoi-chieu-di','tam-thoi-chieu-ve'])assert(html.includes('href="#'+anchor+'"')&&html.includes('id="'+anchor+'"'));
const openTags=[...html.matchAll(/<details[^>]*>/g)].map(m=>m[0]);
assert.equal(openTags.length,11,'All instruction sections preserved');
assert(openTags.every(t=>/\bopen\b/.test(t)),'All instructions must be expanded initially');
assert.equal((html.match(/class="hero-pdf"/g)||[]).length,1);
assert.equal((html.match(/downloads\/cam-nang-04-tthc-2026-11\.pdf/g)||[]).length,2);
assert(!/href="downloads\/tthc-20261105-[^"]+\.pdf"/.test(html),'Website must have one PDF download destination only');
console.log('Four clear TTHC procedures, three independent residence flows and exactly four vector diagrams PASS');