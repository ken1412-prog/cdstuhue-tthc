const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('site/cap-nhat-tthc-2026-11.html','utf8');
assert.equal((html.match(/<section id=/g)||[]).length,4);
assert.equal((html.match(/class="training-block"/g)||[]).length,3);
assert(html.includes('00:00 ngày 06'));
assert(html.includes('Tổng 7 ngày')&&html.includes('Tổng 6 ngày')&&html.includes('Tổng 3 ngày'));
assert(html.includes('60 ngày làm việc')&&html.includes('giấy giới thiệu điện tử'));
for(const id of ['dang-phi','noi-cu-tru','chinh-thuc','tam-thoi']) assert(html.includes('downloads/tthc-20261105-'+id+'.pdf'));
assert(html.includes('Quy trình 3')||html.includes('03 · Nhận xét cuối năm'));

assert(!/Georgia\\s*,\\s*serif/.test(html), 'Vietnamese headline font must not use Georgia');
assert(html.includes('background:#f6f7fb;color:#21334b'), 'TTHC canvas must match dashboard');
assert(html.includes('font-family:inherit;font-size:clamp(20px,2.6vw,24px)'), 'Headline must inherit Vietnamese-friendly sans-serif');
assert(html.includes('.training-block{background:#fff;border:1px solid #e6eaf0'), 'Training blocks must match original white panel theme');

console.log('Three TTHC visual supplements and dashboard font/palette verified');