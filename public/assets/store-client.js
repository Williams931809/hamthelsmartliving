async function request(path, options={}) {
 const response=await fetch(path,{credentials:'same-origin',...options});
 const data=await response.json();if(!response.ok){const error=new Error(data.message||'Unable to complete request');error.status=response.status;throw error}return data;
}
const call=(entity,action,args)=>request('/api/store/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity,action,args})});
const signIn=()=>{const returnTo=location.pathname.startsWith('/admin')?location.pathname:'/admin';location.assign('/signin-with-chatgpt?return_to='+encodeURIComponent(returnTo))};
window.hslClient={
 entities:new Proxy({}, {get:(_,entity)=>new Proxy({}, {get:(_,action)=>(...args)=>call(entity,action,args)})}),
 app:{getPublicSettings:async()=>({name:'Hamthel Smart Living',is_public:true})},
 auth:{me:async()=>{const u=await request('/api/store/me');if(!u.id&&location.pathname.startsWith('/admin')){const e=new Error('Sign in to continue');e.status=401;throw e}return u},redirectToLogin:signIn,loginWithProvider:signIn,logout:()=>location.assign('/signout-with-chatgpt?return_to=/'),setToken:()=>{},isAuthenticated:async()=>{try{return !!(await request('/api/store/me')).id}catch{return false}}},
 functions:{invoke:async(name,{message})=>{
  if(name!=='storeAssistant')throw new Error('Unknown function');
  const {items}=await call('Product','filter',[{published:true},{limit:300}]);
  const words=message.toLowerCase().split(/\W+/).filter(w=>w.length>2&&!['the','and','for','with','have','want','what','your','you','can','show'].includes(w));
  const ranked=items.map(p=>({p,score:words.reduce((n,w)=>n+((p.name+' '+p.category+' '+p.short_description).toLowerCase().includes(w)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  const reply=ranked.length?'From the current catalogue:\n\n'+ranked.map(({p})=>p.name+' — ₦'+Number(p.price).toLocaleString('en-NG')+'\n'+p.short_description+'\n'+location.origin+'/product/'+p.slug).join('\n\n')+'\n\nThis helper searches product text. For door measurements or installation advice, contact the Hamthel team.':'Tell me a product name, brand or category, such as Tenon A9X, smart cameras or fingerprint locks. For personalised door advice, use the WhatsApp support button.';
  return {data:{reply}};
 }},
 integrations:{Core:{UploadPublicFile:async({file})=>request('/api/store/upload',{method:'POST',headers:{'Content-Type':file.type},body:file}),UploadPrivateFile:async()=>{alert('Please send door photos to the Hamthel team using the WhatsApp support button.');return {file_uri:''}}}},
 analytics:{track:()=>{}},appLogs:{logUserInApp:async()=>{}},cleanup:()=>{}
};

window.hslDownloadOrder = (order) => {
 const money=n=>'NGN '+Number(n).toLocaleString('en-NG');
 const text=['HAMTHEL SMART LIVING','ORDER ACKNOWLEDGEMENT',order.order_number,'Received: '+new Date(order.created_date).toLocaleString(),'',...order.items.map(i=>i.quantity+' x '+i.name+' — '+money(i.price*i.quantity)),'','Subtotal: '+money(order.subtotal),'Delivery: '+money(order.shipping_fee),'Total: '+money(order.total),'','Customer: '+order.customer_name,'Phone: '+order.phone,'Delivery: '+[order.address,order.city,order.state].join(', '),'Payment method: '+order.payment_method,'','Payment has not been collected online. The team will confirm stock, payment and dispatch.'].join('\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=order.order_number+'-summary.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
