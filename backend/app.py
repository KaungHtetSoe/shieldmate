import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
from urllib.parse import quote
import httpx, re

# --- OpenAI client ---
# Uses OPENAI_API_KEY from environment

# --- load .env ---
load_dotenv()  # reads .env in cwd

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")


HIBP_API_KEY = os.getenv("HIBP_API_KEY")  # optional; required only if you call HIBP
HIBP_USER_AGENT = os.getenv("HIBP_USER_AGENT", "ShieldMate/1.0 (admin@example.com)")

# --- OpenAI client using key from .env ---
client = OpenAI(api_key=OPENAI_API_KEY)
client = OpenAI()

# --- Model choice (tweak as you like) ---
# Tip: 4.1-mini/4o-mini are fast & inexpensive; upgrade model if you need deeper reasoning.
MODEL = "gpt-4.1-mini"

# --- Route-specific prompt arrays (edit these to your liking) ---
PROMPT_MAP = {
    # NOTE: kept your route spelling "phishng" exactly
    "phishng": [
        {
            "role": "system",
            "content": (
                "You are Shield Mate, an AI assistant specialized in phishing triage. "
                "Give clear, actionable steps, highlight red flags, and suggest safe verification. "
                "Never request or output secrets. If the user shares URLs, analyze safely (no live fetching). "
                "Prefer concise bullets; include a short final verdict: {Likely phishing | Unsure | Likely safe}."
            ),
        }
    ],
    "wifisec": [
        {
            "role": "system",
            "content": (
                "You are Shield Mate focusing on Wi-Fi security. Prioritize WPA3/WPA2, strong passphrases, "
                "disable WPS, router firmware updates, guest networks, IoT isolation, DNS/DoH options. "
                "Give step-by-step, device-agnostic guidance. Keep answers succinct and practical."
            ),
        }
    ],
    "cybersec": [
        {
            "role": "system",
            "content": (
                "You are Shield Mate for general cybersecurity. Provide prioritized mitigation steps, "
                "threat modeling lite, and plain-language explanations. Avoid legal advice; suggest contacting "
                "professionals when incidents involve loss or crime."
            ),
        }
    ],
}

# Accept IDN punycode (xn--) and common local-part chars
EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{2,59})\b'
)

def extract_emails(text: str) -> list[str]:
    if not text:
        return []
    return EMAIL_RE.findall(text)

def hibp_lookup(email: str, truncate: bool = False, include_unverified: bool = False, domain: str | None = None):
    """
    Returns:
      { 'ok': True, 'breaches': [...] } on 200/404
      { 'ok': False, 'status': int, 'error': str, 'retry_after': str|None } otherwise.
    """
    if not HIBP_API_KEY:
        return {"ok": False, "status": 501, "error": "HIBP_API_KEY not configured"}

    headers = {"hibp-api-key": HIBP_API_KEY, "user-agent": HIBP_USER_AGENT}
    params = {
        "truncateResponse": "true" if truncate else "false",
        "includeUnverified": "true" if include_unverified else "false",
    }
    if domain:
        params["domain"] = domain

    try:
        with httpx.Client(timeout=15.0) as s:
            r = s.get(
                f"https://haveibeenpwned.com/api/v3/breachedaccount/{quote(email, safe='')}",
                headers=headers,
                params=params,
            )

        if r.status_code == 404:
            return {"ok": True, "breaches": []}
        if r.status_code == 200:
            return {"ok": True, "breaches": _normalize_breaches(r.json())}
        if r.status_code == 429:
            return {"ok": False, "status": 429, "error": "rate_limited", "retry_after": r.headers.get("Retry-After")}
        return {"ok": False, "status": r.status_code, "error": r.text[:500]}
    except Exception as e:
        return {"ok": False, "status": 502, "error": f"proxy_failure: {e}"}


def _openai_chat(messages):
    completion = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.2,
    )
    answer = completion.choices[0].message.content
    usage = None
    if hasattr(completion, "usage") and completion.usage:
        try:
            usage = completion.usage.model_dump()
        except Exception:
            try:
                usage = completion.usage.dict()
            except Exception:
                usage = {
                    "prompt_tokens": getattr(completion.usage, "prompt_tokens", None),
                    "completion_tokens": getattr(completion.usage, "completion_tokens", None),
                    "total_tokens": getattr(completion.usage, "total_tokens", None),
                }
    return answer, usage, getattr(completion, "model", MODEL)


def _normalize_breaches(items):
    out = []
    for b in items or []:
        out.append({
            "Name": b.get("Name"),
            "Title": b.get("Title"),
            "Domain": b.get("Domain"),
            "BreachDate": b.get("BreachDate"),
            "AddedDate": b.get("AddedDate"),
            "PwnCount": b.get("PwnCount"),
            "DataClasses": b.get("DataClasses"),
            "IsVerified": b.get("IsVerified"),
            "IsSensitive": b.get("IsSensitive"),
            "LogoPath": b.get("LogoPath"),
        })
    return out


