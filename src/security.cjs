const crypto=require('node:crypto');
const {HttpError}=require('./errors.cjs');
const sessions=new Map(),failed=new Map();
const TTL_MS=15*60*1000,MAX_FAILURES=5,WINDOW_MS=60*1000;
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
function equalSecret(a,b){
 const aa=crypto.createHash('sha256').update(a).digest();
 const bb=crypto.createHash('sha256').update(b).digest();
 return crypto.timingSafeEqual(aa,bb);
}
function verifyPassword(password,salt,expectedHex){
 const actual=crypto.scryptSync(password,salt,64);
 const expected=Buffer.from(expectedHex,'hex');
 return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function readConfig(){
 for(const name of ['API_KEY','ADMIN_PASSWORD','READER_PASSWORD'])
   if(!process.env[name]||process.env[name].length<12||process.env[name].startsWith('ISI_'))
     throw new Error(`${name} harus diisi rahasia latihan unik minimal 12 karakter di .env (jalankan npm run setup)`);
 return {apiKey:process.env.API_KEY,users:[
  {username:'admin',role:'admin',password:process.env.ADMIN_PASSWORD},
  {username:'pembaca',role:'reader',password:process.env.READER_PASSWORD}
 ].map(u=>{const salt=crypto.randomBytes(16).toString('hex');return {username:u.username,role:u.role,salt,hash:crypto.scryptSync(u.password,salt,64).toString('hex')};})};
}
const config=readConfig();
function requireApiKey(req,res,next){
 const v=req.get('x-api-key');
 if(!v||!equalSecret(v,config.apiKey))throw new HttpError(401,'INVALID_API_KEY','API key tidak valid.');
 next();
}
function login(req,res){
 const {username,password}=req.body||{};
 if(typeof username!=='string'||typeof password!=='string')throw new HttpError(400,'INVALID_LOGIN','Username dan password wajib berupa teks.');
 const key=req.ip||'local',attempt=failed.get(key);
 if(attempt&&attempt.until>Date.now()&&attempt.count>=MAX_FAILURES)
   throw new HttpError(429,'TOO_MANY_ATTEMPTS','Terlalu banyak percobaan login.');
 const user=config.users.find(u=>u.username===username);
 const salt=user?user.salt:'00000000000000000000000000000000';
 const hash=user?user.hash:crypto.scryptSync('not-the-password',salt,64).toString('hex');
 if(!verifyPassword(password,salt,hash)||!user){
   const prev=failed.get(key),count=prev&&prev.until>Date.now()?prev.count+1:1;
   failed.set(key,{count,until:Date.now()+WINDOW_MS});
   throw new HttpError(401,'INVALID_CREDENTIALS','Kredensial tidak valid.');
 }
 failed.delete(key);
 const token=crypto.randomBytes(32).toString('hex');
 sessions.set(digest(token),{username:user.username,role:user.role,expiresAt:Date.now()+TTL_MS});
 res.set('Cache-Control','no-store');
 res.json({success:true,data:{access_token:token,token_type:'Bearer',expires_in:TTL_MS/1000,role:user.role}});
}
function requireToken(req,res,next){
 const match=/^Bearer ([a-f0-9]{64})$/i.exec(req.get('Authorization')||'');
 if(!match){res.set('WWW-Authenticate','Bearer');throw new HttpError(401,'TOKEN_REQUIRED','Bearer token wajib dikirim.');}
 const hash=digest(match[1]),session=sessions.get(hash);
 if(!session||session.expiresAt<=Date.now()){
   if(session)sessions.delete(hash);
   res.set('WWW-Authenticate','Bearer error="invalid_token"');
   throw new HttpError(401,'INVALID_TOKEN','Token salah atau kedaluwarsa.');
 }
 req.user={username:session.username,role:session.role};req.tokenHash=hash;next();
}
function requireRole(role){return(req,res,next)=>{
 if(req.user?.role!==role)throw new HttpError(403,'FORBIDDEN','Peran pengguna tidak diizinkan.');
 next();
};}
function logout(req,res){sessions.delete(req.tokenHash);res.status(204).end();}
module.exports={requireApiKey,login,requireToken,requireRole,logout};
