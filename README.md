# AI Conversation Game

This is a simple text-based fantasy game powered by Groq for language generation and ElevenLabs for text-to-speech. The game features a whimsical fairy who acts as a dungeon master.

## Running on Replit

1. Create a new Node.js Replit and add these files.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and fill in your API keys:
   - `GROQ_API_KEY` – your Groq API key.
   - `ELEVENLABS_API_KEY` – your ElevenLabs API key.
   - `ELEVENLABS_VOICE_ID` – (optional) the voice ID to use.
4. Run `node server.js` and open the web view.

Running in an environment without outbound network access will cause the Groq
and ElevenLabs API requests to fail. Ensure these services are reachable, or
use local stubs for development.

Type messages into the input box and listen to the fairy respond in real-time. The game sends your text to Groq's chat API ([docs](https://console.groq.com/docs/api-reference#chat-create)) and then converts the response to speech using ElevenLabs.
