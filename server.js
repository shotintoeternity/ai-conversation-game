require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Validate required API keys on startup
const requiredKeys = ['ELEVENLABS_API_KEY', 'MODELSLAB_API_KEY'];
const missingKeys = requiredKeys.filter(key => !process.env[key]);
if (missingKeys.length > 0) {
  console.error(`❌ STARTUP FAILED: Missing required environment variables: ${missingKeys.join(', ')}`);
  console.error('Please configure these keys in Replit Secrets.');
  process.exit(1);
}
console.log('✅ All required API keys are configured');

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

CHARACTER TRACKING - FORENSIC, INHUMAN LEVELS OF DETAIL REQUIRED:
- Weave physical descriptions naturally into storytelling (hair, eyes, clothing)
- ALSO add hidden <character_description> tags AFTER response for PERFECT image consistency
- Format: <character_description name="Name">Species/ethnicity (e.g., High Elf Nordic/Human Japanese/Neko catgirl), Age (exact number), Height (exact with inches), Build (precise body type), Skin (exact tone with undertones + texture + any marks/freckles), Face (exact shape), Eyes (exact color with details like flecks/rings + shape + eyelash details), Eyebrows (exact shape + color + thickness), Nose (exact shape + size), Lips (exact fullness + color), Jaw/Cheeks (exact bone structure), Hair (exact length measurement + exact color including highlights + exact texture + exact style with specifics), Body (exact proportions + measurements if relevant), Clothing HEAD-TO-TOE (EVERY SINGLE garment from head to feet: exact material + exact color + exact pattern/design + exact fit + fasteners/buttons + condition), Accessories (EVERY item with exact placement + material + color), Distinctive features (scars/birthmarks/tattoos with EXACT locations + size + color), Posture (exact stance/positioning), Expression (facial expression details)</character_description>
- Example: <character_description name="Aria">High Elf with Nordic features, appears 24 years old, 5'8" athletic build, fair porcelain skin with cool undertones and faint rose undertone on cheeks, oval face, almond-shaped emerald eyes with gold flecks around pupils and thick dark lashes, arched dark brown eyebrows, straight refined nose, full rose-pink lips, high pronounced cheekbones and defined angular jaw, long silver-white hair reaching mid-back in fishtail braid over right shoulder with loose tendrils framing face, slender athletic proportions with toned arms and legs, forest-green leather armor with gold leaf embroidery on shoulders over cream linen tunic with drawstring neckline, dark brown leather belt with silver Celtic knotwork buckle, fitted green leather pants tucked into black knee-high riding boots with silver buckles, silver crescent moon pendant necklace on 16-inch chain and small silver hoop earrings, thin diagonal scar through left eyebrow (1 inch long), pointed elf ears extending 2 inches beyond human ears, confident upright posture with hand resting on sword hilt, slight smile</character_description>
- BE FORENSICALLY DETAILED - use INHUMAN levels of precision - describe EVERY visible detail
- If a character is already established, ALWAYS include their COMPLETE description in subsequent responses when they appear
- Players never see these tags - they maintain PERFECT visual consistency across ALL images

