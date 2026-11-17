const fs=require('node:fs');
const response=description=>({description});
const errors=Object.fromEntries([['400','Input tidak valid'],['401','Tidak terautentikasi'],['403','Tidak memiliki izin'],['404','Buku tidak ditemukan'],['413','Body terlalu besar'],['415','Tipe body tidak didukung'],['429','Terlalu banyak percobaan'],['500','Kesalahan internal']].map(([status,label])=>[status,response(label)]));
const book={type:'object',required:['id','judul','tersedia'],properties:{id:{type:'integer',example:1},judul:{type:'string',example:'Dasar Web Service'},tersedia:{type:'boolean',example:true}}};
const input={type:'object',additionalProperties:false,required:['judul','tersedia'],properties:{judul:{type:'string',minLength:1,maxLength:120},tersedia:{type:'boolean'}}};
const jsonInput=schema=>({required:true,content:{'application/json':{schema}}});
const params=[{name:'id',in:'path',required:true,schema:{type:'integer',minimum:1}}];
const doc={openapi:'3.1.0',info:{title:'Al-Fathani | Katalog Perpustakaan Praktikum 06',version:'1.0.0',description:'API pembelajaran lokal: API key, Bearer token opaque, scrypt, RBAC, dan TLS lokal. Bukan sistem produksi.'},servers:[{url:'https://localhost:3443',description:'HTTPS lokal; sertifikat harus dipercaya oleh client'}],components:{securitySchemes:{ClientApiKey:{type:'apiKey',in:'header',name:'x-api-key'},BearerAuth:{type:'http',scheme:'bearer',bearerFormat:'opaque'}},schemas:{Book:book,BookInput:input}},paths:{
 '/health':{get:{summary:'Memeriksa server',responses:{'200':response('Sehat')}}},
 '/auth/login':{post:{summary:'Login dan memperoleh Bearer token',security:[{ClientApiKey:[]}],requestBody:jsonInput({type:'object',required:['username','password'],properties:{username:{type:'string'},password:{type:'string',format:'password'}}}),responses:{'200':response('Token diterbitkan'),'400':errors[400],'401':errors[401],'429':errors[429]}}},
 '/auth/logout':{post:{summary:'Mencabut token sesi',security:[{BearerAuth:[]}],responses:{'204':response('Token dicabut'),'401':errors[401]}}},
 '/api/buku':{
 get:{summary:'Daftar buku (reader/admin)',security:[{BearerAuth:[]}],parameters:[{name:'q',in:'query',schema:{type:'string',maxLength:80}}],responses:{'200':response('Daftar buku'),'400':errors[400],'401':errors[401]}},
 post:{summary:'Tambah buku (admin)',security:[{BearerAuth:[]}],requestBody:jsonInput(input),responses:{'201':response('Buku dibuat; header Location'),'400':errors[400],'401':errors[401],'403':errors[403],'413':errors[413],'415':errors[415]}}},
 '/api/buku/{id}':{
 get:{summary:'Detail buku (reader/admin)',security:[{BearerAuth:[]}],parameters:params,responses:{'200':response('Detail'),'400':errors[400],'401':errors[401],'404':errors[404]}},
 put:{summary:'Ganti buku (admin)',security:[{BearerAuth:[]}],parameters:params,requestBody:jsonInput(input),responses:{'200':response('Diperbarui'),'400':errors[400],'401':errors[401],'403':errors[403],'404':errors[404],'413':errors[413],'415':errors[415]}},
 delete:{summary:'Hapus buku (admin)',security:[{BearerAuth:[]}],parameters:params,responses:{'204':response('Terhapus'),'400':errors[400],'401':errors[401],'403':errors[403],'404':errors[404]}}
 }}};
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/openapi.json',JSON.stringify(doc,null,2)+'\n');
console.log('Dokumentasi tersimpan: docs/openapi.json');
