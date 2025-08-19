import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

# --- OpenAI client ---
# Uses OPENAI_API_KEY from environment
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

    return app

app = create_app()

if __name__ == "__main__":
    # FLASK_RUN_PORT respected if using `flask run`; otherwise hardcode here:
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
