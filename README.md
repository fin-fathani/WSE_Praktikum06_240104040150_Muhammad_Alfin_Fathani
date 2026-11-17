# AL-FATHANI · Library Security

Praktikum 06 Web Service Engineering — Keamanan Dasar Web Service. Proyek studi kasus **Katalog Buku Perpustakaan Kampus**, dengan desain dashboard tambahan gradasi kuning Al-Fathani. Backend mengikuti konsep modul: Node.js 24.x, Express 5.3.0, Swagger UI Express 5.0.1, API key, scrypt, Bearer token opaque 15 menit, RBAC, validasi dan HTTPS lokal.

> **KHUSUS LAB KOMPUTER SENDIRI**. Server berjalan di `127.0.0.1:3443`. Akun demo, sesi dan buku di memori; tidak siap untuk hosting internet atau produksi. Sertifikat self-signed berlaku 7 hari.

## 1. Prasyarat (Windows 10/11)

- Node.js 24.x (contoh komputer: 24.21.0)
- npm 11.x, boleh memakai `npm.cmd` bila PowerShell memblokir `npm.ps1`
- Git for Windows yang mempunyai OpenSSL di `C:\Program Files\Git\usr\bin\openssl.exe`
- VS Code dan internet untuk **instalasi pertama** dependency npm.

## 2. Cara paling mudah (VS Code → Terminal → PowerShell)

Buka **folder proyek hasil ekstraksi** di VS Code. Jalankan satu per satu:

```powershell
npm.cmd install
npm.cmd run setup
npm.cmd run docs
npm.cmd run check
npm.cmd start
```

`npm.cmd run setup` otomatis membuat file `.env` berisi tiga nilai acak **khusus komputer lokal** dan sertifikat TLS localhost, tanpa mencetak rahasia. Jika sudah ada, tidak akan ditimpa. Untuk tugas kampus, nilai rahasia tidak disimpan dalam ZIP atau GitHub.

Saat server aktif, buka:

- **Tampilan Al-Fathani:** `https://localhost:3443/`
- **Swagger UI:** `https://localhost:3443/docs`
- **Health endpoint:** `https://localhost:3443/health`

**Peringatan sertifikat browser:** Sertifikat latihan self-signed tidak dipercaya otomatis. Jangan menonaktifkan perlindungan TLS global. Untuk melihat dashboard di browser, percayai sertifikat localhost **hanya dalam lingkungan lab** sesuai kebijakan Windows/lab, lalu hapus trust setelah praktikum. Untuk pengujian otomatis, lakukan prosedur Node di langkah 3. Sertifikat jangan digunakan untuk situs lain.

### Melihat nilai latihan untuk login (tanpa screenshot)

Buka `.env` di VS Code pada komputer sendiri dan gunakan nilainya:

- `API_KEY` → input *API key* pada halaman login
- `ADMIN_PASSWORD` → login `admin`
- `READER_PASSWORD` → login `pembaca`

**Jangan mengirim isi .env, password, API key, access token, atau private key kepada siapa pun / dalam screenshot laporan.** Bila rekaman layar diperlukan, sembunyikan field rahasia.

## 3. Pengujian otomatis dari terminal kedua

Server harus tetap aktif pada terminal pertama. Di terminal kedua, dari akar proyek:

```powershell
$env:NODE_EXTRA_CA_CERTS = (Resolve-Path '.\certs\localhost.crt').Path
npm.cmd run testapi
```

Variabel ini hanya memercayai sertifikat untuk proses Node yang dijalankan dari terminal tersebut. **Jangan gunakan `NODE_TLS_REJECT_UNAUTHORIZED=0`**. Pengujian menghasilkan ringkasan PASS/FAIL dan file `hasil-uji/matriks-aktual.json` (berisi kode status, tidak berisi token). Skrip dasar mengecek 20 kondisi; kasus 429 dapat diuji manual paling akhir sesuai modul.

Alternatif: jalankan `scripts\test-windows.cmd` dari File Explorer jika pengguna memakai CMD.

## 4. Pemeriksaan manual terpilih

