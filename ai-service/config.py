import os
from pathlib import Path
from dotenv import load_dotenv

# Search for root .env or local .env
root_env = Path(__file__).resolve().parent.parent / ".env"
local_env = Path(__file__).resolve().parent / ".env"

if root_env.exists():
    load_dotenv(dotenv_path=root_env)
elif local_env.exists():
    load_dotenv(dotenv_path=local_env)
else:
    load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("MONGODB_DB_NAME", "civibridge")
PORT = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))

# CORS — comma-separated list of allowed origins (set on Render)
# e.g. "https://civibridge.onrender.com,https://civibridge.vercel.app"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Verified Gemini models
EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM = 768
GENERATION_MODEL = "models/gemini-flash-latest"
