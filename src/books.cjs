const {HttpError,validateBook}=require('./errors.cjs');
let books=[
 {id:1,judul:'Dasar Pemrograman Kotlin',tersedia:true},
 {id:2,judul:'Dasar Web Service',tersedia:false},
 {id:3,judul:'Keamanan API dan TLS',tersedia:true},
 {id:4,judul:'Arsitektur Enterprise',tersedia:true}
];
let nextId=5;
function detail(id) {
 const book=books.find(b=>b.id===id);
 if (!book) throw new HttpError(404,'BOOK_NOT_FOUND','Buku tidak ditemukan.');
 return book;
}
module.exports={
 list(q){
   if(q!==undefined&&(typeof q!=='string'||q.length>80))
     throw new HttpError(400,'INVALID_QUERY','q harus satu teks maksimal 80 karakter.');
   const keyword=(q||'').trim().toLowerCase();
   return books.filter(b=>b.judul.toLowerCase().includes(keyword));
 },detail,
 create(input){const b={id:nextId++,...validateBook(input)};books.push(b);return b;},
 replace(id,input){const valid=validateBook(input);detail(id);const i=books.findIndex(b=>b.id===id);books[i]={id,...valid};return books[i];},
 remove(id){detail(id);books=books.filter(b=>b.id!==id);}
};
