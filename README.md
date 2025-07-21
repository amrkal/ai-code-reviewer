# AI Code Reviewer 🤖

A full-stack app that automatically reviews GitHub repositories using OpenAI. It scores code quality, detects risks, and provides actionable suggestions — all via a simple UI.

## Features

- ✅ Review any public GitHub repo
- ✅ Smart diff review for latest commits
- ✅ Side-by-side diff viewer (React + diff2html)
- ✅ Markdown export for results

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI + OpenAI API
- **Diff Viewer**: `diff2html`

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env  # Add your OpenAI + GitHub tokens
pip install -r requirements.txt
uvicorn main:app --reload
