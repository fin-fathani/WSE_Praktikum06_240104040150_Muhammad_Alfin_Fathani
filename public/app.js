/* UI tambahan Al-Fathani; kebijakan akses tetap ditegakkan API server. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let token=null,role=null,books=[];
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3200);}
async function api(path,options={}){
 const headers={...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})};
 const response=await fetch(path,{...options,headers:{...headers,...(options.headers||{})},cache:'no-store'});
 let data=null;const raw=await response.text();if(raw){try{data=JSON.parse(raw);}catch{}}
 if(!response.ok){const e=new Error(data?.error?.message||`HTTP ${response.status}`);e.status=response.status;e.code=data?.error?.code;throw e;}
 return data;
}
function show(view){
 for(const v of ['overview','catalog','security'])$('view-'+v).classList.toggle('hidden',v!==view);
 document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
 $('crumb-label').textContent={overview:'Overview',catalog:'Koleksi buku',security:'Security center'}[view];
 if(view==='catalog')renderBooks();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.open)));
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderBooks(){
 const keyword=$('search-books').value.trim().toLowerCase();const filtered=books.filter(b=>b.judul.toLowerCase().includes(keyword));
 $('catalog-count').textContent=`${filtered.length} buku`;
 const rows=$('book-rows');rows.replaceChildren();
 if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.className='empty';td.textContent='Belum ada buku yang cocok.';tr.append(td);rows.append(tr);return;}
 for(const book of filtered){
  const tr=document.createElement('tr');
  tr.innerHTML=`<td>#${book.id}</td><td><b>${escapeHTML(book.judul)}</b></td><td><span class="status ${book.tersedia?'':'unavailable'}">${book.tersedia?'Tersedia':'Dipinjam'}</span></td><td></td>`;
  if(role==='admin'){
   const edit=document.createElement('button');edit.className='mini-btn';edit.textContent='Edit';edit.addEventListener('click',()=>openBook(book));
   const del=document.createElement('button');del.className='mini-btn';del.textContent='Hapus';del.addEventListener('click',()=>removeBook(book));
   tr.lastElementChild.append(edit,del);
  }else tr.lastElementChild.textContent='Lihat saja';
  rows.append(tr);
 }
}
function refreshOverview(){
 $('stat-total').textContent=books.length;$('stat-available').textContent=books.filter(b=>b.tersedia).length;
 $('stat-role').textContent=role==='admin'?'Admin':role==='reader'?'Reader':'Guest';
 const target=$('preview-books');target.replaceChildren();
 for(const book of books.slice(0,3)){
  const el=document.createElement('div');el.className='preview-book';
  el.innerHTML=`<div class="book-graphic">A</div><div><b>${escapeHTML(book.judul)}</b><small>Koleksi #${book.id}</small></div><span class="status ${book.tersedia?'':'unavailable'}">${book.tersedia?'Tersedia':'Dipinjam'}</span>`;
  target.append(el);
 }
}
async function loadBooks(){const result=await api('/api/buku');books=result.data;refreshOverview();renderBooks();}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();$('login-error').textContent='';
 const username=$('username').value,password=$('password').value,key=$('api-key').value;
 const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;button.textContent='Memeriksa identitas...';
 try{
  const result=await api('/auth/login',{method:'POST',headers:{'x-api-key':key},body:JSON.stringify({username,password})});
  token=result.data.access_token;role=result.data.role;
  $('password').value='';$('api-key').value='';$('login-modal').classList.add('hidden');
  $('add-book').hidden=role!=='admin';
  await loadBooks();toast('Login berhasil. Role: '+role);
 }catch(err){$('login-error').textContent=err.message;if(token){token=null;role=null;$('login-modal').classList.remove('hidden');}}
 finally{button.disabled=false;button.textContent='Masuk ke dashboard →';}
});
$('search-books').addEventListener('input',renderBooks);
function openBook(book){$('book-id').value=book?.id||'';$('book-title').value=book?.judul||'';$('book-available').value=String(book?.tersedia??true);$('book-modal-title').textContent=book?'Edit buku':'Tambah buku';$('book-error').textContent='';$('book-modal').classList.remove('hidden');$('book-title').focus();}
$('add-book').addEventListener('click',()=>openBook());$('close-book').addEventListener('click',()=>$('book-modal').classList.add('hidden'));
$('book-form').addEventListener('submit',async e=>{
 e.preventDefault();$('book-error').textContent='';const id=$('book-id').value;
 try{await api(id?`/api/buku/${id}`:'/api/buku',{method:id?'PUT':'POST',body:JSON.stringify({judul:$('book-title').value,tersedia:$('book-available').value==='true'})});$('book-modal').classList.add('hidden');await loadBooks();toast(id?'Buku berhasil diperbarui.':'Buku berhasil ditambahkan.');}
 catch(err){$('book-error').textContent=err.message;}
});
async function removeBook(book){if(!confirm(`Hapus buku "${book.judul}"?`))return;try{await api(`/api/buku/${book.id}`,{method:'DELETE'});await loadBooks();toast('Buku berhasil dihapus.');}catch(err){toast(err.message);}}
// Token hanya berada di variabel memori tab ini; refresh meminta login ulang.
// Deteksi sesi kedaluwarsa melalui API saat pembaruan atau refresh.
})();
