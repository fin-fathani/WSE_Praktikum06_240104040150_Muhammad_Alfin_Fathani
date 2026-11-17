// Menyiapkan .env dan sertifikat khusus mesin lokal; hanya dijalankan oleh pemilik proyek.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const root=path.join(__dirname,'..');
process.chdir(root);
if(!fs.existsSync('.env')){
 const secret=()=>crypto.randomBytes(24).toString('hex');
 const env=`API_KEY=${secret()}\nADMIN_PASSWORD=${secret()}\nREADER_PASSWORD=${secret()}\n`;
 fs.writeFileSync('.env',env,{mode:0o600,flag:'wx'});
 console.log('Konfigurasi lokal .env berhasil dibuat (nilai rahasia tidak ditampilkan).');
}else console.log('.env sudah ada; tidak ditimpa.');
fs.mkdirSync('certs',{recursive:true});
if(fs.existsSync('certs/localhost.crt')&&fs.existsSync('certs/localhost.key')){
 console.log('Sertifikat sudah ada. Untuk perpanjangan, baca README.');process.exit(0);
}
const candidates=[process.env.OPENSSL_PATH,process.platform==='win32'?'C:\\Program Files\\Git\\usr\\bin\\openssl.exe':null,'openssl'].filter(Boolean);
let openssl;
for(const c of candidates){const r=cp.spawnSync(c,['version'],{encoding:'utf8',windowsHide:true});if(r.status===0){openssl=c;break;}}
if(!openssl){console.error('OpenSSL tidak ditemukan. Pastikan Git for Windows terpasang.');process.exit(1);}
const args=['req','-x509','-newkey','rsa:2048','-sha256','-days','7','-nodes','-keyout','certs/localhost.key','-out','certs/localhost.crt','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'];
const r=cp.spawnSync(openssl,args,{encoding:'utf8',windowsHide:true});
if(r.status!==0){console.error('Pembuatan sertifikat gagal:',r.stderr?.slice(-700));process.exit(1);}
console.log('Sertifikat lokal berhasil dibuat: certs/localhost.crt (7 hari).');
console.log('Simpan .env dan sertifikat hanya di komputermu. Jangan kumpulkan ke ZIP/GitHub.');
