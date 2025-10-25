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

  // Show loading status
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
