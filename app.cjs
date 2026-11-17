const express=require('express');
const swaggerUi=require('swagger-ui-express');
const fs=require('node:fs');
const path=require('node:path');
const books=require('./src/books.cjs');
const {HttpError,parseId}=require('./src/errors.cjs');
const security=require('./src/security.cjs');
const app=express();
app.disable('x-powered-by');
app.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');next();});
app.use(express.json({limit:'10kb'}));
function jsonOnly(req,res,next){if(!req.is('application/json'))throw new HttpError(415,'UNSUPPORTED_MEDIA_TYPE','Gunakan application/json.');next();}
app.get('/health',(req,res)=>res.json({status:'ok',app:'Al-Fathani Library Security'}));
app.post('/auth/login',security.requireApiKey,jsonOnly,security.login);
app.post('/auth/logout',security.requireToken,security.logout);
const router=express.Router();
router.use(security.requireToken);
router.param('id',(req,res,next,value)=>{req.bookId=parseId(value);next();});
router.get('/',(req,res)=>res.json({success:true,data:books.list(req.query.q)}));
router.get('/:id',(req,res)=>res.json({success:true,data:books.detail(req.bookId)}));
router.post('/',security.requireRole('admin'),jsonOnly,(req,res)=>{
 const item=books.create(req.body);res.location(`/api/buku/${item.id}`).status(201).json({success:true,data:item});
});
router.put('/:id',security.requireRole('admin'),jsonOnly,(req,res)=>res.json({success:true,data:books.replace(req.bookId,req.body)}));
router.delete('/:id',security.requireRole('admin'),(req,res)=>{books.remove(req.bookId);res.status(204).end();});
app.use('/api/buku',router);
app.get('/openapi.json',(req,res)=>{
 if(!fs.existsSync('./docs/openapi.json'))throw new HttpError(503,'DOCS_NOT_READY','Jalankan npm run docs.');
 res.type('json').sendFile(path.resolve('docs/openapi.json'));
});
app.use('/docs',swaggerUi.serve,swaggerUi.setup(null,{swaggerOptions:{url:'/openapi.json',validatorUrl:null,persistAuthorization:false}}));
app.use('/assets',express.static(path.join(__dirname,'public'),{index:false,fallthrough:false}));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((req,res)=>res.status(404).json({success:false,error:{code:'ROUTE_NOT_FOUND',message:'Rute tidak ditemukan.'}}));
app.use((err,req,res,next)=>{
 if(res.headersSent)return next(err);
 let status=500,code='INTERNAL_ERROR',message='Terjadi kesalahan internal.';
 if(err instanceof HttpError)({status,code,message}=err);
 else if(err.type==='entity.parse.failed'){status=400;code='INVALID_JSON';message='JSON tidak valid.';}
 else if(err.status===413){status=413;code='PAYLOAD_TOO_LARGE';message='Body melebihi 10kb.';}
 if(status===500)console.error('Kesalahan internal:',err.name);
 res.status(status).json({success:false,error:{code,message}});
});
module.exports=app;
