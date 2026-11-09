const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/marketplace/marketplace.js','utf8');
const products=JSON.parse(fs.readFileSync('data/catalogue.json','utf8')).Product.map(p=>({...p,price:p.compare_price>p.price?Math.round(p.compare_price*.8):p.price}));
const fn=source.slice(source.indexOf('function finderMatches('),source.indexOf('\nfunction quizPage'));
const match=vm.runInNewContext(fn+';finderMatches',{locks:()=>products.filter(p=>p.category==='smart-locks'),text:p=>[p.name,p.short_description,p.description,...p.features||[]].join(' ')});
const matches=match({door:'unsure',access:'fingerprint',budget:'500000',use:'home'});assert.ok(matches.length);for(const p of matches){assert.ok(p.price<=500000);assert.notEqual(p.stock_status,'Out of stock');assert.match([p.name,p.description,...p.features||[]].join(' '),/fingerprint/i)}
for(let i=1;i<matches.length;i++)assert.ok(matches[i].price>=matches[i-1].price);
const glass=match({door:'glass',access:'any',budget:'any',use:'home'});assert.ok(glass.length);for(const p of glass)assert.match([p.name,p.description,...p.features||[]].join(' '),/glass door|frameless glass/i);
assert.equal(match({budget:'1'}).length,0);
console.log('Passed: lock finder filters current catalogue by budget, stock and door type; sorts by price; and handles no matches.');
