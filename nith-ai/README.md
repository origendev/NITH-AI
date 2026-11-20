# NITH AI

ChatGPT-style chat app. React + Vite + Tailwind frontend, FastAPI backend that talks to NVIDIA NIM.
Your API key stays on the server (backend/.env) - never in the browser.

## 1. Backend (terminal 1)
    cd backend
    pip install -r requirements.txt
    copy .env.example .env        (Mac/Linux: cp .env.example .env)
    # open .env, paste your nvapi- key, set NVIDIA_MODEL
    uvicorn main:app --reload --port 8000
Check: http://localhost:8000/api/health  ->  "key_configured": true

## 2. Frontend (terminal 2)
    npm install
    copy .env.example .env        (Mac/Linux: cp .env.example .env)
    npm run dev
Open http://localhost:5173

## Your logo
Replace public/nith-ai-logo.png with your real logo (the current one is a placeholder).

## Deploy
Frontend: `npm run build` -> upload dist/ (Netlify / Vercel / Cloudflare Pages).
Backend: Render / Railway / Hugging Face Space. Set NVIDIA_API_KEY, NVIDIA_MODEL and
ALLOWED_ORIGINS (your site URL) as environment variables, then set VITE_API_BASE_URL
to the backend URL before building the frontend.
