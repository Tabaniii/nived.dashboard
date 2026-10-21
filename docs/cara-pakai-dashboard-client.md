# Cara Pakai Dashboard Client Nived

Panduan singkat untuk pemilik toko / merchant yang memakai dashboard di `dashboard.nived.studio`.

Setelah login, Anda akan melihat menu: **Overview**, **Mode Kartu**, **Staff & Meja**, **Promosi**, dan **Settings**.

---

## 1. Overview

Ringkasan performa kartu NFC/QR Anda:

- Total tap / scan
- Distribusi rating bintang
- Masukan privat dari pelanggan (rating rendah)

Gunakan halaman ini untuk cek apakah kartu sedang dipakai pelanggan.

---

## 2. Mode Kartu

**Fungsi:** mengganti perilaku kartu NFC & QR tanpa mengganti link fisik yang sudah ditempel di meja.

Pilih kartu toko (mis. `sudirman-01`), lalu pilih salah satu mode:

| Mode | Apa yang terjadi saat pelanggan tap/scan |
|------|------------------------------------------|
| **Review** | Rating 4–5★ diarahkan ke Google; 1–3★ ke kotak masukan privat |
| **Promo** | Tampilkan promo / menu spesial dulu; tombol “Rate your visit” tetap ada |
| **Redirect** | Langsung buka link lain (menu digital, Instagram, katalog WhatsApp, dll.) |

Klik **Terapkan Mode …** agar perubahan aktif.

> Link di meja **tidak perlu diganti**. Mode hanya mengubah perilaku di belakang link yang sama.

---

## 3. Staff & Meja

**Fungsi:** lacak staf mana yang paling banyak dapat review bagus, dan meja mana yang paling banyak keluhan.

### Buat link per staf / meja

1. Pilih kartu toko
2. Isi **Nama staf** (opsional), mis. `Andi`
3. Isi **Meja** (opsional), mis. `12`
4. Klik **Salin** — tulis link itu ke stiker NFC (mis. lewat NFC Tools), atau klik **Buat QR** untuk unduh QR di halaman Promosi

Contoh:

- Link umum: `https://…/r/sudirman-01`
- Dengan staf & meja: `https://…/r/sudirman-01?staf=andi&meja=12`

Filter periode (**Bulan ini** / **Bulan lalu** / **30 hari terakhir**) mengatur angka di leaderboard.

---

## 4. Promosi

### QR Code Kartu

1. Pilih kartu toko
2. (Opsional) isi meja / staf agar QR spesifik per meja atau staf
3. Unduh **PNG**

### Social Proof Instagram

Ubah ulasan 5★ pelanggan jadi gambar Story (9:16) atau Post (1:1) untuk diunggah ke Instagram. Nama dan nomor pelanggan tidak ditampilkan.

---

## 5. Settings (Pengaturan Toko)

Pilih kartu toko, lalu atur:

| Field | Kegunaan |
|-------|----------|
| **Nama Toko / Restoran** | Nama yang tampil di halaman pelanggan |
| **Google Review URL** | Tujuan pelanggan yang kasih 4–5★ (pakai *direct review intent URL*) |
| **WhatsApp Manager / Toko** | Nomor chat untuk pelanggan 1–3★ (boleh ketik `08…`, otomatis jadi `628…`) |
| **Alert Instan Rating 1–3★** | Notifikasi cepat saat ada rating jelek |

Di bagian atas ada **Tautan Publik Kartu NFC** — ini link yang tertulis di kartu/NFC/QR fisik. Tombol **Salin** / **Tes URL** untuk cek.

**Shield Mode** (aktif/nonaktif) hanya dikontrol Admin Nived sesuai langganan.

---

## Penting: tautan publik tidak berubah di Settings

Link publik berbentuk:

```text
https://dashboard.nived.studio/r/[slug-kartu]
```

contoh: `/r/sudirman-01`

- Slug (`sudirman-01`) dibuat sekali saat kartu di-*provision* oleh Admin Nived.
- Client **boleh** mengubah nama toko, Google URL, WhatsApp, mode kartu, dll.
- Perubahan itu **tidak mengubah slug** dan **tidak merusak** link NFC/QR yang sudah ditempel.

Jadi utak-atik Settings aman untuk link fisik — yang berubah hanya isi/perilaku di belakang link, bukan URL-nya sendiri.

---

## Ringkas alur harian

1. Admin Nived terbitkan kartu + slug → tulis ke NFC/QR
2. Client isi **Settings** (Google URL + WhatsApp)
3. Client pilih **Mode Kartu** sesuai kebutuhan hari itu
4. (Opsional) buat link **Staff & Meja** untuk tracking
5. Pantau **Overview** + unduh materi di **Promosi** bila perlu
