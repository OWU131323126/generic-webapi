const express = require('express');
const fs = require('fs');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

/* ======================
   設定
====================== */
const MODEL = 'gpt-4o-mini';
const OPENAI_API_ENDPOINT =
  'https://openai-api-proxy-746164391621.us-west1.run.app';

/* ======================
   prompt.md 読み込み（占い用）
====================== */
let promptTemplate;
try {
  promptTemplate = fs.readFileSync('prompt.md', 'utf8');
} catch (err) {
  console.error('prompt.md が読み込めません', err);
  process.exit(1);
}

/* ======================
   占いAPI
====================== */
app.post('/api/fortune', async (req, res) => {
  try {
    const { birthDate, health } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    const finalPrompt = promptTemplate
      .replace(/\$\{birthDate\}/g, birthDate)
      .replace(/\$\{today\}/g, today)
      .replace(/\$\{health\}/g, JSON.stringify(health, null, 2));

    const fortunes = await callOpenAIForFortune(finalPrompt);

    res.json({ fortunes });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '占い生成エラー' });
  }
});

/* ======================
   🔮 OpenAI（占い専用：JSON）
====================== */
async function callOpenAIForFortune(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が設定されていません');
  }

  const response = await fetch(OPENAI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  const raw = data.choices[0].message.content;

  const parsed = JSON.parse(raw);
  return parsed.fortunes;
}

/* ======================
   💬 OpenAI（チャット専用：文章）
====================== */
async function callOpenAIForChat(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY が設定されていません');
  }

  const response = await fetch(OPENAI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: prompt }]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/* ======================
   🔥 AIチャット（Socket.IO）
====================== */
io.on('connection', socket => {
  console.log('ユーザー接続');

  socket.on('user-message', async text => {
    console.log('CHAT:', text);

    try {
      const agents = [
        {
          agent: 'western',
          name: '西洋占星術AI',
          system: `
あなたは西洋占星術師です。
相談内容に対して、星回り・性格・心理傾向から助言してください。
`
        },
        {
          agent: 'eastern',
          name: '東洋占術AI',
          system: `
あなたは東洋占術師です。
相談内容を「気・流れ・陰陽」の観点から読み解いてください。
`
        },
        {
          agent: 'science',
          name: '科学分析AI',
          system: `
あなたは科学的分析AIです。
心理学・行動科学・統計っぽく現実的に分析してください。
`
        }
      ];

      for (const a of agents) {
        const reply = await callOpenAIForChat(
          `${a.system}\n\nユーザーの相談:\n${text}`
        );

        socket.emit('ai-message', {
          agent: a.agent,
          name: a.name,
          message: reply
        });
      }

    } catch (err) {
      console.error(err);
      socket.emit('ai-message', {
        agent: 'system',
        name: 'System',
        message: 'AIの応答中にエラーが起きました'
      });
    }
  });
});

/* ======================
   起動
====================== */
server.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
