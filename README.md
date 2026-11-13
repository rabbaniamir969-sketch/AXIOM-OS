# AXIOM OS — Starter Project

Fondasi awal AXIOM OS: platform modular, otomatis dengan kendali pengguna, dimulai sebagai proyek pribadi. Starter ini berisi dashboard web responsif dan konfigurasi awal Capacitor untuk Android.

## Kebutuhan
- Node.js versi LTS (disarankan 20 atau lebih baru)
- VS Code
- Android Studio hanya saat mulai membangun APK Android

## Menjalankan website
1. Ekstrak ZIP.
2. Buka folder `axiom-os-starter` di VS Code.
3. Buka Terminal di VS Code.
4. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

5. Buka alamat lokal yang ditampilkan Vite (biasanya `http://localhost:5173`).

## Build website
```bash
npm run build
npm run preview
```
Hasil build berada di folder `dist/`.

## Supabase, akun, dan sinkronisasi
Frontend memakai URL project dan publishable key dari `.env.local` (file ini diabaikan Git). Salin `.env.example` sebagai `.env.local` untuk mengisi konfigurasi project lain. Publishable key memang dipakai di browser; keamanan data bergantung pada RLS, bukan pada penyembunyian key tersebut.

Tabel AXIOM dan kebijakan Row Level Security ada di `supabase/migrations/`. Untuk menerapkannya ke project Supabase:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Di Supabase Authentication, atur Site URL serta URL redirect ke origin aplikasi yang digunakan. Buat akun dan masuk melalui menu **Profil Pengguna**. Status modul, izin, pengaturan, dan log akan disimpan per pengguna. Data perangkat lokal tidak otomatis disalin ke akun baru.

## Web Push
Web Push memerlukan origin HTTPS (localhost diizinkan untuk pengembangan), izin browser, VAPID key pair, tabel migrasi di atas, dan Edge Function. Buat VAPID key pair secara lokal; jangan commit private key:

```bash
npx web-push generate-vapid-keys
```

Set `VITE_WEB_PUSH_PUBLIC_KEY` di `.env.local` ke VAPID public key. Nilai ini berbeda dari key Supabase. Lalu deploy fungsi:

```bash
npx supabase functions deploy send-web-push
```

Simpan VAPID public/private key, subject, dan origin di file lokal `.env.secrets` (salin `.env.secrets.example`; file rahasia ini diabaikan Git), lalu jalankan `npx supabase secrets set --env-file .env.secrets`. Untuk pengembangan web, `APP_ORIGIN` harus sama persis dengan origin browser, misalnya `http://localhost:5173`; Edge Function juga mengizinkan origin native Capacitor `https://localhost` dan `capacitor://localhost`. Private key hanya dikirim sebagai Supabase Secret dan tidak dimasukkan ke frontend. Setelah konfigurasi selesai, masuk ke akun, buka **Notifikasi**, aktifkan Web Push, lalu gunakan tombol tes. Notifikasi perubahan AXIOM dikirim ke perangkat akun saat preferensi notifikasi aktif.

## Notifikasi native Android (FCM)
Push native Android memakai Firebase Cloud Messaging (FCM); Web Push tetap digunakan pada browser. Pastikan Android Studio dan Android SDK sudah terpasang. Buat project Android di Firebase Console dengan package `com.axiomos.app`, unduh `google-services.json`, lalu salin file itu ke `android/app/`. Jika folder `android/` belum ada, buat platform sekali:

```bash
npm run android:init
```

Setelah itu sinkronkan plugin dan buka project:

```bash
npm run android:sync
npm run android:open
```

Template Android Capacitor yang dihasilkan menerapkan Google Services Gradle plugin saat `google-services.json` tersedia. Jangan commit file service-account atau masukkan kunci private Firebase ke `.env.local`/`VITE_*`.

Untuk mengaktifkan pengiriman FCM, tambahkan `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, dan `FCM_PRIVATE_KEY` ke `.env.secrets` dari service account Firebase yang memiliki izin mengirim FCM. `FCM_PRIVATE_KEY` adalah private key PEM, bukan file `google-services.json`. Terapkan migration Android push yang baru dan deploy ulang Edge Function setelah secrets dikonfigurasi:

```bash
npx supabase db push --remote
npx supabase secrets set --env-file .env.secrets
npx supabase functions deploy send-web-push
npm run android:sync
```

Di Android Studio, tunggu Gradle selesai, lalu jalankan pada perangkat Android dengan Google Play services. Masuk ke akun, buka **Notifikasi**, aktifkan notifikasi Android, dan kirim notifikasi uji. Build website tidak menguji pengiriman FCM native.

## Struktur
```text
src/
  app/                 # Komponen utama aplikasi
  components/           # Komponen UI yang dapat dipakai ulang
  modules/              # Registry dan contoh modul
  styles/               # Tema dan stylesheet
  main.tsx
```

## Status fondasi
- [x] Dashboard awal responsif
- [x] Navigasi dasar
- [x] Fondasi registrasi modul
- [x] Preferensi lokal sederhana
- [x] Supabase Auth dan sinkronisasi data per akun
- [x] Fondasi langganan Web Push dan pengiriman melalui Edge Function
- [x] Migration awal dan Edge Function Web Push sudah diterapkan ke project Supabase
- [x] Integrasi kode FCM Android, registrasi perangkat, dan handler notifikasi native
- [x] Project Android Capacitor dibuat dan plugin native berhasil disinkronkan
- [ ] Migration Android push dan pembaruan Edge Function belum diterapkan ke Supabase
- [ ] Project Firebase, `google-services.json`, dan FCM service-account secrets belum dikonfigurasi
- [ ] Build dan uji end-to-end aplikasi Android pada perangkat belum dilakukan
- [ ] Sistem izin modul dan marketplace

Login memakai Supabase Auth. Jangan menyimpan service-role key, VAPID private key, atau Firebase service-account private key di frontend. Web Push browser dan push Android native memakai jalur pengiriman berbeda.
