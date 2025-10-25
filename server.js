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
- Occasionally remind players they have freedom to do anything (vary the language: "What do you do?", "The choice is yours", "though you could take a different path entirely", etc.) - but don't say this every single response
- Push towards romance, adventure, and emotional connections between characters
- When there's deep conflict between characters, occasionally introduce RPG-style battles with dice rolls, health points, and strategic choices
- Create romantic tension, flirtation, and meaningful relationships when appropriate
- Include unexpected plot twists, mysterious strangers, dangerous situations, and thrilling escapes
- Ask questions to keep them engaged
- Remember their choices and preferences
- If they say "create the adventure" or similar, take creative control and start generating the story for them

CHARACTER TRACKING:
- When introducing a NEW character, weave their physical description naturally into your storytelling (hair, eyes, clothing, distinctive features)
- Example: "A tall warrior with piercing blue eyes and a jagged scar across his cheek approaches - he introduces himself as Kael."
- ALSO include a hidden detailed description in <character_description> tags AFTER your visible response for image consistency
- Format: <character_description name="Character Name">DETAILED physical appearance - MUST include: race/nationality/species (human-Japanese, elf-Nordic, dwarf-Scottish, etc), exact skin tone (fair porcelain/tan/olive/brown/dark/etc), precise hair color and style with length, exact eye color and shape, complete outfit description with specific colors and materials, body build and height, facial features, distinctive marks/scars, apparent age, any accessories</character_description>
- Example: "You meet an elven archer named Aria." <character_description name="Aria">High elf with Nordic features, fair porcelain skin, long silver-white hair in a braid down to waist, bright emerald green almond-shaped eyes, tall slender athletic build 5'8", wearing dark forest-green leather armor with intricate gold elven leaf embroidery on shoulders, brown leather belt with ornate silver buckle, black knee-high boots, pointed elf ears, elegant angular facial features with high cheekbones, silver crescent moon pendant necklace, appears early twenties</character_description>
- BE EXTREMELY SPECIFIC about race/nationality, skin tone, hair color, outfit colors/materials, and facial features - these are critical for visual consistency
- The hidden tags maintain visual consistency across images - players only see the natural story descriptions
- Reference both the name and appearance details when characters reappear

