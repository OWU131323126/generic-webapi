/* =======================
   タブ切替
======================= */
function openTab(i) {
  document.querySelectorAll('.tab').forEach((t, n) => {
    t.classList.toggle('active', n === i);
  });
  document.querySelectorAll('.panel').forEach((p, n) => {
    p.classList.toggle('active', n === i);
  });
}

/* =======================
   占い画面ロジック
======================= */
async function generateFortune() {
  const birthDateVal = document.getElementById('birthDate').value;

  const health = {
    sleep: document.getElementById('sleep').value,
    mood: document.getElementById('mood').value,
    body: document.getElementById('body').value,
    stress: document.getElementById('stress').value
  };

  const today = new Date().toLocaleDateString('ja-JP');

  const loading = document.getElementById('loading');
  const resultDiv = document.getElementById('result');

  // 🔮 占い中表示 ON
  loading.style.display = 'block';
  resultDiv.innerHTML = '';

  try {
    const res = await fetch('/api/fortune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthDate: birthDateVal, health, today })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    const data = await res.json();

    for (const key in data.fortunes) {
      const f = data.fortunes[key];
      const div = document.createElement('div');
      div.className = `fortune ${key}`;
      div.innerHTML = `
        <strong>${f.type}</strong>
        <p>${f.result}</p>
        <p>運勢：${f.luck}</p>
      `;
      resultDiv.appendChild(div);
    }
  } catch (err) {
    console.error('占い取得エラー:', err);
    alert('占いに失敗しました');
  } finally {
    // 🔮 占い中表示 OFF
    loading.style.display = 'none';
  }
}


/* =======================
   グループAIチャット
======================= */
// socket.io クライアント接続
const socket = io();

const chat = document.getElementById('chat');
const chatInput = document.getElementById('chatInput');

const chatLoading = document.getElementById('chatLoading');

function sendChat() {
  const text = chatInput.value.trim(); // ← 修正
  if (!text) return;

  chat.innerHTML += `<div class="msg user">👤 ${text}</div>`;
  chat.scrollTop = chat.scrollHeight;

  chatLoading.style.display = 'block';

  socket.emit('user-message', text);
  chatInput.value = ''; // ← 修正
}



// サーバーからのAIメッセージ
socket.on('ai-message', d => {
  chat.innerHTML += `
    <div class="msg ${d.agent}">
      <strong>${d.name}</strong><br>
      ${d.message}
    </div>`;

  chat.scrollTop = chat.scrollHeight;

  // 🔥 最後のAIが来たら送信中を消す
  if (d.agent === 'science') {
    chatLoading.style.display = 'none';
  }
});

/* =======================
   クリスタルボール描画
======================= */
// p5.js 前提
let angle = 0;

function setup() {
  const c = createCanvas(260, 260, WEBGL);
  c.parent(document.getElementById('crystal'));
}

function draw() {
  background(0);
  rotateY(angle);
  ambientLight(180);
  ambientMaterial(120, 120, 255);
  sphere(90);
  angle += 0.01;
}
