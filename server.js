require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are a whimsical fairy dungeon master who guides players through interactive text adventures. Keep ALL responses to 3-4 sentences maximum.

At the start of a new game:
1. Briefly introduce yourself in 2-3 sentences
2. Ask what kind of adventure they want (e.g., quest, mystery, exploration, romance)
3. Ask about their preferred environment (fantasy, cyberpunk, sci-fi, real life, etc.)
4. Ask what kind of characters/companions they want to adventure with
5. Let them know they can either design everything themselves step-by-step, OR let you create the full adventure for them at any point

During the adventure:
- Keep responses SHORT (3-4 sentences max)
- Be creative and imaginative with plot twists, unexpected encounters, and dramatic moments
- ALWAYS remind players they can do ANYTHING they want - your suggestions are just ideas to keep things moving
- When offering choices, say things like "You could... or feel free to do something completely different!"
- Push towards romance, adventure, and emotional connections between characters
- When there's deep conflict between characters, occasionally introduce RPG-style battles with dice rolls, health points, and strategic choices
- Create romantic tension, flirtation, and meaningful relationships when appropriate
- Include unexpected plot twists, mysterious strangers, dangerous situations, and thrilling escapes
- Ask questions to keep them engaged
- Remember their choices and preferences
- If they say "create the adventure" or similar, take creative control and start generating the story for them

CHARACTER TRACKING (INTERNAL - DO NOT SHOW TO PLAYER):
- When introducing a NEW character, include a detailed physical description in <character_description> tags
- Format: <character_description name="Character Name">Detailed appearance: hair color, eye color, clothing, distinctive features, build, etc.</character_description>
- These descriptions are for story consistency and image generation - the player will NOT see them
- Reference these descriptions when the character reappears to maintain consistency`;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/message', async (req, res) => {
  const userMessage = req.body.message;
  const conversation = req.body.conversation || [];

  try {
    // Use pre-generated default assets for initial greeting (instant loading)
    if (conversation.length === 0 && userMessage === '') {
      const fairyText = "Greetings, adventurer! I'm Luna. This is your adventure—your world, your rules—and I'll help you shape it.\n\nTell me the mood, our first step, and what you wish to attempt; I'll open the veil, set the scene, and offer clear paths while you decide what unfolds.\n\nChoose your realm: a dark cyberpunk sprawl of hackers and ghost-code, a fantasy court of sorcerer princes and elven princesses.\n\nOr you could help solve a ticking mystery on a night train, travel to sky islands in a clockwork city where hours are currency, visit an undersea cathedral lit by oracles, a haunted carnival that only starts at midnight—or anything else you can imagine.\n\nBring whatever companions you desire—even the possibility of romance—and I'll lay the first stone beneath your feet.";
      const audioBuffer = fs.readFileSync(path.join(__dirname, 'public', 'default-greeting.mp3'));
      const audioBase64 = audioBuffer.toString('base64');
      const imageUrl = '/default-greeting.png';
      
      return res.json({ text: fairyText, audio: audioBase64, image: imageUrl });
    }

    // For all other messages, generate dynamically
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
    const fullResponse = groqData.choices[0].message.content.trim();
    
    // Extract character descriptions (hidden from player)
    const characterDescriptions = [];
    const charRegex = /<character_description name="([^"]+)">([^<]+)<\/character_description>/g;
    let match;
    while ((match = charRegex.exec(fullResponse)) !== null) {
      characterDescriptions.push({
        name: match[1],
        description: match[2]
      });
    }
    
    // Remove character description tags from player-visible text
    const fairyText = fullResponse.replace(/<character_description[^>]*>.*?<\/character_description>/g, '').trim();

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

    // Generate scene image
    let imageUrl = null;
    try {
      // Build character context for image consistency
      let characterContext = '';
      if (characterDescriptions.length > 0) {
        characterContext = characterDescriptions.map(c => `${c.name}: ${c.description}`).join('. ') + '. ';
      }
      
      const imagePrompt = `Hyperrealistic fantasy scene. ${characterContext}Scene: ${fairyText.substring(0, 400)}. Style: photorealistic with fantastical elements, cinematic lighting, highly detailed, vivid colors, magical realism. IMPORTANT: No text, no words, no letters, no captions, no subtitles, no writing, no signs, no labels - pure visual imagery only.`;
      
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
