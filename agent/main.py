import json
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent_config import marketing_agent
from supabase_client import (
    list_sessions, create_session, delete_session,
    get_messages, save_message, update_session_title, touch_session,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Marketing AI Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: int
    message: str


class SessionCreate(BaseModel):
    title: str = "New Chat"


# ── Sessions endpoints ───────────────────────────────────────────────────────

@app.get("/api/sessions")
async def api_list_sessions():
    return list_sessions()


@app.post("/api/sessions")
async def api_create_session(body: SessionCreate):
    return create_session(body.title)


@app.delete("/api/sessions/{session_id}")
async def api_delete_session(session_id: int):
    delete_session(session_id)
    return {"ok": True}


@app.get("/api/sessions/{session_id}/messages")
async def api_get_messages(session_id: int):
    return get_messages(session_id)


# ── Chat endpoint (SSE) ─────────────────────────────────────────────────────

@app.post("/api/chat")
async def api_chat(body: ChatRequest):
    # 1. Save user message
    save_message(body.session_id, "user", body.message)

    # 2. Auto-title: set session title from first message
    messages = get_messages(body.session_id)
    user_messages = [m for m in messages if m["role"] == "user"]
    if len(user_messages) == 1:
        title = body.message[:80] + ("..." if len(body.message) > 80 else "")
        update_session_title(body.session_id, title)

    # 3. Build conversation history for CrewAI
    conversation = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
    ]

    async def generate():
        # Send a "thinking" event immediately
        yield f"data: {json.dumps({'type': 'status', 'content': 'Analyzing your question...'})}\n\n"

        try:
            # Run the agent in a thread pool (it's synchronous)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: marketing_agent.kickoff(conversation)
            )

            response_text = result.raw if hasattr(result, "raw") else str(result)

            # Save assistant message
            save_message(body.session_id, "assistant", response_text)
            touch_session(body.session_id)

            # Send the full response
            yield f"data: {json.dumps({'type': 'message', 'content': response_text})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            save_message(body.session_id, "assistant", error_msg)
            yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
