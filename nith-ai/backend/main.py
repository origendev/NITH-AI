"""
Nith AI backend (FastAPI) - a thin, secure proxy to NVIDIA NIM.

The browser calls  POST /api/chat  and never sees the NVIDIA API key.
The key is read from the NVIDIA_API_KEY environment variable (backend/.env).

Run:
    pip install -r requirements.txt
    cp .env.example .env        # then paste your key into .env
    uvicorn main:app --reload --port 8000
"""
import json
import os
from typing import List, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "").strip()
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
# Any chat model from https://build.nvidia.com/models works here.
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct").strip()
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "2048"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.6"))
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are Nith AI, a helpful, friendly and concise personal AI assistant. "
    "Use Markdown for formatting and fenced code blocks for code.",
)

app = FastAPI(title="Nith AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    model: str | None = None  # accepted for contract compatibility; server decides the real model
    messages: List[Message] = Field(min_length=1)
    stream: bool = True


@app.get("/api/health")
async def health():
    return {"status": "ok", "model": NVIDIA_MODEL, "key_configured": bool(NVIDIA_API_KEY)}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not NVIDIA_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="NVIDIA_API_KEY is not set on the server. Add it to backend/.env and restart.",
        )

    messages = [m.model_dump() for m in req.messages]
    if not any(m["role"] == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

    payload = {
        "model": NVIDIA_MODEL,
        "messages": messages,
        "stream": True,
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
    }
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }

    client = httpx.AsyncClient(timeout=httpx.Timeout(connect=15.0, read=120.0, write=30.0, pool=15.0))
    try:
        upstream_request = client.build_request(
            "POST", f"{NVIDIA_BASE_URL}/chat/completions", json=payload, headers=headers
        )
        upstream = await client.send(upstream_request, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Could not reach NVIDIA API: {exc.__class__.__name__}")

    if upstream.status_code != 200:
        body = (await upstream.aread()).decode("utf-8", "ignore")
        await upstream.aclose()
        await client.aclose()
        detail = body[:300]
        try:
            parsed = json.loads(body)
            detail = parsed.get("detail") or parsed.get("error", {}).get("message") or detail
            if not isinstance(detail, str):
                detail = json.dumps(detail)[:300]
        except Exception:
            pass
        if upstream.status_code in (401, 403):
            detail = "NVIDIA rejected the API key. Check NVIDIA_API_KEY. (" + detail + ")"
        elif upstream.status_code == 404:
            detail = f"Model '{NVIDIA_MODEL}' was not found. Check NVIDIA_MODEL. (" + detail + ")"
        return JSONResponse(status_code=upstream.status_code, content={"detail": detail})

    async def relay():
        try:
            async for chunk in upstream.aiter_raw():
                yield chunk
        except httpx.HTTPError:
            yield b'data: {"error": "The connection to NVIDIA was interrupted."}\n\n'
        finally:
            await upstream.aclose()
            await client.aclose()

    return StreamingResponse(
        relay(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
