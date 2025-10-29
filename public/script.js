const messagesDiv = document.getElementById('messages');
const messagesWrapper = document.getElementById('messagesWrapper');
const fadeTop = document.querySelector('.fadeTop');
const fadeBottom = document.querySelector('.fadeBottom');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const fairyAudio = document.getElementById('fairyAudio');
const sceneImage = document.getElementById('sceneImage');
const imageStatus = document.getElementById('imageStatus');
const startBtn = document.getElementById('startBtn');

let conversation = [];
let characters = {}; // Track all characters throughout the adventure
let settings = {}; // Track all settings/locations throughout the adventure
let adventureStarted = false;

// Prevent scroll-into-view behavior on mobile when focusing input
userInput.addEventListener('focus', (e) => {
  e.preventDefault();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  setTimeout(() => {
    window.scrollTo(scrollX, scrollY);
  }, 0);
});

// Update fade indicators based on scroll position
function updateFadeIndicators() {
  const atTop = messagesDiv.scrollTop <= 10;
  const atBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight <= 10;
  
  if (atTop) {
    fadeTop.classList.remove('visible');
  } else {
    fadeTop.classList.add('visible');
  }
  
  if (atBottom) {
    fadeBottom.classList.remove('visible');
  } else {
    fadeBottom.classList.add('visible');
  }
}

// Listen for scroll events
messagesDiv.addEventListener('scroll', updateFadeIndicators);

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender === 'You' ? 'message user-message' : 'message fairy-message';
  
  // Use innerHTML for Luna to allow bold formatting
  if (sender === 'Luna') {
    div.innerHTML = `<strong>Luna</strong>: ${text}`;
  } else {
    div.textContent = `${sender}: ${text}`;
  }
  
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  updateFadeIndicators();
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  appendMessage('You', text);
  conversation.push({ role: 'user', content: text });
  userInput.value = '';

  // Show loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loadingMessage';
  loadingDiv.textContent = '✨ Please wait while AI is working its magic... ✨';
  loadingDiv.id = 'loadingMessage';
  messagesDiv.appendChild(loadingDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  imageStatus.textContent = 'Generating scene illustration...';
  sendBtn.disabled = true;
  
  try {
    const resp = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, conversation, characters, settings })
    });

    const data = await resp.json();
    
    // Remove loading message
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.remove();
    
    // Check for text generation errors
    if (!resp.ok || data.textError) {
      const errorMessage = data.textError || 'Failed to get a response.';
      appendMessage('Error', errorMessage);
      imageStatus.textContent = '⚠️ Response generation failed';
      imageStatus.style.color = '#ff9999';
      sendBtn.disabled = false;
      return;
    }
    
    appendMessage('Luna', data.text);
    conversation.push({ role: 'assistant', content: data.text });
    
    // Update character and setting databases
    if (data.characters) {
      characters = data.characters;
    }
    if (data.settings) {
      settings = data.settings;
    }

    const audioSrc = `data:audio/mpeg;base64,${data.audio}`;
    fairyAudio.src = audioSrc;
    
    // Try to play audio, but don't block if browser prevents it
    try {
      await fairyAudio.play();
    } catch (audioErr) {
      // Browser blocked autoplay or audio error - user can manually click play
      console.log('Audio play failed - user can click play manually');
    }

    // Display generated image or error
    if (data.image) {
      sceneImage.src = data.image;
      sceneImage.style.display = 'block';
      imageStatus.style.display = 'none';
    } else if (data.imageError) {
      imageStatus.textContent = `⚠️ ${data.imageError}`;
      imageStatus.style.display = 'block';
      imageStatus.style.color = '#ff9999';
    } else {
      imageStatus.textContent = 'Image generation unavailable for this response.';
      imageStatus.style.display = 'block';
    }
  } catch (err) {
    // Remove loading message
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.remove();
    
    appendMessage('Error', 'Failed to get a response.');
    imageStatus.textContent = 'Error generating image.';
    console.error(err);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Function to start the adventure with user interaction
async function startAdventure() {
  if (adventureStarted) return;
  adventureStarted = true;
  
  startBtn.style.display = 'none';
  imageStatus.textContent = 'Loading your adventure...';
  imageStatus.style.display = 'block';
  
  try {
    // Send empty message to get cached greeting (no API calls, instant response)
    const resp = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '', conversation: [] })
    });

    if (!resp.ok) throw new Error('Server error');
    const data = await resp.json();
    
    appendMessage('Luna', data.text);
    conversation.push({ role: 'assistant', content: data.text });
    
    // Update character and setting databases
    if (data.characters) {
      characters = data.characters;
    }
    if (data.settings) {
      settings = data.settings;
    }

    const audioSrc = `data:audio/mpeg;base64,${data.audio}`;
    fairyAudio.src = audioSrc;
    
    // Play audio (now with user interaction, it should work)
    try {
      await fairyAudio.play();
    } catch (audioErr) {
      console.log('Audio play failed:', audioErr);
    }

    if (data.image) {
      sceneImage.src = data.image;
      sceneImage.style.display = 'block';
      imageStatus.style.display = 'none';
    } else {
      imageStatus.textContent = 'Ready to begin your adventure!';
    }
  } catch (err) {
    imageStatus.textContent = 'Error starting adventure. Please try again.';
    console.error(err);
    startBtn.style.display = 'block';
    adventureStarted = false;
  }
}

// Show start button on page load
window.addEventListener('load', () => {
  startBtn.style.display = 'block';
  imageStatus.textContent = 'Click "Start Adventure" to begin!';
});

startBtn.addEventListener('click', startAdventure);
