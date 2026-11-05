# 🛡️ Nived NFC & QR Reputation Hub (`filter-rating`)

Halaman pelanggan, telemetri klik ulasan, dan masukan pribadi berbasis **NFC (NTAG215)** dan **QR Code** untuk bisnis lokal dan *merchant*.

Aplikasi ini dibangun menggunakan **Next.js 16 (App Router)**, **React 19**, **Supabase (PostgreSQL & Auth)**, **Tailwind CSS v4**, dan **Recharts**.

---

## 📋 Daftar Isi

- [Arsitektur & Cara Kerja](#-arsitektur--cara-kerja)
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

Pelanggan yang membuka `/r/[slug]` dari NFC atau QR melihat nama toko, logo, dan nomor meja jika tersedia. Halaman yang sama menawarkan dua pilihan berikut.

- **Beri Ulasan di Google Maps** membuka tautan ulasan toko di tab baru. Aplikasi mencatat klik di latar belakang.
- **Kritik & Masukan ke Manajemen** membuka formulir pribadi dengan kategori, isi masukan, dan nomor WhatsApp opsional.

Tautan Google selalu tersedia saat kartu memiliki tujuan Google yang valid. Promo dan tautan tambahan muncul di bawah kedua pilihan. Kartu yang tidak tersedia mengarahkan pengunjung ke `/invalid-card`.

---

## ✨ Fitur Utama

- ⚡ **Dynamic Routing Berkecepatan Tinggi (`/r/[slug]` & `/[slug]`):** Dioptimalkan untuk respons cepat saat kartu NFC disentuhkan ke smartphone (iOS & Android).
- 📊 **Pelacakan Telemetri & Anti-Spam Debounce:**
  - Mendeteksi jenis sistem operasi pengguna (`iOS`, `Android`, `Desktop`, `Other`).
  - Hashing anonim IP (`SHA-256`) dengan *window rate-limiting/debouncing* untuk mencegah manipulasi perhitungan tap ganda secara instan.
- 🏢 **Multi-Role Authentication & Dashboard:**
  - **Portal Admin (`/admin`):** Manajemen kartu fisik, pembuatan merchant, konfigurasi slug URL dan generator QR Code cetak.
  - **Dashboard Merchant (`/dashboard`):** Analitik interaktif (total tap, distribusi rating bintang, grafik perangkat, tren waktu nyata) dan daftar masukan privat pelanggan.
- 🎯 **Validasi Google Review Intent Link:**
  - Pengaturan kartu menerima dua format tautan langsung ulasan Google.
    - `https://g.page/r/[code]/review`
    - `https://search.google.com/local/writereview?placeid=[place_id]`
- 📱 **Generator QR Code Dinamis:**
  - Menghasilkan QR Code SVG dan PNG resolusi tinggi secara instan dari dashboard untuk kebutuhan cetak akrilik/stiker meja.

### Fitur Merchant

- **Reputation & Feedback Hub** (`/dashboard/reviews-feedback`) menampilkan klik tautan Google selama tujuh hari terakhir, jumlah masukan pribadi, dan daftar masukan dengan status penyelesaian.
- **Ringkasan mingguan** merangkum masukan tujuh hari terakhir. Pemilik dapat membuat ulang ringkasan dan menyalin pesan untuk WhatsApp. Vercel Cron membuat ringkasan setiap Senin pukul 08.00 WIB.
- **Tracking staf & meja:** tambahkan `?staff=andi&meja=12` di link kartu/QR. Nomor pada slug seperti `kopi-senja-meja-12` juga dikenali.
- **Link Google Maps** (`/dashboard/review-link`) mengatur tautan langsung ulasan Google untuk seluruh kartu toko tanpa mengganti tautan NFC.
- **QR kartu** tersedia di **Staff & Meja** untuk diunduh sebagai PNG dengan kode staf/meja opsional.
- 🖨️ **Template akrilik A6 (1240×1748, 300 dpi)** dengan logo, QR, dan nomor meja tersedia melalui modal QR admin.

---

## 🛠 Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack) | `16.4.3` |
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
│       ├── resolve-card-action.js # Menentukan ketersediaan dan promo kartu
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
Menyimpan identitas kartu fisik, konfigurasi toko, dan konten tambahan.
- `id` (UUID, Primary Key)
- `slug` (VARCHAR(100), Unique, Indexed)
- `store_name` (VARCHAR(255))
- `logo_url` (TEXT, Opsional)
- `google_review_url` (TEXT): Tautan langsung ke modal review Google Bisnis.
- `whatsapp_number` (VARCHAR(30)): Nomor WhatsApp toko untuk menerima komplain/masukan.

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
Menyimpan arsip dari formulir rating lama.
- `id` (BIGSERIAL, Primary Key)
- `card_id` (UUID, FK -> `cards.id`)
- `rating` (INT 1-5)
- `feedback_text` (TEXT)
- `customer_whatsapp` (VARCHAR(30), Opsional)
- `created_at` (TIMESTAMPTZ)

### 4. `customer_feedback` dan `review_click_events`

Menyimpan masukan pribadi dan klik tautan Google per merchant dan meja. Klien publik dapat menambahkan data. Pemilik toko dapat membaca data tokonya dan mengubah status penyelesaian masukan.

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

Next.js memprioritaskan `.env.local` di atas `.env`. Jika kredensial Supabase sudah disimpan di `.env`, hapus duplikat variabel Supabase dari `.env.local` agar perubahan `.env` tidak tertimpa konfigurasi lama. URL dan kedua API key harus berasal dari project Supabase yang sama. Restart `npm run dev` setelah mengubah konfigurasi jika perubahan belum terbaca.

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

# Opsional — pengiriman otomatis ke tujuan yang sudah dikonfigurasi
FONNTE_TOKEN=token-device-fonnte
TELEGRAM_BOT_TOKEN=123456:ABC-token-dari-BotFather
TELEGRAM_BOT_USERNAME=NamaBotAnda

# Opsional — ringkasan AI mingguan
GEMINI_API_KEY=kunci-dari-aistudio.google.com
GEMINI_MODEL=gemini-3.5-flash-lite

# Wajib untuk cron mingguan di Vercel
CRON_SECRET=string-acak-panjang
```

> ⚠️ **PENTING:** Pastikan `NEXT_PUBLIC_APP_URL` menggunakan domain produksi/staging Anda (contoh: `https://nived.studio`) dan bukan domain bawaan Vercel `.vercel.app` agar tautan NFC yang dicetak permanen tetap konsisten.

### 4. Setup Database Supabase
Jalankan skrip migrasi database di Supabase SQL Editor:
1. Buka dashboard proyek Supabase Anda -> **SQL Editor**.
2. Untuk database kosong, jalankan [`schema.sql`](schema.sql) atau jalankan file di [`supabase/migrations/`](supabase/migrations/) sesuai urutan.
3. Untuk proyek yang sudah memiliki tabel dashboard dan fitur growth, jalankan [migrasi Reputation & Feedback Hub](supabase/migrations/20261104143056_reputation_feedback_hub.sql) lalu [migrasi RBAC dashboard](supabase/migrations/20261104151336_dashboard_rbac.sql).
4. Untuk membuat ringkasan satu toko melalui API, kirim `POST /api/reports/weekly-sentiment` dengan JSON `{"store_id":"<uuid>"}` dan header `Authorization: Bearer <CRON_SECRET>`. Jadwal Vercel memakai `GET /api/cron/weekly-summary`.

### 5. Seed Akun Admin
Atur `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `ADMIN_FULL_NAME` di `.env.local`, lalu jalankan perintah berikut untuk membuat akun administrator pertama:
```bash
npm run seed:admin
```

Setelah berhasil dibuat, akun tersebut dikonfirmasi dan mendapat peran `superadmin` di `profiles.dashboard_role`. Gunakan `ADMIN_EMAIL` sebagai akun login di `/login`; password login adalah nilai `ADMIN_PASSWORD` yang Anda atur sendiri. Untuk memastikan akun benar-benar aktif di project yang sedang dipakai, cek **Supabase Dashboard → Authentication → Users** dan pastikan pengguna tidak dinonaktifkan. README ini tidak menyimpan password akun; jangan commit password asli atau file `.env.local`.

Superadmin dapat memilih toko melalui bilah dashboard. Pemilik toko hanya dapat membuka toko yang menautkan profilnya melalui `merchants.owner_id`. Peran POS tetap disimpan di `profiles.role`.

#### Akun demo untuk membandingkan dashboard

| Peran | Email login | Status | Merchant |
|---|---|---|---|
| Superadmin | `nived.studio@gmail.com` | Aktif | Semua merchant |
| Owner demo | `owner.central@example.com` | Aktif | Nived Demo Coffee (`trial`) |

Login melalui `/login`. Password owner demo disimpan lokal di `.env.local` sebagai `DEMO_OWNER_PASSWORD`; email-nya tersedia sebagai `DEMO_OWNER_EMAIL`. Akun owner memiliki akses hanya ke merchant demo. Data ulasan, klik, dan tap pada merchant tersebut adalah data contoh buatan.

Untuk menyiapkan contoh presentasi, jalankan [seed Kopi Titik Temu](supabase/seeds/reputation_dashboard_demo.sql), lalu buka `/dashboard/reviews-feedback` sebagai superadmin dan pilih **Kopi Titik Temu**. Lima klik, empat masukan, dan satu ringkasan tersedia saat seed pertama kali dijalankan.

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
- **Halaman Pelanggan:** `http://localhost:3000/r/demo-card`
- **Portal Admin:** `http://localhost:3000/admin`
- **Dashboard Merchant:** `http://localhost:3000/dashboard`

---

## 🧪 Testing & Validasi Kode

Seluruh modul inti (validasi URL, perutean kartu, debounce IP, parsing perangkat, dan endpoint API) dilindungi oleh suite pengujian otomatis:

```bash
# Menjalankan seluruh pengujian
npm test

# Menjalankan linter (ESLint 9)
npm run lint
```

---

## 🔗 Format URL NFC & Google Business Profile Intent

Gunakan tautan ulasan Google Business Profile di pengaturan kartu:

| Tipe Tautan | Contoh URL |
|---|---|
| **Google Local Write Review** | `https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4` |
| **Google Review Intent (g.page)** | `https://g.page/r/CbXxZ0xxxxxx/review` |

Kartu yang sudah memiliki tautan pendek Google Maps tetap dapat membukanya. Ganti tautan tersebut di Settings jika Anda ingin membuka formulir ulasan langsung.

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