SETTING TRACKING:
- When establishing a new setting/location, include hidden setting details in <setting_description> tags
- Format: <setting_description name="Location Name">Detailed environment: time of day, weather, lighting quality, architectural style, colors, materials, atmosphere, key visual elements, cultural influences</setting_description>
- Example: <setting_description name="Moonlit Forest">Dense ancient forest at night, full moon casting silver light through canopy, twisted oak and pine trees with moss-covered trunks, misty atmosphere with blue-gray fog, bioluminescent mushrooms glowing soft green along forest floor, Celtic-inspired stone ruins visible in background, cool color palette of blues and greens, ethereal and mysterious mood</setting_description>
- Include setting context when the scene remains in the same location`;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store character descriptions across the session
const characterDatabase = new Map();

app.post('/api/message', async (req, res) => {
  const userMessage = req.body.message;
  const conversation = req.body.conversation || [];
  const sessionCharacters = req.body.characters || {};
  const sessionSettings = req.body.settings || {};

  try {
    // Use pre-generated default assets for initial greeting (instant loading)
    if (conversation.length === 0 && userMessage === '') {
      const fairyText = "Greetings, adventurer! I'm Luna. This is your adventure—your world, your rules—and I'll help you shape it.\n\nTell me the mood, our first step, and what you wish to attempt; I'll open the veil, set the scene, and offer clear paths while you decide what unfolds.\n\nChoose your realm: a dark cyberpunk sprawl of hackers and ghost-code, a fantasy court of sorcerer princes and elven princesses.\n\nOr you could help solve a ticking mystery on a night train, travel to sky islands in a clockwork city where hours are currency, visit an undersea cathedral lit by oracles, a haunted carnival that only starts at midnight—or anything else you can imagine.\n\nBring whatever companions you desire—even the possibility of romance—and I'll lay the first stone beneath your feet.";
      const audioBuffer = fs.readFileSync(path.join(__dirname, 'public', 'default-greeting.mp3'));
      const audioBase64 = audioBuffer.toString('base64');
      
      // Load and encode default image as base64 for consistent cross-platform loading
      const imageBuffer = fs.readFileSync(path.join(__dirname, 'public', 'default-greeting.png'));
      const imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      return res.json({ text: fairyText, audio: audioBase64, image: imageBase64 });
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
    
    // Check if response was blocked or filtered
    if (!groqData.choices || groqData.choices.length === 0) {
      return res.status(400).json({ 
        error: 'Content generation failed',
        textError: 'Luna was unable to generate a response for this interaction. Please try a different approach.'
      });
    }
    
    const choice = groqData.choices[0];
    
    // Check for content filtering
    if (choice.finish_reason === 'content_filter' || choice.finish_reason === 'safety') {
      return res.status(400).json({ 
        error: 'Content filtered',
        textError: 'This content was blocked by safety filters. Please try a different direction for your adventure.'
      });
    }
    
    const fullResponse = choice.message?.content?.trim();
    
    // Check if response is empty
    if (!fullResponse) {
      return res.status(400).json({ 
        error: 'Empty response',
        textError: 'Luna was unable to respond. Please try rephrasing your message.'
      });
    }
    
    // Extract NEW character descriptions from this response
    const newCharacters = {};
    const charRegex = /<character_description name="([^"]+)">([^<]+)<\/character_description>/g;
    let match;
    while ((match = charRegex.exec(fullResponse)) !== null) {
      newCharacters[match[1]] = match[2];
    }
    
    // Extract NEW setting descriptions from this response
    const newSettings = {};
    const settingRegex = /<setting_description name="([^"]+)">([^<]+)<\/setting_description>/g;
    let settingMatch;
    while ((settingMatch = settingRegex.exec(fullResponse)) !== null) {
      newSettings[settingMatch[1]] = settingMatch[2];
    }
    
    // Merge with existing characters and settings from session
    const allCharacters = { ...sessionCharacters, ...newCharacters };
    const allSettings = { ...sessionSettings, ...newSettings };
    
    // Remove character and setting description tags from player-visible text
    const fairyText = fullResponse
      .replace(/<character_description[^>]*>.*?<\/character_description>/g, '')
      .replace(/<setting_description[^>]*>.*?<\/setting_description>/g, '')
      .trim();

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
    let imageError = null;
    try {
      // Build setting context
      let settingContext = '';
      const settingEntries = Object.entries(allSettings);
      if (settingEntries.length > 0) {
        // Use the most recent setting (last one added)
        const currentSetting = settingEntries[settingEntries.length - 1];
        settingContext = `Setting: ${currentSetting[1]}. `;
      }
      
      // Only include characters that are mentioned in the current response
      let characterContext = '';
      const characterEntries = Object.entries(allCharacters);
      if (characterEntries.length > 0) {
        // Find which characters are actually mentioned in this response
        const mentionedCharacters = characterEntries.filter(([name, desc]) => {
          return fairyText.toLowerCase().includes(name.toLowerCase());
        });
        
        if (mentionedCharacters.length > 0) {
          // Focus on the mentioned character(s), showing only one primary character
          const primaryCharacter = mentionedCharacters[0];
          characterContext = `Character focus: ${primaryCharacter[0]} - ${primaryCharacter[1]}. `;
        }
      }
      
      const imagePrompt = `Hyperrealistic fantasy scene focusing on the single most important character based on the current interaction. ${settingContext}${characterContext}Scene: ${fairyText.substring(0, 300)}. Style: photorealistic rendering with fantastical elements, cinematic lighting, highly detailed, vivid colors, magical realism. Show ONLY the most important character in this scene - do not include multiple versions or other characters. IMPORTANT: No text, no words, no letters, no captions, no subtitles, no writing, no signs, no labels - pure visual imagery only.`;
      
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
      if (imgErr.code === 'content_policy_violation') {
        imageError = 'Content filter triggered - image could not be generated';
      } else {
        imageError = 'Image generation failed';
      }
    }

    res.json({ text: fairyText, audio: audioBase64, image: imageUrl, imageError, characters: allCharacters, settings: allSettings });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch response',
      textError: 'An error occurred while generating the response. Please try again.'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
