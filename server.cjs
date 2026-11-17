const fs=require('node:fs');
const https=require('node:https');
const path=require('node:path');
const app=require('./app.cjs');
const PORT=3443,cert=path.join(__dirname,'certs','localhost.crt'),key=path.join(__dirname,'certs','localhost.key');
if(!fs.existsSync(cert)||!fs.existsSync(key)){
 console.error('Sertifikat TLS belum ada. Jalankan npm run setup atau lihat README.md');process.exit(1);
}
https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},app)
 .listen(PORT,'127.0.0.1',()=>{
  console.log('AL-FATHANI | HTTPS lokal: https://localhost:'+PORT);
  console.log('Dashboard: https://localhost:'+PORT+'/');
  console.log('Swagger: https://localhost:'+PORT+'/docs');
  console.log('Server hanya mendengarkan pada 127.0.0.1 (latihan lokal).');
 });
