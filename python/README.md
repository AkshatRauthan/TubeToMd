---
title: TubeToMD Python
emoji: 🎙️
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# TubeToMD — Python Transcription Service

> FastAPI microservice for audio/video transcription using Groq Whisper

## Overview

Handles YouTube transcript fetching, chunked audio transcription via Groq Whisper API, and transcript merging. Designed to run as a standalone Hugging Face Space (Docker SDK, port 7860).

## Tech Stack

- **FastAPI** — async REST framework
- **Groq Whisper** — speech-to-text transcription
- **yt-dlp** — YouTube audio extraction
- **ffmpeg** — audio processing and chunking
- **Pydantic** — request/response validation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/transcribe/youtube` | Fetch YouTube transcript |
| `POST` | `/transcribe/chunk` | Transcribe a single audio chunk |
| `POST` | `/transcribe/merge` | Merge chunk transcriptions |
| `POST` | `/transcribe/upload` | Transcribe uploaded file (legacy) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Primary Groq API key |
| `GROQ_API_KEYS` | ❌ | Comma-separated additional keys for rotation |
| `MAX_FILE_SIZE_MB` | ❌ | Max upload size (default: 500) |
| `PORT` | ❌ | Server port (default: 7860 on HF) |
