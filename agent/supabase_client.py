import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url = os.environ["SUPABASE_URL"]
_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

db: Client = create_client(_url, _key)


# ── Sessions ─────────────────────────────────────────────────────────────────

def list_sessions() -> list[dict]:
    res = db.table("chat_sessions") \
        .select("*") \
        .order("updated_at", desc=True) \
        .execute()
    return res.data


def create_session(title: str = "New Chat") -> dict:
    res = db.table("chat_sessions") \
        .insert({"title": title}) \
        .execute()
    return res.data[0]


def delete_session(session_id: int) -> None:
    db.table("chat_sessions") \
        .delete() \
        .eq("id", session_id) \
        .execute()


def update_session_title(session_id: int, title: str) -> None:
    db.table("chat_sessions") \
        .update({"title": title, "updated_at": "now()"}) \
        .eq("id", session_id) \
        .execute()


def touch_session(session_id: int) -> None:
    db.table("chat_sessions") \
        .update({"updated_at": "now()"}) \
        .eq("id", session_id) \
        .execute()


# ── Messages ─────────────────────────────────────────────────────────────────

def get_messages(session_id: int) -> list[dict]:
    res = db.table("chat_messages") \
        .select("*") \
        .eq("session_id", session_id) \
        .order("created_at", desc=False) \
        .execute()
    return res.data


def save_message(session_id: int, role: str, content: str, metadata: dict | None = None) -> dict:
    row = {
        "session_id": session_id,
        "role": role,
        "content": content,
        "metadata": metadata or {},
    }
    res = db.table("chat_messages").insert(row).execute()
    return res.data[0]
