import catalogue from '../data/catalogue.json';
const publicEntities = new Set(['Product','Category','SiteConfig','HeroSlide','Testimonial','Faq','VideoShowcase']);
const inboxEntities = new Set(['Order','ContactMessage','Subscriber']);
let seeded:Promise<void>|undefined;
async function seed(db:D1Database) {
  seeded ||= (async()=>{
    const done=await db.prepare("SELECT value FROM site_state WHERE key='seeded'").first();
    if(!done){
    const rows=Object.entries(catalogue).flatMap(([entity,items])=>items.map(item=>db.prepare('INSERT OR IGNORE INTO records(entity,id,payload) VALUES(?,?,?)').bind(entity,item.id,JSON.stringify(item))));
    for(let i=0;i<rows.length;i+=75)await db.batch(rows.slice(i,i+75));
    await db.prepare("INSERT OR IGNORE INTO site_state(key,value) VALUES('seeded','1')").run();
    }
    // One-time commercial correction: retain list prices and apply the requested 20% discount.
    const corrected=await db.prepare("SELECT value FROM site_state WHERE key='discount20-v1'").first();
    if(!corrected){
      const products=await db.prepare("SELECT id,payload FROM records WHERE entity='Product'").all<{id:string,payload:string}>();
      const updates=products.results.flatMap(row=>{const p=JSON.parse(row.payload);if(!(Number(p.compare_price)>0&&Number(p.compare_price)>Number(p.price)))return [];p.price=Math.round(Number(p.compare_price)*0.8);return [db.prepare("UPDATE records SET payload=? WHERE entity='Product' AND id=?").bind(JSON.stringify(p),row.id)]});
      for(let i=0;i<updates.length;i+=75)await db.batch(updates.slice(i,i+75));
      await db.prepare("INSERT OR IGNORE INTO site_state(key,value) VALUES('discount20-v1','1')").run();
    }
  })().catch(e=>{seeded=undefined;throw e});
  await seeded;
}
function error(message:string,status=400){return Response.json({message},{status})}
async function user(req:Request,db:D1Database){
  const id=req.headers.get('oai-authenticated-user-id');
  if(!id)return null;
  // The Site owner's identity is fixed; public visitors can never enroll as admin.
  const ownerId = '2ecfbfc9-d134-4453-8598-3ba863cac040';
  return {id,email:req.headers.get('oai-authenticated-user-email')||'',full_name:req.headers.get('oai-authenticated-user-full-name')||'Store visitor',role:ownerId===id?'admin':'user'};
}
export async function storeApi(req:Request,env:Cloudflare.Env){
  const db=env.DB;if(!db)return error('Store database unavailable',503);
  await seed(db);
  const path=new URL(req.url).pathname;
  if(path==='/api/store/me') { const u=await user(req,db);return Response.json(u||{id:null,role:'guest',email:''}); }
  if(path.startsWith('/api/store/media/')) {
    if(req.method!=='GET' && req.method!=='HEAD')return error('Method not allowed',405);
    if(!env.BUCKET)return error('Media storage unavailable',503);
    const key=path.slice('/api/store/media/'.length);
    if(!/^[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm|mov)$/.test(key))return error('File not found',404);
    const object=await env.BUCKET.get(key);if(!object)return error('File not found',404);
    const headers=new Headers({'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'});
    object.writeHttpMetadata(headers);
    return new Response(req.method==='HEAD'?null:object.body,{headers});
  }
  if(path==='/api/store/upload') {
    if(req.method!=='POST')return error('Method not allowed',405);
    const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return error('Cross-origin writes are not allowed',403);
    const u=await user(req,db);if(u?.role!=='admin')return error('Administrator access required',403);
    if(!env.BUCKET)return error('Media storage unavailable',503);
    const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
    const type=req.headers.get('content-type')?.split(';')[0]||'';
    if(!types[type])return error('Choose a JPG, PNG, WebP, GIF, MP4, WebM or MOV file',415);
    const limit=30*1024*1024;
    if(Number(req.headers.get('content-length')||0)>limit)return error('Files must be 30 MB or smaller',413);
    const reader=req.body?.getReader();if(!reader)return error('Choose a file');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return error('Files must be 30 MB or smaller',413)}chunks.push(value)}
    if(!size)return error('Choose a nonempty file');
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    const key=crypto.randomUUID()+'.'+types[type];
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
    return Response.json({file_url:'/api/store/media/'+key});
  }
  if(req.method!=='POST')return error('Method not allowed',405);
  if(!req.headers.get('content-type')?.includes('application/json'))return error('JSON required',415);
  const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return error('Cross-origin writes are not allowed',403);
  if(Number(req.headers.get('content-length')||0)>100000)return error('Request too large',413);
  let input:any;try{const body=await req.text();if(body.length>100000)return error('Request too large',413);input=JSON.parse(body)}catch{return error('Invalid request')}
  const {entity,action,args=[]}=input;
  if(!publicEntities.has(entity)&&!inboxEntities.has(entity))return error('Unknown collection',404);
  const isRead=['list','filter','get','count'].includes(action);
  let u:any=await user(req,db);
  if(!publicEntities.has(entity)||!isRead) {
    if(!(inboxEntities.has(entity)&&action==='create')){u=await user(req,db);if(u?.role!=='admin')return error('Administrator access required',403)}
  }
  const found=await db.prepare('SELECT payload FROM records WHERE entity=?').bind(entity).all<{payload:string}>();
  let rows=found.results.map(r=>{const p=JSON.parse(r.payload);if(entity==='Product'&&p.category==='smart-locks'&&(catalogue.Product as any[]).some(c=>c.id===p.id))p.overview_video_url='/videos/'+p.id+'.mp4';return p});
  const originalOrder = new Map(((catalogue as any)[entity]||[]).map((r:any,i:number)=>[r.id,i]));
  rows.sort((a,b)=>Number(originalOrder.get(a.id)??100000)-Number(originalOrder.get(b.id)??100000));
  if(isRead){
    if(u?.role!=='admin'){
      const visibility:Record<string,string>={Product:'published',Category:'published',HeroSlide:'active',Testimonial:'published',Faq:'published',VideoShowcase:'active'};
      const key=visibility[entity];if(key)rows=rows.filter(r=>r[key]!==false);
    }
    const filter=action==='filter'?args[0]:action==='count'?(args[0]||{}):{};
    if(filter&&typeof filter==='object')rows=rows.filter(r=>Object.entries(filter).every(([k,v])=>r[k]===v));
    if(action==='get')return Response.json(rows.find(r=>r.id===args[0])||null);
    if(action==='count')return Response.json(rows.length);
    const opts=action==='filter'?args[1]:args[0];const sort=typeof opts==='string'?opts:opts?.sort;
    if(sort)rows.sort((a,b)=>{const key=sort.replace(/^-/,'');return (typeof a[key]==='number'?a[key]-b[key]:String(a[key]??'').localeCompare(String(b[key]??'')))*(sort.startsWith('-')?-1:1)});
    const limit=typeof opts==='object'?Math.min(opts.limit||300,1000):args[action==='filter'?2:1]||300;
    rows=rows.slice(0,limit);return Response.json(typeof opts==='object'?{items:rows,next_cursor:null}:rows);
  }
  if(action==='delete'){await db.prepare('DELETE FROM records WHERE entity=? AND id=?').bind(entity,String(args[0])).run();return Response.json({success:true})}
  if(!['create','update'].includes(action))return error('Unsupported action');
  const raw=action==='create'?args[0]:args[1];
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return error('Invalid record');
  let record=action==='update'?{...rows.find(r=>r.id===args[0]),...raw,id:args[0],updated_date:new Date().toISOString()}:{...raw,id:crypto.randomUUID(),created_date:new Date().toISOString(),updated_date:new Date().toISOString()};
  if(entity==='Product'&&raw.price!==undefined&&(!Number.isFinite(Number(raw.price))||Number(raw.price)<0))return error('A valid price is required');
  if(entity==='Product'&&Number(record.compare_price)>0)record.price=Math.round(Number(record.compare_price)*0.8);
  if(entity==='Product'&&(!String(record.name||'').trim()||!Number.isFinite(Number(record.price))||Number(record.price)<0))return error('A product name and valid price are required');
  if(action==='update'&&!rows.some(r=>r.id===args[0]))return error('Record not found',404);
  if(entity==='Subscriber'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email||''))return error('A valid email is required');
  if(entity==='ContactMessage'&&(!String(record.name||'').trim()||!String(record.message||'').trim()))return error('Name and message are required');
  if(entity==='Order'&&action==='create'){
    if(!record.customer_name||!record.phone||!record.address||!record.city||!record.state||!Array.isArray(record.items)||!record.items.length||record.items.length>100)return error('Complete the delivery details and add products');
    if(!['Bank transfer','Pay on delivery'].includes(record.payment_method))return error('Select a payment method');
    if(!/^[+\d\s()-]{7,24}$/.test(record.phone))return error('Enter a valid phone number');
    if(record.payment_method==='Pay on delivery'&&!['lagos','abuja','fct'].includes(String(record.state).trim().toLowerCase()))return error('Pay on delivery is available in Lagos and Abuja. Choose bank transfer for other states.');
    const products=(await db.prepare("SELECT payload FROM records WHERE entity='Product'").all<{payload:string}>()).results.map(r=>JSON.parse(r.payload));
    const items=[];for(const item of record.items){const p=products.find(p=>p.id===item.product_id&&p.published);const quantity=Number(item.quantity);if(!p||p.stock_status==='Out of stock'||!Number.isInteger(quantity)||quantity<1||quantity>99)return error('A product is unavailable');items.push({product_id:p.id,name:p.name,price:p.price,quantity,image:p.images?.[0]||''})}
    const config=(await db.prepare("SELECT payload FROM records WHERE entity='SiteConfig' LIMIT 1").first<{payload:string}>());const settings=JSON.parse(config?.payload||'{}');
    const subtotal=items.reduce((sum,i)=>sum+i.price*i.quantity,0);const shipping_fee=subtotal>=(settings.free_shipping_threshold||250000)?0:(settings.shipping_fee||15000);
    record={...record,items,subtotal,shipping_fee,total:subtotal+shipping_fee,status:'New',order_number:'HSL-'+crypto.randomUUID().slice(0,8).toUpperCase()};
  }
  await db.prepare('INSERT OR REPLACE INTO records(entity,id,payload) VALUES(?,?,?)').bind(entity,record.id,JSON.stringify(record)).run();
  return Response.json(record);
}