1. Tanpa token, `GET /api/buku` → 401 `TOKEN_REQUIRED`.
2. Reader login, kemudian `GET /api/buku` → 200.
3. Reader mencoba `POST /api/buku` → 403 `FORBIDDEN`; data tidak bertambah.
4. Admin login dan `POST /api/buku` → 201, Location berisi ID baru.
5. Admin `PUT` / `DELETE` ID baru → 200 / 204.
6. Input `tersedia` berupa string → 400 `INVALID_BOOK`.
7. Logout admin, token lama tidak dapat dipakai lagi → 401 `INVALID_TOKEN`.
8. Swagger menampilkan `ClientApiKey` dan `BearerAuth` tanpa menyimpan token di halaman.

**Catatan penting:** Swagger UI memerlukan token untuk operasi katalog. Hindari menyertakan token dalam screenshot. Jika browser tidak mempercayai sertifikat lokal, pengujian dari Node client yang memercayai CA adalah alternatif resmi pada modul.

## 5. Susunan proyek

```text
praktikum06-keamanan-api/
  app.cjs                 # Middleware Express & endpoint
  server.cjs              # HTTPS localhost:3443
  client.cjs              # Uji otomatis status HTTP, tanpa cetak rahasia
  src/errors.cjs          # Validasi ID/JSON buku, HttpError
  src/books.cjs           # CRUD buku in-memory
  src/security.cjs        # API key, scrypt, token & RBAC
  scripts/setup-local.cjs # Generator rahasia & sertifikat lokal
  scripts/generate-openapi.cjs
  scripts/check-syntax.cjs
  scripts/start-windows.cmd
  scripts/test-windows.cmd
  docs/openapi.json       # OpenAPI 3.1.0 terbuat otomatis
  public/index.html      # Dashboard Al-Fathani
  public/style.css       # Gradasi kuning emas
  public/app.js          # Katalog UI/login berbasis API
  samples/               # Payload contoh TANPA kredensial asli
  .env.example, .gitignore, package.json
  certs/                 # Sertifikat dihasilkan LOKAL, jangan kumpulkan
  hasil-uji/             # Dibuat setelah tes dijalankan
```

**Perhatian package-lock.json:** lingkungan pembuat arsip ini tidak memiliki koneksi npm registry. Karena itu `package-lock.json` **belum dibuat** dan tidak disertakan untuk menghindari lock palsu. Setelah perintah `npm.cmd install` berhasil di komputer Anda, lockfile asli akan tercipta. **Sertakan package-lock.json hasil instalasi tersebut saat pengumpulan.** Pada instalasi berikutnya gunakan `npm.cmd ci`.

## 6. Reproduksi dari komputer lain

Ekstrak ZIP, jalankan `npm.cmd install` (atau `npm.cmd ci` bila package-lock telah tersedia), `npm.cmd run setup`, `npm.cmd run docs`, `npm.cmd start`, lalu uji dengan terminal kedua. Hapus `.env` dan sertifikat lama bila perlu menghasilkan ulang kredensial dan TLS khusus mesin berbeda; jangan hapus keduanya ketika server sedang aktif.

## 7. Batasan keamanan

Aplikasi memakai login latihan statis (password unik dari `.env`), hashing scrypt di proses, token opaque acak yang disimpan sebagai hash, dan session TTL 15 menit. Tidak ada database, MFA, rotasi secret terkelola, distributed rate limiting, logging audit produksi, sertifikat publik, atau keamanan untuk deployment internet. Restart server akan menghilangkan buku baru dan seluruh sesi. UI merupakan tambahan visual; otorisasi wajib tetap pada middleware server.

## 8. Checklist bukti screenshot utama

1. Versi Node, npm, OpenSSL (jangan menampilkan rahasia).
2. Server HTTPS lokal di terminal.
3. Beranda dashboard AL-FATHANI.
4. Login role pembaca & katalog tampil.
5. Reader POST ditolak 403 (Swagger/Postman dengan token disembunyikan).
6. Admin POST berhasil 201 (token disembunyikan).
7. Ringkasan tes PASS/FAIL dari `npm.cmd run testapi`.
8. Swagger UI dengan endpoint dan security schemes.

Modul meminta **matriks sedikitnya 15 skenario**; penuhi dengan hasil pengujian aktual, bukan dengan mengarang. Screenshot terpilih tidak harus sebanyak kasus pengujian.

**Identitas laporan:** kelas TI24A, dosen Muhayat, M.IT. Format nama berkas `WSE_Praktikum06_NIM_Nama` (isi NIM dan nama sesuai data akademik).
