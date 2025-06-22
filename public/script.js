const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const fairyAudio = document.getElementById('fairyAudio');

let conversation = [];

function appendMessage(sender, text) {
  const div = document.createElement('div');
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
    fairyAudio.style.display = 'block';
    await fairyAudio.play();
  } catch (err) {
    appendMessage('Error', 'Failed to get a response.');
    console.error(err);
  }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});