def _summarize_hibp(email: str, breaches: list[dict]) -> str:
    if not breaches:
        return f"No breaches found for {email}."
    top = breaches[:3]
    lines = [f"{len(breaches)} breach(es) found for {email}."]
    for b in top:
        dc = ", ".join((b.get("DataClasses") or [])[:4])
        lines.append(f"- {b.get('Title') or b.get('Name')} ({b.get('BreachDate')}), data: {dc or 'n/a'}")
    if len(breaches) > 3:
        lines.append(f"...and {len(breaches) - 3} more.")
    return "\n".join(lines)


def _validated_history(raw):
    """Allow optional chat history: list[{'role': 'user'|'assistant', 'content': str}]"""
    out = []
    if isinstance(raw, list):
        for m in raw:
            if (
                isinstance(m, dict)
                and m.get("role") in ("user", "assistant")
                and isinstance(m.get("content"), str)
                and m["content"].strip()
            ):
                out.append({"role": m["role"], "content": m["content"].strip()})
    return out[:20]  # cap history length

def _ask(topic_key):
    if topic_key not in PROMPT_MAP:
        return jsonify({"error": "Unknown topic"}), 404

    data = request.get_json(silent=True) or {}
    q = (data.get("q") or "").strip()
    if not q:
        return jsonify({"error": "Provide 'q' in JSON body"}), 400

    history = _validated_history(data.get("history"))

    messages = []
    messages.extend(PROMPT_MAP[topic_key])
    messages.extend(history)
    messages.append({"role": "user", "content": q})

    try:
        # Chat Completions API call
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
        )
        answer = completion.choices[0].message.content

        usage = None
        if hasattr(completion, "usage") and completion.usage:
            # Make usage JSON-serializable across client versions
            try:
                usage = completion.usage.model_dump()  # pydantic-style
            except Exception:
                try:
                    usage = completion.usage.dict()
                except Exception:
                    usage = {
                        "prompt_tokens": getattr(completion.usage, "prompt_tokens", None),
                        "completion_tokens": getattr(completion.usage, "completion_tokens", None),
                        "total_tokens": getattr(completion.usage, "total_tokens", None),
                    }

        return jsonify(
            {
                "topic": topic_key,
                "answer": answer,
                "model": getattr(completion, "model", MODEL),
                "usage": usage,
            }
        )
    except Exception as e:
        # Don't leak sensitive info in prod; log server-side instead
        return jsonify({"error": "Upstream model call failed", "details": str(e)}), 502

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/ask/*": {"origins": "*"}})  # adjust for your frontend origin(s)

    @app.get("/healthz")
    def healthz():
        return jsonify({"ok": True})

    @app.post("/ask/phishng")   # note: spelling per your request
    def ask_phishng():
        return _ask("phishng")

    @app.post("/ask/wifisec")
    def ask_wifisec():
        return _ask("wifisec")

    @app.post("/ask/cybersec")
    def ask_cybersec():
        return _ask("cybersec")
    
    @app.post("/ask/emailbreached")
    def ask_emailcheck():
        """
        Body JSON:
        {
            "question": "check my email user@example.com is breached?",  # preferred (we'll extract)
            "email": null,                          # optional explicit override
            "truncate": false,                      # optional HIBP param
            "include_unverified": false,            # optional HIBP param
            "domain": null,                         # optional HIBP param
            "with_ai": false                        # optional AI summary
        }
        """
        data = request.get_json(silent=True) or {}

        # 1) Prefer explicit email if present
        email = (data.get("email") or "").strip().lower()

        # 2) Otherwise extract from free-form question
        if not email:
            question = (data.get("question") or "").strip()
            matches = extract_emails(question)
            if matches:
                email = matches[0].lower()  # take the first found

        if not email:
            return jsonify({
                "answer": "Breach checking require Email address, Provide 'email' directly or include an email address inside 'question'."
            }), 200

        truncate = bool(data.get("truncate", False))
        include_unverified = bool(data.get("include_unverified", False))
        domain = data.get("domain") or None
        with_ai = bool(data.get("with_ai", False))

        hibp = hibp_lookup(email, truncate=truncate, include_unverified=include_unverified, domain=domain)
        if not hibp.get("ok"):
            return jsonify(hibp), hibp.get("status", 502)

        resp = {
            "email": email,
            "count": len(hibp.get("breaches", [])),
            "breaches": hibp.get("breaches", []),
        }

        # Optional AI summary
        if with_ai:
            brief = _summarize_hibp(email, hibp.get("breaches", []))
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are Shield Mate, a cybersecurity assistant. Summarize the exposure for the given email "
                        "based on the listed breach records (no guessing beyond facts). Provide: "
                        "1) One-line risk read, 2) 4–6 actionable steps (passwords, MFA/passkeys, unique creds, monitoring), "
                        "3) Short note on data classes exposed. Be concise."
                    ),
                },
                {"role": "user", "content": brief},
            ]
            try:
                answer, usage, used_model = _openai_chat(messages)
                resp["ai_summary"] = answer
                resp["model"] = used_model
                resp["usage"] = usage
            except Exception as e:
                resp["ai_error"] = f"ai_unavailable: {e}"

        return jsonify(resp), 200


    return app

app = create_app()

if __name__ == "__main__":
    # FLASK_RUN_PORT respected if using `flask run`; otherwise hardcode here:
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
