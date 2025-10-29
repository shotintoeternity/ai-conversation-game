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
- ModelsLab Uncensored Chat API (DarkIdol Llama 3.1 8B NSFW) for AI conversations
- ElevenLabs API for text-to-speech (Voice ID: cgSgspJ2msm6clMCkdW9)
- ModelsLab API for hyperrealistic fantasy image generation
- Vanilla JavaScript frontend

## Configuration
- **Port**: 5000 (bound to 0.0.0.0 for Replit)
- **API Keys** (stored in Replit Secrets):
  - `MODELSLAB_API_KEY` - ModelsLab uncensored chat AND image generation
  - `ELEVENLABS_API_KEY` - Voice synthesis
  - `GROQ_API_KEY` - (Legacy, no longer used - commented out)
  - `OPENAI_API_KEY` - (Legacy, no longer used - commented out)

## Recent Changes (October 29, 2025)
- **Switched to ModelsLab Uncensored Chat** - Replaced Groq Llama 3.3 70B with ModelsLab Llama 3.1 8B Uncensored for unrestricted text generation
- **Switched to ModelsLab Image API** - Replaced OpenAI DALL-E 3 with ModelsLab for NSFW-focused hyperrealistic image generation
- **Disabled all safety controls** - Set `safety_checker: false` in ModelsLab API (compliance team will configure safety controls)
- **Implemented async polling system** - Handles ModelsLab's background image processing with automatic status polling (2s intervals, 60s timeout)
- **Secured API credentials** - ModelsLab API key now stored in Replit Secrets (used for both chat and images)
- **Current ModelsLab Chat configuration**:
  - Model: `aifeifei798/DarkIdol-Llama-3.1-8B-Instruct-1.2-Uncensored` (99.81% uncensored pass rate)
  - Endpoint: `https://modelslab.com/api/v6/completions` (regular endpoint with Bearer auth)
  - max_tokens: 500
  - temperature: 0.9, top_p: 0.95
  - No content filtering or safety checks
  - NSFW-optimized roleplay model
- **Current ModelsLab Image configuration**:
  - Model: `boziorealvisxlv4` with `nsfw-sdxl` LoRA
  - Resolution: 768x768 (capped in UI)
  - Scheduler: DPMSolverMultistepScheduler
  - 31 inference steps for quality
  - safety_checker: false (per compliance team requirements)
  - Dynamic prompt building from forensic character descriptions
  - Professional photography quality keywords
  - Comprehensive negative prompts for quality control
- **UI improvements**:
  - Removed "Create Your Own Adventure" title/logo for cleaner interface
  - Layout reversed: image panel on left (768x768 max), story panel on right
  - Invisible scrollbar with gradient fade indicators (top/bottom)
  - Increased text size (18px desktop, 17px tablet, 16px mobile)
  - Expanded message area (80vh height, up to 900px)
  - Mobile-responsive: image first, then text below
  - Clean, modern reading experience
- Commented out OpenAI DALL-E code in server.js for easy reference

## Previous Changes
- Initial setup in Replit environment
- Updated server to use port 5000 with host 0.0.0.0
- Configured workflow for automatic server start
- Set up API keys via Replit Secrets
- Added image generation - Each fairy response now includes a scene illustration
- Updated UI with split-panel layout for chat and images
- Upgraded AI model from Mixtral to Llama 3.3 70B (Groq)
- Switched to ModelsLab Llama 3.1 8B Uncensored (no content filtering)
- Implemented comprehensive error handling for all APIs
- Enhanced character tracking with forensic-level detail
- Mobile-responsive design with image-first layout
- Optimized system prompt (38% reduction)
- Commented out Groq and OpenAI code for reference

## How It Works
1. User types a message in the chat interface
2. Frontend sends message + conversation history to `/api/message`
3. Backend calls ModelsLab Uncensored Chat API (DarkIdol NSFW model) to generate fairy's response (3-4 sentences max)
4. Backend extracts character and setting tracking data from XML tags
5. Backend converts text response to audio via ElevenLabs
6. Backend generates hyperrealistic fantasy scene illustration via ModelsLab Image API
7. Frontend displays text, plays audio, and shows the generated image
8. Conversation continues with full context and character consistency
