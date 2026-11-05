# Cara Pakai Dashboard Client Nived

Panduan singkat untuk pemilik toko / merchant yang memakai dashboard di `dashboard.nived.studio`.

Setelah login, Anda akan melihat menu: **Overview**, **Reviews & Feedback**, **Link Google Maps**, **Staff & Meja**, dan **Settings**.

---

## 1. Overview

Ringkasan toko dari database bersama:

- Penjualan POS hari ini dalam zona waktu WIB
- Pesanan meja yang belum selesai
- Klik tautan ulasan Google selama tujuh hari terakhir
- Jumlah dan masukan pribadi terbaru

---

## Reputation & Feedback Hub

Pantau jumlah klik Google selama tujuh hari terakhir dan total masukan pribadi. Gunakan sakelar di setiap masukan untuk menandai tindak lanjut yang selesai. Pilih **Generate / Refresh AI Summary** untuk membuat ringkasan tujuh hari terakhir, lalu pilih **Salin ke WhatsApp** untuk membagikan pesan secara manual.

## 2. Link Google Maps

Buka **Link Google Maps** (`/dashboard/review-link`), masukkan tautan langsung ulasan dari Google Business Profile, lalu simpan. Tautan ini berlaku untuk seluruh kartu NFC dan QR toko yang belum dihapus.

Format yang diterima:

- `https://g.page/r/[kode]/review`
- `https://search.google.com/local/writereview?placeid=[place_id]`

Link fisik di meja tetap sama. Halaman pelanggan tetap menyediakan pilihan ulasan Google dan masukan pribadi.

---

## 3. Staff & Meja

**Fungsi:** lacak staf mana yang paling banyak dapat review bagus, dan meja mana yang paling banyak keluhan.

### Buat link per staf / meja

1. Pilih kartu toko
2. Isi **Nama staf** (opsional), mis. `Andi`
3. Isi **Meja** (opsional), mis. `12`
4. Klik **Salin** — tulis link itu ke stiker NFC (mis. lewat NFC Tools), atau klik **Buat QR** untuk menuju generator QR di halaman yang sama

Contoh:

- Link umum: `https://…/r/sudirman-01`
- Dengan staf & meja: `https://…/r/sudirman-01?staf=andi&meja=12`

Filter periode (**Bulan ini** / **Bulan lalu** / **30 hari terakhir**) mengatur angka di leaderboard.

---

### Unduh QR Code Kartu

1. Pilih kartu toko di bagian **QR Code Kartu**
2. (Opsional) isi meja / staf agar QR spesifik per meja atau staf
3. Unduh **PNG**

---

## 4. Settings (Pengaturan Toko)

Pilih kartu toko, lalu atur:

| Field | Kegunaan |
|-------|----------|
| **Nama Toko / Restoran** | Nama yang tampil di halaman pelanggan |
| **URL Logo Toko** | Gambar logo di halaman pelanggan |
| **Pengiriman Ringkasan Mingguan** | Pengiriman opsional ke nomor WhatsApp atau chat Telegram yang Anda isi |

Di bagian atas ada **Tautan Publik Kartu NFC** — ini link yang tertulis di kartu/NFC/QR fisik. Tombol **Salin** / **Tes URL** untuk cek.

---

## Penting: tautan publik tidak berubah di Settings

Link publik berbentuk:

```text
https://dashboard.nived.studio/r/[slug-kartu]
```

contoh: `/r/sudirman-01`

- Slug (`sudirman-01`) dibuat sekali saat kartu di-*provision* oleh Admin Nived.
- Client **boleh** mengubah nama toko, logo, dan WhatsApp di **Settings**; tautan ulasan Google dikelola di **Link Google Maps**.
- Perubahan itu **tidak mengubah slug** dan **tidak merusak** link NFC/QR yang sudah ditempel.

Jadi utak-atik Settings aman untuk link fisik — yang berubah hanya isi/perilaku di belakang link, bukan URL-nya sendiri.

---

## Ringkas alur harian

1. Admin Nived terbitkan kartu + slug → tulis ke NFC/QR
2. Client isi **Link Google Maps** untuk tujuan ulasan toko
3. Lengkapi nama toko, logo, dan WhatsApp di **Settings**
4. (Opsional) buat link dan QR lewat **Staff & Meja** untuk tracking
5. Pantau **Overview** serta tindak lanjuti masukan di **Reviews & Feedback**
