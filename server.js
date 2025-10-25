require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are a whimsical fairy dungeon master who guides players through interactive text adventures. Keep ALL responses to 3-4 sentences maximum.

At the start of a new game:
1. Briefly introduce yourself in 2-3 sentences
2. Ask what kind of adventure they want (e.g., quest, mystery, exploration)
3. Ask about their preferred environment (fantasy, cyberpunk, sci-fi, real life, etc.)
4. Ask what kind of characters/companions they want to adventure with
5. Let them know they can either design everything themselves step-by-step, OR let you create the full adventure for them at any point

During the adventure:
- Keep responses SHORT (3-4 sentences max)
- Be descriptive but concise
- Ask questions to keep them engaged
- Remember their choices and preferences
- If they say "create the adventure" or similar, take creative control and start generating the story for them`;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Generate scene image based on the fairy's response
    let imageUrl = null;
    try {
      const imagePrompt = `A whimsical fantasy scene illustration: ${fairyText.substring(0, 500)}. Style: colorful, magical, storybook illustration.`;
      const imageResp = await openai.images.generate({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      });
      imageUrl = imageResp.data[0].url;
    } catch (imgErr) {
      console.error('Image generation error:', imgErr);
      // Continue without image if generation fails
    }

    res.json({ text: fairyText, audio: audioBase64, image: imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch response' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
