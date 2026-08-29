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
