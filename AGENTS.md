# Multi-Agent Coordination Specification ([AGENTS.md](http://AGENTS.md))

**Project:** `filter-rating` (NFC/QR Rating Pages, Merchant Dashboard, &amp; Admin Portal)  

**Stack:** Next.js App Router (JavaScript ES Modules) + Supabase + Tailwind CSS + Vitest  

**Active Agents:** Codex, Copilot, Antigravity

---

## 1. Project Architecture &amp; Boundaries

- `src/app/`: Mengelola routing Next.js App Router (alur publik `r/[slug]`, route groups `(auth)`, `(dashboard)`, `(admin)`, dan API handler di `src/app/api/`).

- `src/components/`: Komponen antarmuka modular, reusable shell, dan elemen interaktif UI.

- `src/lib/`: Logika validasi input, client Supabase, database access helpers, dan otentikasi.

- `supabase/migrations/` &amp; `schema.sql`: Migrasi database versi SQL dan referensi skema tabel.

- `tests/`: Lingkungan Vitest terbagi atas `tests/unit/`, `tests/integration/`, dan data mock di `tests/fixtures/`.

- `public/` &amp; `src/app/globals.css`: Aset statis dan gaya CSS Tailwind global.

- `briefs/` &amp; root markdown `01-*` s/d `06-*`: Acuan spesifikasi teknis dan alur fitur.

---

## 2. Multi-Agent Roles &amp; Scope of Work

### 1. Codex — Backend, Database &amp; Server Logic Specialist

- **Domain:** Server-side logic, manipulasi database Supabase, validasi skema, dan route handling.

- **Allowed Scope:**

  - `src/app/api/**/route.js`

  - `src/lib/**`

  - `supabase/migrations/**`

  - `schema.sql`

- **Responsibilities:**

  - Menulis dan memelihara Route Handler Next.js (`src/app/api/`) sesuai spesifikasi [`03-feature-route-handler.md`](http://03-feature-route-handler.md).

  - Merancang skema tabel, fungsi migrasi SQL berversi, dan konfigurasi RLS (Row Level Security) Supabase.

  - Membangun skrip utilitas validasi payload masukan di `src/lib/` (menangani input salah dan missing records).

  - Menjaga isolasi `SUPABASE_SERVICE_ROLE_KEY` agar selalu berada di sisi server.

### 2. Copilot — Frontend Architect &amp; Quality Assurance (UI + Testing)

- **Domain:** Client-side components, integrasi tampilan Next.js, styling Tailwind, dan pembuatan test suite.

- **Allowed Scope:**

  - `src/components/**`

  - `src/app/**/page.js`, `src/app/**/layout.js`

  - `tests/unit/**/*.test.js`

  - `tests/integration/**/*.test.js`

  - `tests/fixtures/**`

- **Responsibilities:**

  - Membangun antarmuka interaktif dan responsif berdasarkan panduan UI ([`04-feature-rating-ui.md`](http://04-feature-rating-ui.md)).

  - Mengonsumsi endpoint API buatan Codex menggunakan alias `@/`.

  - Menulis pengujian Vitest (`*.test.js`) untuk unit helper di `tests/unit/` dan rute integrasi di `tests/integration/`.

  - Memastikan mock database independen tanpa bergantung pada kredensial aktif Supabase.

### 3. Antigravity — Automation, Build &amp; Runner Engine

- **Domain:** Eksekusi shell terminal, package runner, linting, build verification, dan data seeding.

- **Allowed Scope:**

  - Eksekusi sistem terminal dan skrip `package.json`.

- **Responsibilities:**

  - Menjalankan test runner via `npm test` atau `npx vitest run <path>`.

  - Melakukan audit sintaks dan kualitas via `npm run lint`.

  - Memverifikasi keberhasilan kompilasi produksi via `npm run build`.

  - Menjalankan provisi admin lokal lewat `npm run seed:admin` menggunakan variabel lingkungan `.env`.

---

## 3. Delegated 3-Step Handoff Lifecycle

Setiap pengerjaan fitur mengikuti alur 3 tahap berurutan:

\[Spesifikasi / Brief Fitur\]  
│  
▼  
1. CODEX (Backend &amp; Database)  
- Siapkan migrasi Supabase &amp; schema.sql  
- Bangun API Route Handler &amp; lib validator  
│  
▼  
2. COPILOT (Frontend &amp; Test Suite)  
- Bangun komponen UI &amp; halaman publik/dashboard  
- Hubungkan ke API endpoint  
- Tulis Vitest unit &amp; integration test  
│  
▼  
3. ANTIGRAVITY (Runner &amp; Verification)  
- npm run lint  
- npm test  
- npm run build



## 4. Coding Conventions &amp; Standards

- Gunakan JavaScript ES Modules murni, indentasi 2 spasi, dan akhiri baris dengan titik koma (`;`).

- Komponen React ditulis dengan PascalCase, sedangkan helper dan fungsi dengan camelCase.

- Pertahankan struktur file App Router standar (`page.js`, `layout.js`, `route.js`).

- Gunakan selalu import absolut `@/` yang mengarah ke `src/`.

- Jangan pernah melakukan commit file `.env` atau kredensial rahasia.

