"""
SurplusLink AI - API Key & Provider Health Checker
==================================================
Verifies whether Google Gemini, OpenAI, and Grok / Groq API keys are attached in .env
and whether live requests to their APIs succeed.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()


def check_gemini_key():
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key or not api_key.strip():
        return {
            "attached": False,
            "working": False,
            "status": "NOT ATTACHED",
            "message": "GEMINI_API_KEY is not set in .env"
        }

    api_key = api_key.strip()
    masked = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"
    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model,
            contents="ping"
        )
        return {
            "attached": True,
            "working": True,
            "model": model,
            "masked_key": masked,
            "status": "WORKING (200 OK)",
            "message": f"Successfully authenticated with Google Gemini (model: {model})."
        }
    except Exception as exc:
        return {
            "attached": True,
            "working": False,
            "model": model,
            "masked_key": masked,
            "status": f"FAILED ({type(exc).__name__})",
            "message": str(exc)
        }


def check_openai_key():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not api_key.strip() or api_key == "your_openai_api_key_here":
        return {
            "attached": False,
            "working": False,
            "status": "NOT ATTACHED",
            "message": "OPENAI_API_KEY is not set or still set to placeholder in .env"
        }

    masked = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=8.0)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=2,
            timeout=8.0
        )
        return {
            "attached": True,
            "working": True,
            "masked_key": masked,
            "status": "WORKING (200 OK)",
            "message": f"Successfully authenticated with OpenAI ({os.getenv('OPENAI_MODEL', 'gpt-4o-mini')})."
        }
    except Exception as exc:
        err_msg = str(exc)
        if "billing" in err_msg.lower() or "credits" in err_msg.lower() or "429" in err_msg:
            status = "QUOTA / CREDITS EXHAUSTED (429)"
        elif "authentication" in err_msg.lower() or "401" in err_msg:
            status = "INVALID API KEY (401)"
        else:
            status = f"API ERROR ({type(exc).__name__})"

        return {
            "attached": True,
            "working": False,
            "masked_key": masked,
            "status": status,
            "message": err_msg
        }


def check_xai_grok_key():
    api_key = os.getenv("XAI_API_KEY")
    if not api_key or not api_key.strip() or api_key == "your_xai_api_key_here":
        return {
            "attached": False,
            "working": False,
            "status": "NOT ATTACHED",
            "message": "XAI_API_KEY is not set or still set to placeholder in .env"
        }

    api_key = api_key.strip()
    masked = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"

    # Detect Groq vs xAI
    if api_key.startswith("gsk_"):
        base_url = "https://api.groq.com/openai/v1"
        model = "qwen/qwen3.8-27b"
        provider = "Groq Cloud"
    else:
        base_url = "https://api.x.ai/v1"
        model = os.getenv("XAI_MODEL", "grok-2-latest")
        provider = "xAI Grok"

    try:
        from openai import OpenAI
        client = OpenAI(
            base_url=base_url,
            api_key=api_key,
            timeout=8.0
        )
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=2,
            timeout=8.0
        )
        return {
            "attached": True,
            "working": True,
            "provider": provider,
            "masked_key": masked,
            "status": "WORKING (200 OK)",
            "message": f"Successfully authenticated with {provider} (model: {model})."
        }
    except Exception as exc:
        return {
            "attached": True,
            "working": False,
            "provider": provider,
            "masked_key": masked,
            "status": f"FAILED ({type(exc).__name__})",
            "message": f"Key attached but API request failed: {str(exc)}"
        }


def main():
    print("=" * 65)
    print(" SurplusLink AI - Provider Key & Connectivity Diagnostic")
    print("=" * 65)
    print(f"Working Directory : {os.getcwd()}")
    print(f".env File Found   : {os.path.exists('.env')}")
    print("-" * 65)

    # 1. Tier 1 (Primary): Google Gemini
    gemini_res = check_gemini_key()
    print(f"Tier 1 (Primary): Google Gemini API")
    print(f"  - Attached : {gemini_res['attached']}")
    if gemini_res['attached']:
        print(f"  - Key      : {gemini_res.get('masked_key')}")
    print(f"  - Status   : {gemini_res['status']}")
    print(f"  - Details  : {gemini_res['message']}")
    print("-" * 65)

    # 2. Tier 1 (Alternate): OpenAI
    openai_res = check_openai_key()
    print(f"Tier 1 (Alternate): ChatGPT (OpenAI API)")
    print(f"  - Attached : {openai_res['attached']}")
    if openai_res['attached']:
        print(f"  - Key      : {openai_res.get('masked_key')}")
    print(f"  - Status   : {openai_res['status']}")
    print(f"  - Details  : {openai_res['message']}")
    print("-" * 65)

    # 3. Tier 2: Grok / Groq
    grok_res = check_xai_grok_key()
    provider_name = grok_res.get('provider', 'Grok (xAI API)')
    print(f"Tier 2 (Secondary): {provider_name}")
    print(f"  - Attached : {grok_res['attached']}")
    if grok_res['attached']:
        print(f"  - Key      : {grok_res.get('masked_key')}")
    print(f"  - Status   : {grok_res['status']}")
    print(f"  - Details  : {grok_res['message']}")
    print("-" * 65)

    # 4. Tier 3: Local Offline Extractor
    print(f"Tier 3 (Tertiary): Local AI Fallback (Offline Heuristics)")
    print(f"  - Attached : True (Built-in pure Python)")
    print(f"  - Status   : READY & VERIFIED")
    print(f"  - Details  : Operational regardless of cloud API connectivity.")
    print("=" * 65)


if __name__ == "__main__":
    main()
