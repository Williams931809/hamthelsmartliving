const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/marketplace/experience.js','utf8');
const catalogue=JSON.parse(fs.readFileSync('data/catalogue.json','utf8')).Product.map(p=>({...p,price:p.compare_price>p.price?Math.round(p.compare_price*.8):p.price}));
const fn=source.slice(source.indexOf('function navigateReply('),source.indexOf('\nconst guide='));
const guide=vm.runInNewContext(fn+';navigateReply()',{catalogue,document:{querySelector:()=>({})},currency:n=>'₦'+Number(n).toLocaleString('en-NG'),safe:s=>String(s??'').replaceAll('<','&lt;'),settings:{whatsapp:'2349160000066',shipping_fee:15000,free_shipping_threshold:250000}});
let html=guide.reply('Tenon fingerprint locks under 500k');
const slugs=[...html.matchAll(/href="\/product\/([^"]+)"/g)].map(m=>m[1]);assert.ok(slugs.length);for(const slug of slugs){const p=catalogue.find(p=>p.slug===slug);assert.equal(p.brand,'Tenon');assert.ok(p.price<=500000);assert.notEqual(p.stock_status,'Out of stock')}
assert.match(guide.reply('What is the discount?'),/20%/);
assert.match(guide.reply('Can you analyse my door photo?'),/cannot analyse an image/);
assert.match(guide.reply('How do I pay? payment'),/No payment is collected online/);
assert.match(guide.reply('fingerprint locks under 1k'),/couldn’t find/);
console.log('Passed: catalogue recommendations respect brand, budget, stock, 20% offers, payment information and photo capability disclosure.');
