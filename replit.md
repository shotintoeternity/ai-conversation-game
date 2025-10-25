# AI Fantasy Game

## Overview
A text-based fantasy adventure game powered by AI. Features a whimsical fairy dungeon master that responds with both text and realistic voice audio. The game uses Groq's API for intelligent conversations and ElevenLabs for text-to-speech conversion.

## Project Structure
- **Frontend**: Static HTML/JS served from `/public` folder
  - `index.html` - Game interface
  - `script.js` - Frontend logic for chat and audio playback
- **Backend**: Express.js server (`server.js`)
  - Serves static files
  - `/api/message` endpoint handles user messages
  - Integrates with Groq and ElevenLabs APIs

## Technology Stack
- Node.js with Express.js
- Groq API (Mixtral model) for AI conversations
- ElevenLabs API for text-to-speech
- Vanilla JavaScript frontend

## Configuration
- **Port**: 5000 (bound to 0.0.0.0 for Replit)
- **API Keys** (stored in Replit Secrets):
  - `GROQ_API_KEY` - Groq AI service
  - `ELEVENLABS_API_KEY` - Voice synthesis
  - `ELEVENLABS_VOICE_ID` - (optional) Default: EXAVITQu4vr4xnSDxMaL

## Recent Changes (October 25, 2025)
- Initial setup in Replit environment
- Updated server to use port 5000 with host 0.0.0.0
- Configured workflow for automatic server start
- Set up API keys via Replit Secrets

## How It Works
1. User types a message in the chat interface
2. Frontend sends message + conversation history to `/api/message`
3. Backend calls Groq API to generate fairy's response
4. Backend converts text response to audio via ElevenLabs
5. Frontend displays text and plays audio response
6. Conversation continues with full context
