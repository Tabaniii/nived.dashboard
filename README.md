# 🛡️ Nived NFC & QR Smart Reputation Shield (`filter-rating`)

Sistem perutean dinamis (*dynamic routing*), telemetri, dan manajemen reputasi cerdas (*smart reputation shield*) berbasis **NFC (NTAG215)** dan **QR Code** untuk bisnis lokal dan *merchant*.

Aplikasi ini dibangun menggunakan **Next.js 16 (App Router)**, **React 19**, **Supabase (PostgreSQL & Auth)**, **Tailwind CSS v4**, dan **Recharts**.

---

## 📋 Daftar Isi

- [Arsitektur & Cara Kerja](#-arsitektur--cara-kerja)
  - [1. Shield Mode (Proteksi Ulasan)](#1-shield-mode-default---proteksi-ulasan)
  - [2. Direct Mode (Bypass ke Google)](#2-direct-mode-bypass-langsung)
  - [3. Invalid / Inactive Card Fallback](#3-invalid--inactive-card-fallback)
- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Struktur Direktori Proyek](#-struktur-direktori-proyek)
- [Skema Basis Data (Database Schema)](#-skema-basis-data-database-schema)
- [Panduan Instalasi & Pengaturan Lokal](#-panduan-instalasi--pengaturan-lokal)
  - [1. Prasyarat](#1-prasyarat)
  - [2. Clone & Install Dependencies](#2-clone--install-dependencies)
  - [3. Konfigurasi Environment Variables](#3-konfigurasi-environment-variables)
  - [4. Setup Database Supabase](#4-setup-database-supabase)
  - [5. Seed Akun Admin](#5-seed-akun-admin)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Testing & Validasi Kode](#-testing--validasi-kode)
- [Format URL NFC & Google Business Profile Intent](#-format-url-nfc--google-business-profile-intent)
- [Panduan Pemrograman Fisik Kartu NFC (NTAG215)](#-panduan-pemrograman-fisik-kartu-nfc-ntag215)
- [Lisensi & Kontribusi](#-lisensi--kontribusi)

---

## 🧠 Arsitektur & Cara Kerja

Sistem ini menghubungkan interaksi fisik kartu NFC / scan QR meja kasir dengan reputasi online Google Maps melalui dua mode:

```
[ Pelanggan Tap Kartu NFC / Scan QR ]
                 │
                 ▼
       GET /r/[slug] (Perutean Dinamis)
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
[ Shield Active ]     [ Shield Inactive (Direct) ]
      │                     │
      │                     └─► HTTP 307 Langsung ke Google Review Modal
      │
      ├─► Bintang 5 ───────► Redirect ke Google Review Modal
      │
      └─► Bintang 1 - 4 ───► Formulir Masukan Privat (Internal Feedback)
                             └─► Tersimpan aman di DB & opsi chat WhatsApp Merchant
```

### 1. Shield Mode (Default - Proteksi Ulasan)
- Ketika pelanggan melakukan *tap*, halaman penilaian bintang interaktif akan ditampilkan.
- **Rating 5 Bintang:** Pelanggan diarahkan langsung ke Google Business Profile Review Intent link untuk memberikan ulasan publik 5 bintang.
- **Rating 1–4 Bintang:** Pelanggan diarahkan ke formulir masukan internal (*private feedback*). Keluhan pelanggan ditampung secara privat ke basis data internal tanpa mencemari rating publik di Google, dilengkapi tombol follow-up cepat via WhatsApp pemilik toko.

### 2. Direct Mode (Bypass Langsung)
- Jika opsi `is_shield_active = false`, perutean `/r/[slug]` langsung mengembalikan HTTP 307 Temporary Redirect ke URL Google Review tanpa menampilkan antarmuka web perantara.

### 3. Invalid / Inactive Card Fallback
- Kartu yang belum terdaftar atau berstatus nonaktif akan otomatis diarahkan ke `/invalid-card?slug=[slug]` dengan status kode HTTP 307.

---

## ✨ Fitur Utama

- ⚡ **Dynamic Routing Berkecepatan Tinggi (`/r/[slug]` & `/[slug]`):** Dioptimalkan untuk respons cepat saat kartu NFC disentuhkan ke smartphone (iOS & Android).
- 📊 **Pelacakan Telemetri & Anti-Spam Debounce:**
  - Mendeteksi jenis sistem operasi pengguna (`iOS`, `Android`, `Desktop`, `Other`).
  - Hashing anonim IP (`SHA-256`) dengan *window rate-limiting/debouncing* untuk mencegah manipulasi perhitungan tap ganda secara instan.
- 🏢 **Multi-Role Authentication & Dashboard:**
  - **Portal Admin (`/admin`):** Manajemen kartu fisik, pembuatan merchant, konfigurasi slug URL, aktivasi shield, dan generator QR Code cetak.
  - **Dashboard Merchant (`/dashboard`):** Analitik interaktif (total tap, distribusi rating bintang, grafik perangkat, tren waktu nyata) dan daftar masukan privat pelanggan.
- 🎯 **Validasi Google Review Intent Link:**
  - Mendukung tautan langsung modal review Google:
    - `https://g.page/r/[code]/review`
    - `https://search.google.com/local/writereview?placeid=[place_id]`
    - `https://maps.app.goo.gl/...`
- 📱 **Generator QR Code Dinamis:**
  - Menghasilkan QR Code SVG dan PNG resolusi tinggi secara instan dari dashboard untuk kebutuhan cetak akrilik/stiker meja.

### Fitur Growth (butuh migrasi `20261015000000_growth_features.sql`)

- 🔔 **Alert instan rating 1–3★** ke WhatsApp (Fonnte) dan/atau Telegram, dikirim setelah respons (pelanggan tidak menunggu). Anti-spam: 1 alert/menit per pengunjung dan maks 20/jam per kartu. Atur di **Settings → Alert Instan**, lengkap dengan tombol **Kirim Tes**.
- ✍️ **Alur 4–5★ dengan kotak cerita:** pelanggan boleh menulis pengalaman (opsional). Teks disimpan sebagai social proof dan otomatis disalin agar tinggal ditempel di Google. Tidak ada insentif/voucher, sesuai kebijakan ulasan Google.
- 👤 **Tracking staf & meja:** tambahkan `?staff=andi&meja=12` di link kartu/QR. Halaman **Staff & Meja** menampilkan leaderboard staf dan meja yang paling sering dikeluhkan.
- 🤖 **Ringkasan AI mingguan** (Google Gemini, fallback analisis aturan bila `GEMINI_API_KEY` kosong) di Overview, plus digest WA/Telegram tiap Senin 08:00 WIB via Vercel Cron (`/api/cron/weekly-summary`).
- 🔀 **Smart Mode Switcher:** halaman **Mode Kartu** untuk ganti kartu ke mode Review / Promo / Redirect dengan batas waktu, tanpa mengganti link NFC. `/r/[slug]?view=review` selalu membuka halaman rating.
- 🖨️ **Template akrilik A6 (1240×1748, 300 dpi)** dengan logo, QR, dan nomor meja: halaman **Promosi** atau tombol di modal QR admin.
- 📸 **Social proof generator:** ulasan 5★ bertulisan → PNG IG Story (1080×1920) / Post (1080×1080) dengan logo toko.

---

## 🛠 Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack) | `16.4.0` |
| **UI Library** | [React](https://react.dev/) | `19.3.0` |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & [@tailwindcss/turbopack](https://tailwindcss.com/) | `v4` |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + RLS + Auth) | `@supabase/ssr` `^0.12.7` |
| **Visualisasi / Charts** | [Recharts](https://recharts.org/) | `^3.10.1` |
| **Icons** | [Lucide React](https://lucide.dev/) | `^1.55.0` |
| **QR Code Engine** | [qrcode](https://www.npmjs.com/package/qrcode) | `^1.5.4` |
| **Unit & Integration Test**| [Vitest](https://vitest.dev/) | `^5.0.3` |

---

## 📁 Struktur Direktori Proyek

```text
filter-rating/
├── public/                 # Static assets & favicon
├── scripts/
│   └── seed-admin.mjs      # Script CLI untuk seeding akun administrator
├── src/
│   ├── app/
│   │   ├── (admin)/        # Portal Admin (/admin/...)
│   │   │   └── admin/
│   │   │       ├── cards/  # CRUD & konfig kartu NFC
│   │   │       └── components/ # Chart perangkat, tabel kartu
│   │   ├── (auth)/         # Halaman Login & Autentikasi
│   │   ├── (dashboard)/    # Portal Klien / Merchant (/dashboard/...)
│   │   │   └── dashboard/
│   │   │       └── components/ # TrendCharts, Feedback List, QR Modal
│   │   ├── [slug]/         # Alternatif rute langsung /[slug]
│   │   ├── r/[slug]/       # Endpoint utama NFC & perutean kartu
│   │   ├── invalid-card/   # Halaman kartu tidak terdaftar / invalid
│   │   └── api/
│   │       ├── telemetry/  # Endpoint logging tap & device OS
│   │       └── feedback/   # Endpoint submit masukan privat
│   ├── components/         # Komponen UI global (Navbar, Badge, Button)
│   └── lib/
│       ├── config.js       # Resolver base URL terpusat
│       ├── url.js          # Generator URL kartu NFC
│       ├── validation.js   # Sanitasi & validasi Google Review URL
│       ├── device.js       # Parser OS perangkat (iOS / Android / Desktop)
│       ├── debounce.js     # IP hashing & rate-limiting tap
│       ├── resolve-card-action.js # Logika perutean (Shield vs Direct vs 404)
│       └── supabase/       # Client Supabase SSR & service-role
├── supabase/
│   └── migrations/         # File migrasi database SQL bertahap
├── tests/
│   ├── unit/               # Pengujian fungsi parsing, debounce, URL, slug
│   └── integration/        # Pengujian perutean kartu, API feedback & telemetri
├── schema.sql              # Master skema SQL lengkap
├── next.config.mjs         # Konfigurasi Next.js (Turbopack, cacheComponents)
├── vitest.config.mjs       # Konfigurasi pengujian Vitest
└── package.json
```

---

## 🗄 Skema Basis Data (Database Schema)

Database menggunakan **PostgreSQL (Supabase)** dengan tabel-tabel utama berikut:

### 1. `cards`
Menyimpan identitas kartu fisik, konfigurasi toko, dan mode proteksi.
- `id` (UUID, Primary Key)
- `slug` (VARCHAR(100), Unique, Indexed)
- `store_name` (VARCHAR(255))
- `logo_url` (TEXT, Opsional)
- `google_review_url` (TEXT): Tautan langsung ke modal review Google Bisnis.
- `whatsapp_number` (VARCHAR(30)): Nomor WhatsApp toko untuk menerima komplain/masukan.
- `is_shield_active` (BOOLEAN, Default: `true`): Penentu mode *Shield* atau *Direct*.

### 2. `tap_logs`
Mencatat analitik setiap kali kartu disentuh atau QR discan.
- `id` (BIGSERIAL, Primary Key)
- `card_id` (UUID, FK -> `cards.id`)
- `device_os` (`iOS`, `Android`, `Desktop`, `Other`)
- `user_agent` (TEXT)
- `selected_stars` (INT 1-5, jika melakukan aksi di layar)
- `ip_hash` (VARCHAR(64)): Anonymized hash untuk debounce rate-limiting.
- `created_at` (TIMESTAMPTZ)

### 3. `internal_feedbacks`
Menampung ulasan privat bintang 1–4 dari pelanggan.
- `id` (BIGSERIAL, Primary Key)
- `card_id` (UUID, FK -> `cards.id`)
- `rating` (INT 1-5)
- `feedback_text` (TEXT)
- `customer_whatsapp` (VARCHAR(30), Opsional)
- `created_at` (TIMESTAMPTZ)

---

## 🚀 Panduan Instalasi & Pengaturan Lokal

### 1. Prasyarat
- **Node.js:** Versi `>= 20.0.0`
- **npm** atau **pnpm** / **yarn**
- Proyek aktif di **[Supabase](https://supabase.com)** (atau instance lokal Supabase).

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/filter-rating.git
cd filter-rating

# Install seluruh dependensi
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi konfigurasi berikut sesuai dengan kredensial Supabase Anda:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...

# Domain Utama Aplikasi (Digunakan untuk link NFC & QR Code)
NEXT_PUBLIC_APP_URL=https://nived.studio

# Kredensial Admin Awal (Digunakan oleh scripts/seed-admin.mjs)
ADMIN_EMAIL=admin@nived.id
ADMIN_PASSWORD=PasswordKuatAnda123!
ADMIN_FULL_NAME="Nived Administrator"

# Opsional — alert rating jelek & digest mingguan
FONNTE_TOKEN=token-device-fonnte
TELEGRAM_BOT_TOKEN=123456:ABC-token-dari-BotFather
TELEGRAM_BOT_USERNAME=NamaBotAnda

# Opsional — ringkasan AI mingguan
GEMINI_API_KEY=kunci-dari-aistudio.google.com
GEMINI_MODEL=gemini-flash-latest

# Wajib untuk cron mingguan di Vercel
CRON_SECRET=string-acak-panjang
```

> ⚠️ **PENTING:** Pastikan `NEXT_PUBLIC_APP_URL` menggunakan domain produksi/staging Anda (contoh: `https://nived.studio`) dan bukan domain bawaan Vercel `.vercel.app` agar tautan NFC yang dicetak permanen tetap konsisten.

### 4. Setup Database Supabase
Jalankan skrip migrasi database di Supabase SQL Editor:
1. Buka dashboard proyek Supabase Anda -> **SQL Editor**.
2. Salin dan jalankan isi file [`schema.sql`](file:///Users/tabaniii/Herd/filter-rating/schema.sql) atau migrasi di folder [`supabase/migrations/`](file:///Users/tabaniii/Herd/filter-rating/supabase/migrations/).
3. Skrip akan membuat tabel `cards`, `tap_logs`, `internal_feedbacks`, indeks penelusuran, serta sample seed data untuk pengujian lokal.
4. Untuk fitur growth, jalankan juga [`supabase/migrations/20261015000000_growth_features.sql`](supabase/migrations/20261015000000_growth_features.sql). Migrasi ini hanya menambah kolom/tabel (aman dijalankan ulang). Sebelum dijalankan, aplikasi tetap berjalan dan dashboard menampilkan pengingat migrasi.

### 5. Seed Akun Admin
Jalankan perintah berikut untuk membuat akun administrator pertama:
```bash
npm run seed:admin
```

---

## 💻 Menjalankan Aplikasi

```bash
# Menjalankan server pengembangan (Turbopack)
npm run dev

# Membangun bundle produksi
npm run build

# Menjalankan server produksi
npm start
```

Akses aplikasi pada browser di:
- **Halaman Penilaian Publik:** `http://localhost:3000/r/demo-card`
- **Halaman Mode Direct:** `http://localhost:3000/r/direct-card`
- **Portal Admin:** `http://localhost:3000/admin`
- **Dashboard Merchant:** `http://localhost:3000/dashboard`

---

## 🧪 Testing & Validasi Kode

Seluruh modul inti (validasi URL, perutean kartu, debounce IP, parsing perangkat, dan endpoint API) dilindungi oleh suite pengujian otomatis:

```bash
# Menjalankan seluruh pengujian (171 tests)
npm test

# Menjalankan linter (ESLint 9)
npm run lint
```

---

## 🔗 Format URL NFC & Google Business Profile Intent

Untuk memastikan kartu NFC membuka **langsung modal ulasan bintang 5** (bukan hanya halaman profil bisnis umum), gunakan format URL berikut:

| Tipe Tautan | Contoh URL | Rekomendasi |
|---|---|---|
| **Google Review Intent (g.page)** | `https://g.page/r/CbXxZ0xxxxxx/review` | ⭐⭐⭐ Sangat Direkomendasikan (Langsung buka popup rating di Android & iOS) |
| **Google Local Write Review** | `https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4` | ⭐⭐⭐ Sangat Direkomendasikan |
| **Google Maps Shortlink** | `https://maps.app.goo.gl/AbCdEfGhIjKlMnOp` | ⭐ Didukung (Fallback) |

Aplikasi memiliki parser & validator otomatis di [`src/lib/validation.js`](file:///Users/tabaniii/Herd/filter-rating/src/lib/validation.js) yang membersihkan spasi tidak sengaja dan memvalidasi keabsahan format URL sebelum disimpan.

---

## 🏷️ Panduan Pemrograman Fisik Kartu NFC (NTAG215)

Gunakan aplikasi seperti **NFC Tools** (tersedia gratis di Android & iOS) untuk menulis tautan ke kartu fisik:

1. Buka aplikasi **NFC Tools**.
2. Pilih tab **Write** -> **Add a record**.
3. Pilih **Custom URL / URI**.
4. Masukkan URL kartu Anda dengan format:
   ```text
   https://nived.studio/r/{slug-toko}
   ```
   *Contoh:* `https://nived.studio/r/kopi-senja-utama`
5. Tempelkan kartu **NTAG215** ke bagian belakang ponsel hingga muncul konfirmasi sukses ("Write complete").
6. *(Opsional)* Kunci kartu (*Lock/Read-Only*) jika kartu siap didistribusikan ke lokasi publik agar tidak dapat ditimpa oleh pihak luar.

---

## 🔒 Keamanan & Privasi

- **IP Anonymization:** Alamat IP pengunjung di-hash satu arah menggunakan `SHA-256` dengan salt waktu sebelum disimpan untuk keperluan rate-limiting; alamat IP mentah pelanggan tidak pernah disimpan dalam basis data.
- **Row Level Security (RLS):** Data ulasan privat dan statistik kartu diamankan dengan kebijakan PostgreSQL RLS sehingga merchant hanya dapat mengakses data milik tokonya sendiri.
- **Strict URL Sanitization:** Melindungi pengalihan dari celah *Open Redirect* dengan hanya mengizinkan domain tepercaya Google Maps dan WhatsApp API resmi.
