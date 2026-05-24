# Invoice & Disbursement Tracker

Aplikasi tracking invoice dan pencairan berbasis React + Vite + Supabase.

## 🚀 Deploy ke Vercel + Supabase

### 1. Setup Supabase

1. Buat akun di [supabase.com](https://supabase.com) jika belum punya
2. Buat **New Project**
3. Masuk ke **SQL Editor** di dashboard Supabase
4. Jalankan ketiga migration secara berurutan:
   - `supabase/migrations/20260524062818_001_create_invoice_tables.sql`
   - `supabase/migrations/20260524063616_002_add_status_crud_policies.sql`
   - `supabase/migrations/20260524064157_003_fix_status_rls_policies.sql`
5. Ambil kredensial di **Settings → API**:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Deploy ke Vercel

#### Cara A: via GitHub (Rekomendasi)

1. Push project ini ke GitHub repository
2. Buka [vercel.com](https://vercel.com) dan klik **Add New Project**
3. Import repository GitHub Anda
4. Pada bagian **Environment Variables**, tambahkan:
   ```
   VITE_SUPABASE_URL     = https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
5. Klik **Deploy** — selesai!

#### Cara B: via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy dari folder project
vercel

# Saat ditanya Environment Variables, masukkan:
# VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
```

### 3. Jalankan Lokal

```bash
# Clone / extract project
cd project

# Install dependencies
npm install

# Buat file .env dari template
cp .env.example .env
# Edit .env dan isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

# Jalankan development server
npm run dev
```

## 📁 Struktur Project

```
project/
├── src/
│   ├── hooks/useAuth.tsx       # Auth context & hooks
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── utils.ts            # Helper functions
│   ├── pages/
│   │   ├── AuthPage.tsx        # Halaman login/register
│   │   └── Dashboard.tsx       # Dashboard utama
│   ├── types/index.ts          # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/             # SQL migrations untuk Supabase
├── public/
├── .env.example                # Template environment variables
├── vercel.json                 # Konfigurasi Vercel
├── vite.config.ts
└── package.json
```

## ⚠️ Catatan Penting

- **Jangan commit file `.env`** ke Git — sudah ada di `.gitignore`
- File `.env.example` aman untuk di-commit (berisi placeholder, bukan nilai asli)
- Setelah deploy ulang di Vercel, environment variables tetap tersimpan di dashboard Vercel
