require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = "You are a whimsical fairy that serves as a dungeon master guiding the player through a fantasy text adventure.";
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

app.post('/api/message', async (req, res) => {
  const userMessage = req.body.message;
  const conversation = req.body.conversation || [];

  try {
    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversation,
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!groqResp.ok) {
      const errText = await groqResp.text();
      throw new Error(`Groq API error: ${errText}`);
    }

    const groqData = await groqResp.json();
    const fairyText = groqData.choices[0].message.content.trim();

    const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: fairyText, voice_settings: { stability: 0.4, similarity_boost: 0.8 } })
    });

    if (!ttsResp.ok) {
      const errText = await ttsResp.text();
      throw new Error(`ElevenLabs API error: ${errText}`);
    }

    const arrayBuffer = await ttsResp.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

    res.json({ text: fairyText, audio: audioBase64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch response' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
