const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const fairyAudio = document.getElementById('fairyAudio');
const sceneImage = document.getElementById('sceneImage');
const imageStatus = document.getElementById('imageStatus');

let conversation = [];

function appendMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender === 'You' ? 'message user-message' : 'message fairy-message';
  div.textContent = `${sender}: ${text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
      body: JSON.stringify({ message: text, conversation })
    });

    if (!resp.ok) throw new Error('Server error');
    const data = await resp.json();
    
    // Remove loading message
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.remove();
    
    appendMessage('Fairy', data.text);
    conversation.push({ role: 'assistant', content: data.text });

    const audioSrc = `data:audio/mpeg;base64,${data.audio}`;
    fairyAudio.src = audioSrc;
    await fairyAudio.play();

    // Display generated image
    if (data.image) {
      sceneImage.src = data.image;
      sceneImage.style.display = 'block';
      imageStatus.style.display = 'none';
    } else {
      imageStatus.textContent = 'Image generation unavailable for this response.';
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
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-start the game with fairy's introduction (instant load with cached assets)
window.addEventListener('load', async () => {
  if (conversation.length === 0) {
    imageStatus.textContent = 'Welcome! Starting your adventure...';
    
    try {
      // Send empty message to get cached greeting (no API calls, instant response)
      const resp = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', conversation: [] })
      });

      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      
      appendMessage('Fairy', data.text);
      conversation.push({ role: 'assistant', content: data.text });

      const audioSrc = `data:audio/mpeg;base64,${data.audio}`;
      fairyAudio.src = audioSrc;
      await fairyAudio.play();

      if (data.image) {
        sceneImage.src = data.image;
        sceneImage.style.display = 'block';
        imageStatus.style.display = 'none';
      } else {
        imageStatus.textContent = 'Ready to begin your adventure!';
      }
    } catch (err) {
      imageStatus.textContent = 'Welcome! Type a message to begin.';
      console.error(err);
    }
  }
});
