# Catatan Aeromax

Aplikasi catatan pemasaran event B2B yang mobile-first, dibangun dengan Next.js 14, Tailwind CSS, React Hook Form, Zod, Drizzle ORM, Turso, dan Gemini.

## Menjalankan aplikasi

1. Salin `.env.example` menjadi `.env.local`, lalu isi konfigurasi Turso, Gemini, dan akun awal.
2. Pasang dependensi dengan `npm install`.
3. Terapkan skema database dengan `npx drizzle-kit push`.
4. Buat akun awal dengan `npm run db:seed-admin`.
5. Jalankan aplikasi dengan `npm run dev`.

PIN tidak disimpan di kode maupun browser. PIN disimpan sebagai hash `scrypt` di Turso dan autentikasi menggunakan cookie sesi `HttpOnly`. Setelah masuk, buka halaman **Akun** untuk mengganti PIN sendiri atau mendaftarkan anggota tim lain.

Nilai `INITIAL_ADMIN_PIN` hanya dipakai saat akun awal belum ada. Mengubah nilai tersebut setelah akun dibuat tidak otomatis mengubah PIN di database; gunakan halaman **Akun**.

## Laporan tersimpan

Untuk database yang sudah ada, jalankan `npm run db:create-reports` (hanya menambahkan tabel laporan).
Halaman **Laporan** menyediakan preview, revisi lewat prompt Gemini, simpan/perbarui, serta ekspor PDF dan DOCX editable.
Seluruh isi preview dapat diedit langsung seperti dokumen Word; HTML hasil edit dibersihkan sebelum disimpan.
Laporan disimpan sebagai teks JSON berisi narasi dan salinan lampiran, tanpa berkas PDF atau riwayat revisi.
Setiap pengguna hanya bisa melihat dan memperbarui laporannya sendiri. Simpan menggantikan isi laporan yang sama;
perubahan di tab lain ditolak agar tidak menimpa revisi terbaru. Revisi lampiran tidak mengubah catatan event atau tugas asal.
