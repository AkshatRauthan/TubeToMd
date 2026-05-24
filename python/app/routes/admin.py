import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.groq_key_manager import groq_key_manager

router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "")


def verify_admin(authorization: str = Header(None)):
    """Validate admin bearer token."""
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="ADMIN_API_TOKEN is not configured.")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization: Bearer <token>")
    if authorization[7:] != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token.")


class KeyRequest(BaseModel):
    key: str


@router.get("/groq-keys")
async def get_groq_key_status(authorization: str = Header(None)):
    """Get status of all Groq API keys in the rotation pool."""
    verify_admin(authorization)
    return {"success": True, "message": "Groq key pool status", "data": groq_key_manager.get_status()}


@router.post("/groq-keys", status_code=201)
async def add_groq_key(body: KeyRequest, authorization: str = Header(None)):
    """Add a new Groq API key to the rotation pool at runtime."""
    verify_admin(authorization)
    if len(body.key.strip()) < 10:
        raise HTTPException(status_code=400, detail="Key is too short.")
    added = groq_key_manager.add_key(body.key)
    if not added:
        raise HTTPException(status_code=409, detail="Key already exists in the pool.")
    return {"success": True, "message": "Key added.", "data": groq_key_manager.get_status()}


@router.delete("/groq-keys")
async def remove_groq_key(body: KeyRequest, authorization: str = Header(None)):
    """Remove a Groq API key from the rotation pool."""
    verify_admin(authorization)
    removed = groq_key_manager.remove_key(body.key)
    if not removed:
        raise HTTPException(status_code=404, detail="Key not found in pool.")
    return {"success": True, "message": "Key removed.", "data": groq_key_manager.get_status()}