SETTING TRACKING:
- When establishing a new setting/location, include hidden setting details in <setting_description> tags
- Format: <setting_description name="Location Name">Detailed environment: time of day, weather, lighting quality, architectural style, colors, materials, atmosphere, key visual elements, cultural influences</setting_description>
- Example: <setting_description name="Moonlit Forest">Dense ancient forest at night, full moon casting silver light through canopy, twisted oak and pine trees with moss-covered trunks, misty atmosphere with blue-gray fog, bioluminescent mushrooms glowing soft green along forest floor, Celtic-inspired stone ruins visible in background, cool color palette of blues and greens, ethereal and mysterious mood</setting_description>
- Include setting context when the scene remains in the same location`;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


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
    // COMMENTED OUT: Groq API (replaced with ModelsLab Uncensored Chat)
    // console.log('Sending request to Groq API...');
    // const controller = new AbortController();
    // const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    // 
    // try {
    //   var groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       model: 'llama-3.3-70b-versatile',
    //       messages: [
    //         { role: 'system', content: SYSTEM_PROMPT },
    //         ...conversation,
    //         { role: 'user', content: userMessage }
    //       ]
    //     }),
    //     signal: controller.signal
    //   });
    // } catch (fetchErr) {
    //   clearTimeout(timeout);
    //   if (fetchErr.name === 'AbortError') {
    //     return res.status(504).json({ 
    //       error: 'Request timeout',
    //       textError: 'The AI is taking too long to respond. Please try again with a simpler message.'
    //     });
    //   }
    //   throw fetchErr;
    // }
    // clearTimeout(timeout);
    // console.log('Groq API response received');
    //
    // if (!groqResp.ok) {
    //   const errText = await groqResp.text();
    //   throw new Error(`Groq API error: ${errText}`);
    // }
    //
    // const groqData = await groqResp.json();
    // 
    // // Check if response was blocked or filtered
    // if (!groqData.choices || groqData.choices.length === 0) {
    //   return res.status(400).json({ 
    //     error: 'Content generation failed',
    //     textError: 'Luna was unable to generate a response for this interaction. Please try a different approach.'
    //   });
    // }
    // 
    // const choice = groqData.choices[0];
    // 
    // // Check for content filtering
    // if (choice.finish_reason === 'content_filter' || choice.finish_reason === 'safety') {
    //   return res.status(400).json({ 
    //     error: 'Content filtered',
    //     textError: 'This content was blocked by safety filters. Please try a different direction for your adventure.'
    //   });
    // }
    // 
    // const fullResponse = choice.message?.content?.trim();

    // NEW: ModelsLab Uncensored Chat API (chat completions endpoint)
    console.log('Sending request to ModelsLab Uncensored Chat API...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      var modelsLabChatResp = await fetch('https://modelslab.com/api/uncensored-chat/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MODELSLAB_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'ModelsLab/Llama-3.1-8b-Uncensored-Dare',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conversation,
            { role: 'user', content: userMessage }
          ],
          max_tokens: 1500,
          temperature: 0.7,
          top_p: 0.9
        }),
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ 
          error: 'Request timeout',
          textError: 'The AI is taking too long to respond. Please try again with a simpler message.'
        });
      }
      throw fetchErr;
    }
    clearTimeout(timeout);
    console.log('ModelsLab Chat API response received');

    if (!modelsLabChatResp.ok) {
      const errText = await modelsLabChatResp.text();
      console.error('ModelsLab Chat API error:', errText);
      throw new Error(`ModelsLab Chat API error (${modelsLabChatResp.status}): ${errText}`);
    }

    const modelsLabChatData = await modelsLabChatResp.json();
    console.log('ModelsLab Chat response:', JSON.stringify(modelsLabChatData).substring(0, 500));
    
    // Check if response has choices
    if (!modelsLabChatData.choices || modelsLabChatData.choices.length === 0) {
      console.error('No choices in response:', modelsLabChatData);
      return res.status(400).json({ 
        error: 'Content generation failed',
        textError: 'Luna was unable to generate a response for this interaction. Please try a different approach.'
      });
    }
    
    // Check if message content is null or empty
    const responseMessage = modelsLabChatData.choices[0].message;
    if (!responseMessage || !responseMessage.content || responseMessage.content.trim() === '') {
      console.error('Empty or null message in response. Finish reason:', modelsLabChatData.choices[0].finish_reason);
      console.error('Full response:', JSON.stringify(modelsLabChatData));
      return res.status(400).json({ 
        error: 'Empty response',
        textError: 'Luna generated an empty response. Please try rephrasing your message or making it shorter.'
      });
    }
    
    const fullResponse = responseMessage.content.trim();
    
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

    console.log('Fairy text extracted, length:', fairyText.length);
    console.log('Calling ElevenLabs TTS...');
    
    const ttsResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: fairyText, voice_settings: { stability: 0.4, similarity_boost: 0.8 } })
    });
    
    console.log('ElevenLabs response received, status:', ttsResp.status);

    if (!ttsResp.ok) {
      const errText = await ttsResp.text();
      throw new Error(`ElevenLabs API error: ${errText}`);
    }

    console.log('Converting audio to base64...');
    const arrayBuffer = await ttsResp.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Audio base64 length:', audioBase64.length);

    // Generate scene image
    console.log('Starting image generation...');
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
      
      // Include ALL characters from the current response with COMPLETE forensic detail
      // Use newCharacters (just extracted from this response) to ensure we capture
      // characters referenced in hidden tags even if not named in visible text
      let characterContext = '';
      if (Object.keys(newCharacters).length > 0) {
        // Include ALL characters from THIS response with their COMPLETE forensic descriptions
        // This ensures perfect visual consistency across all images
        const characterDescriptions = Object.entries(newCharacters).map(([name, desc]) => {
          return `${name}: ${desc}`;
        });
        characterContext = characterDescriptions.join('; ') + '. ';
      } else if (Object.keys(allCharacters).length > 0) {
        // Fallback: if no new characters in this response, use the most recent character
        const characterEntries = Object.entries(allCharacters);
        const lastCharacter = characterEntries[characterEntries.length - 1];
        characterContext = `${lastCharacter[0]}: ${lastCharacter[1]}. `;
      }
      
      // Build ModelsLab-optimized prompt with COMPLETE character descriptions
      let modelsLabPrompt = '';
      
      // PRIORITY 1: Include ALL character descriptions with FORENSIC detail
      if (characterContext) {
        // Use the COMPLETE forensic character descriptions for perfect consistency
        modelsLabPrompt = characterContext.replace(/\. $/, '');
      } else {
        // Fallback to scene description only if no characters are tracked
        modelsLabPrompt = fairyText.substring(0, 400);
      }
      
      // PRIORITY 2: Add setting details for environmental context
      if (settingContext) {
        modelsLabPrompt += `. ${settingContext.replace('Setting: ', '').replace(/\. $/, '')}`;
      }
      
      // PRIORITY 3: Add scene action/context from Luna's current narration
      // Include key action/scene details from the visible text
      const sceneAction = fairyText.substring(0, 250).trim();
      if (characterContext && sceneAction.length > 20) {
        modelsLabPrompt += `. Scene action: ${sceneAction}`;
      }
      
      // Add ModelsLab best practice quality modifiers
      modelsLabPrompt += ', ultra realistic, photorealistic, hyperrealistic, 8K RAW photo, sharp focus, intricate details, highly detailed, vivid colors, cinematic lighting, volumetric fog, perfect composition, correct anatomy, flawless skin texture, natural lighting, professional photography, Canon EOS R3, f/1.4, ISO 200';
      
      console.log('ModelsLab prompt preview:', modelsLabPrompt.substring(0, 150) + '...');
      
      // COMMENTED OUT: OpenAI DALL-E 3 image generation
      // console.log('Calling OpenAI DALL-E...');
      // const imageResp = await openai.images.generate({
      //   model: 'dall-e-3',
      //   prompt: imagePrompt,
      //   n: 1,
      //   size: '1024x1024',
      //   quality: 'standard'
      // });
      // console.log('Image generated successfully');
      // imageUrl = imageResp.data[0].url;

      // NEW: ModelsLab API for image generation (NSFW-focused)
      console.log('Calling ModelsLab API...');
      const modelsLabResp = await fetch('https://modelslab.com/api/v6/images/text2img', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: modelsLabPrompt,
          model_id: 'omnigenxl-nsfw-sfw',
          width: 768,
          height: 768,
          samples: 1,
          negative_prompt: 'blurry, bad anatomy, extra fingers, extra limbs, bad hands, poorly drawn hands, poorly drawn face, mutation, deformed eyes, watermark, text, logo, signature, grainy, tiling, censored, ugly, noisy image, bad lighting, unnatural skin',
          num_inference_steps: 31,
          guidance_scale: 7.5,
          safety_checker: false,
          safety_checker_type: 'sensitive_content_text',
          base64: false,
          key: process.env.MODELSLAB_API_KEY
        })
      });

      console.log('ModelsLab response status:', modelsLabResp.status);
      
      if (!modelsLabResp.ok) {
        let errorResult;
        try {
          errorResult = await modelsLabResp.json();
        } catch (e) {
          errorResult = { error: { message: await modelsLabResp.text() } };
        }
        throw new Error(`ModelsLab API Error (${modelsLabResp.status}): ${errorResult.error?.message || modelsLabResp.statusText || 'Unknown error'}`);
      }

      const modelsLabData = await modelsLabResp.json();
      console.log('ModelsLab response:', JSON.stringify(modelsLabData).substring(0, 200));
      
      // Handle async processing
      if (modelsLabData.status === 'processing') {
        console.log(`Image is processing, ETA: ${modelsLabData.eta || 30}s, polling...`);
        const fetchUrl = modelsLabData.fetch_result;
        const maxAttempts = 30; // 60 seconds max (2s intervals)
        let attempt = 0;
        
        while (attempt < maxAttempts) {
          attempt++;
          // Wait 2 seconds before polling
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`Polling attempt ${attempt}/${maxAttempts}...`);
          const pollResp = await fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: process.env.MODELSLAB_API_KEY })
          });
          
          if (!pollResp.ok) {
            console.error('Polling failed, status:', pollResp.status);
            break;
          }
          
          const pollData = await pollResp.json();
          console.log('Poll response status:', pollData.status);
          
          if (pollData.status === 'success' && pollData.output && pollData.output.length > 0) {
            imageUrl = pollData.output[0];
            console.log('Image generated successfully from ModelsLab after polling');
            break;
          } else if (pollData.status === 'error') {
            console.error('ModelsLab error:', pollData.message);
            throw new Error(pollData.message || 'Image generation failed');
          }
          // else status is still "processing", continue polling
        }
        
        if (!imageUrl) {
          throw new Error('Image generation timed out');
        }
      } else if (modelsLabData.status === 'success' && modelsLabData.output && modelsLabData.output.length > 0) {
        // Immediate success (rare but possible)
        imageUrl = modelsLabData.output[0];
        console.log('Image generated successfully from ModelsLab (immediate)');
      } else {
        throw new Error(`Unexpected ModelsLab response status: ${modelsLabData.status}`);
      }
    } catch (imgErr) {
      console.error('Image generation error:', imgErr);
      if (imgErr.code === 'content_policy_violation') {
        imageError = 'Content filter triggered - image could not be generated';
      } else {
        imageError = 'Image generation failed';
      }
    }

    console.log('Sending response to client...');
    res.json({ text: fairyText, audio: audioBase64, image: imageUrl, imageError, characters: allCharacters, settings: allSettings });
    console.log('Response sent successfully');
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
