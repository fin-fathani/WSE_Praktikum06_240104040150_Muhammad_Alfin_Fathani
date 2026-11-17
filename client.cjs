// Uji otomatis yang tidak pernah mencetak kredensial atau token.
const BASE='https://localhost:3443';
const checks=[];
async function send(method,path,body,headers={}){
 const response=await fetch(BASE+path,{method,headers:{Accept:'application/json',...headers,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
 const raw=await response.text();let payload=null;
 if(raw){try{payload=JSON.parse(raw);}catch{}}
 return {status:response.status,payload,location:response.headers.get('location')};
}
function record(label,got,expected){const pass=got===expected;checks.push({label,got,expected,pass});console.log(`${pass?'PASS':'FAIL'} ${label}: ${got} (harapan ${expected})`);}
async function login(username,password){return send('POST','/auth/login',{username,password},{'x-api-key':process.env.API_KEY});}
async function main(){
 record('01 Health', (await send('GET','/health')).status,200);
 record('02 GET tanpa token',(await send('GET','/api/buku')).status,401);
 record('03 API key salah',(await send('POST','/auth/login',{username:'admin',password:process.env.ADMIN_PASSWORD},{'x-api-key':'salah'})).status,401);
 record('04 Login password salah',(await login('admin','password-palsu')).status,401);
 const reader=await login('pembaca',process.env.READER_PASSWORD);
 record('05 Login pembaca',reader.status,200);
 if(reader.status!==200)throw Error('Login pembaca gagal');
 const r={Authorization:`Bearer ${reader.payload.data.access_token}`};
 record('06 Pembaca GET buku',(await send('GET','/api/buku',undefined,r)).status,200);
 record('07 Pembaca POST ditolak',(await send('POST','/api/buku',{judul:'Dilarang',tersedia:true},r)).status,403);
 record('08 Pembaca PUT ditolak',(await send('PUT','/api/buku/1',{judul:'Dilarang',tersedia:true},r)).status,403);
 record('09 Pembaca DELETE ditolak',(await send('DELETE','/api/buku/1',undefined,r)).status,403);
 record('10 ID invalid',(await send('GET','/api/buku/abc',undefined,r)).status,400);
 record('11 Buku tidak ada',(await send('GET','/api/buku/999',undefined,r)).status,404);
 const admin=await login('admin',process.env.ADMIN_PASSWORD);
 record('12 Login admin',admin.status,200);
 if(admin.status!==200)throw Error('Login admin gagal');
 const a={Authorization:`Bearer ${admin.payload.data.access_token}`};
 const made=await send('POST','/api/buku',{judul:'Keamanan API Dasar',tersedia:true},a);
 record('13 Admin POST buku',made.status,201);
 if(made.status===201){
  const id=made.payload.data.id;
  record('14 Header Location',made.location,`/api/buku/${id}`);
  record('15 Admin PUT buku',(await send('PUT',`/api/buku/${id}`,{judul:'Keamanan API Diperbarui',tersedia:false},a)).status,200);
  record('16 Admin DELETE buku',(await send('DELETE',`/api/buku/${id}`,undefined,a)).status,204);
 }
 record('17 Validasi tipe',(await send('POST','/api/buku',{judul:'Tidak valid',tersedia:'true'},a)).status,400);
 record('18 OpenAPI',(await send('GET','/openapi.json')).status,200);
 record('19 Logout admin',(await send('POST','/auth/logout',undefined,a)).status,204);
 record('20 Token dicabut',(await send('GET','/api/buku',undefined,a)).status,401);
 console.log(`HASIL: ${checks.filter(x=>x.pass).length}/${checks.length} lulus`);
 const fs=require('node:fs');fs.mkdirSync('hasil-uji',{recursive:true});
 fs.writeFileSync('hasil-uji/matriks-aktual.json',JSON.stringify({testedAt:new Date().toISOString(),results:checks},null,2)+'\n');
 if(checks.some(x=>!x.pass))process.exitCode=1;
}
main().catch(e=>{console.error('GAGAL:',e.message);process.exitCode=1;});
