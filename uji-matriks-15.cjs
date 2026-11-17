'use strict';
// Pengujian matriks Modul Praktikum 06 WSE. Hanya untuk server lokal Al-Fathani.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const BASE = 'https://localhost:3443';
const results = [];
const body = (value) => JSON.stringify(value);
const jsonHeaders = { 'Content-Type': 'application/json' };
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function request(method, route, { headers = {}, payload, rawBody } = {}) {
  const response = await fetch(BASE + route, {
    method,
    headers,
    ...(rawBody !== undefined ? { body: rawBody } : payload !== undefined ? { body: body(payload) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const type = response.headers.get('content-type') || '';
  const output = type.includes('json') ? await response.json() : await response.text();
  return { status: response.status, code: output?.error?.code || '-', output };
}
function record(no, name, expectStatus, actual, expectedCode) {
  const ok = actual.status === expectStatus && (!expectedCode || actual.code === expectedCode);
  results.push({ no, skenario: name, expected: expectStatus, actual: actual.status, error_code: actual.code, hasil: ok ? 'PASS' : 'FAIL' });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${String(no).padStart(2,'0')} ${name.padEnd(36)} expected=${expectStatus} actual=${actual.status} code=${actual.code}`);
}
async function login(username, password, apiKey = process.env.API_KEY) {
  return request('POST', '/auth/login', {
    headers: { ...jsonHeaders, 'x-api-key': apiKey },
    payload: { username, password },
  });
}
const expectToken = (result, role) => {
  const t = result.output?.data?.access_token;
  if (result.status !== 200 || typeof t !== 'string') throw new Error(`Tidak dapat login ${role} (HTTP ${result.status}); periksa .env`);
  return t;
};
async function run() {
  if (!process.env.API_KEY || !process.env.ADMIN_PASSWORD || !process.env.READER_PASSWORD) {
    throw new Error('Jalankan dari folder proyek dengan node --env-file=.env');
  }
  // Siapkan akun sah sebelum tes login gagal, agar batas login tidak menghalangi pengujian utama.
  const readerToken = expectToken(await login('pembaca', process.env.READER_PASSWORD), 'pembaca');
  const adminToken = expectToken(await login('admin', process.env.ADMIN_PASSWORD), 'admin');
  const reader = bearer(readerToken), admin = bearer(adminToken);

  record(1, 'GET buku tanpa token', 401, await request('GET', '/api/buku'), 'TOKEN_REQUIRED');
  record(2, 'Login API key salah', 401, await login('admin', process.env.ADMIN_PASSWORD, 'invalid-test-key'), 'INVALID_API_KEY');
  record(3, 'Login password salah', 401, await login('admin', 'password-tidak-cocok'), 'INVALID_CREDENTIALS');
  record(5, 'Reader POST ditolak', 403, await request('POST', '/api/buku', { headers: { ...reader, ...jsonHeaders }, payload: { judul: 'Dilarang untuk Reader', tersedia: true } }), 'FORBIDDEN');
  record(6, 'Admin input tersedia string', 400, await request('POST', '/api/buku', { headers: { ...admin, ...jsonHeaders }, payload: { judul: 'Input Salah', tersedia: 'true' } }), 'INVALID_BOOK');
  record(7, 'GET ID abc tidak valid', 400, await request('GET', '/api/buku/abc', { headers: reader }), 'INVALID_ID');
  record(8, 'GET buku 999 tidak ada', 404, await request('GET', '/api/buku/999', { headers: reader }), 'BOOK_NOT_FOUND');
  record(9, 'Token acak tidak valid', 401, await request('GET', '/api/buku', { headers: bearer(crypto.randomBytes(32).toString('hex')) }), 'INVALID_TOKEN');
  record(11, 'POST text/plain ditolak', 415, await request('POST', '/api/buku', { headers: { ...admin, 'Content-Type': 'text/plain' }, rawBody: 'bukan JSON' }), 'UNSUPPORTED_MEDIA_TYPE');
  record(12, 'POST body lebih dari 10kb', 413, await request('POST', '/api/buku', { headers: { ...admin, ...jsonHeaders }, payload: { judul: 'A'.repeat(12000), tersedia: true } }), 'PAYLOAD_TOO_LARGE');
  record(13, 'GET health', 200, await request('GET', '/health'));
  record(14, 'GET OpenAPI JSON', 200, await request('GET', '/openapi.json'));
  record(15, 'GET Swagger docs', 200, await request('GET', '/docs/'));
  const logout = await request('POST', '/auth/logout', { headers: admin });
  if (logout.status !== 204) console.log(`Peringatan: logout admin menghasilkan HTTP ${logout.status}`);
  record(10, 'Token setelah logout ditolak', 401, await request('GET', '/api/buku', { headers: admin }), 'INVALID_TOKEN');

  // Uji rate-limit PALING AKHIR. Lima login salah (401) diikuti percobaan ke-6 (429).
  // Login salah pada skenario 3 dihitung juga; bila masih dalam jendela 60 detik, hasil tetap 429.
  let rateResult;
  for (let i = 0; i < 7; i++) {
    rateResult = await login('admin', `salah-untuk-rate-test-${i}`);
    if (rateResult.status === 429) break;
  }
  record(4, 'Login dibatasi (HTTP 429)', 429, rateResult, 'TOO_MANY_ATTEMPTS');

  // Urutan tabel kembali ke 01-15.
  results.sort((a,b) => a.no-b.no);
  const csvValue = x => `"${String(x).replace(/"/g,'""')}"`;
  const csv = ['No,Skenario,Status Harapan,Status Aktual,Error Code,Hasil', ...results.map(r=>[r.no,r.skenario,r.expected,r.actual,r.error_code,r.hasil].map(csvValue).join(','))].join('\r\n')+'\r\n';
  const outputDir = path.join(process.cwd(), 'hasil-uji');
  fs.mkdirSync(outputDir,{recursive:true});
  const file = path.join(outputDir, 'matriks_15_pengujian.csv');
  fs.writeFileSync(file, csv, 'utf8');
  const pass=results.filter(r=>r.hasil==='PASS').length;
  console.log(`\nHASIL MATRIKS: ${pass}/15 PASS, ${15-pass} FAIL`);
  console.log(`Tabel tersimpan: ${file}`);
  console.log('Catatan: status tercatat berdasarkan respons aktual. Token, API key, dan password tidak dicetak.');
  if(pass!==15)process.exitCode=1;
}
run().catch(e=>{console.error('Pengujian terhenti:',e.message);process.exitCode=1;});
