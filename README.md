# ALYZ Control Center

Next.js 14 · Tailwind · Framer Motion

## Deploy ke Vercel
1. Push folder ini ke GitHub, import di Vercel.
2. Isi Environment Variables (Settings → Environment Variables):
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_OWNER`, `GITHUB_REPO`
   (opsional: `GITHUB_BRANCH`, `SESSION_SECRET`)
3. Token GitHub (pilih salah satu):
   - **Terenkripsi**: `npm run encrypt-token -- ghp_tokenkamu` → salin `GITHUB_TOKEN_ENC` dan `ENCRYPTION_KEY` ke Vercel (centang Sensitive), jangan set `GITHUB_TOKEN`.
   - **Biasa**: set `GITHUB_TOKEN` dan aktifkan **Sensitive** di Vercel.
4. Token GitHub: fine-grained, akses ke repo target, izin **Contents: Read and write**.
5. Ganti `public/avatar.jpg` dengan fotomu. Repo tujuan harus sudah punya minimal 1 commit.

Batas: tiap file maks 4 MB (batas body Vercel).
