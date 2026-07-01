# Macrofy

Dashboard de dados macroeconômicos (Brasil e EUA/global) hospedado no GitHub Pages.

## Stack

- **Frontend**: React + Vite + TypeScript + shadcn/ui + Tailwind CSS
- **Backend**: Supabase (auth, banco de dados, Edge Functions)
- **Deploy**: GitHub Pages (`/macrofy/`)

## Desenvolvimento local

```bash
cp .env.example .env.local
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

## Edge Functions

As Edge Functions ficam em `supabase/functions/` e são deployadas via Supabase CLI:

```bash
supabase functions deploy <nome-da-function>
```

Variáveis de ambiente necessárias no Supabase Dashboard:
- `OPENROUTER_API_KEY` — usada pela função `translate-news`

## Deploy

O GitHub Actions faz o build e push para `gh-pages` a cada push na `main`.
