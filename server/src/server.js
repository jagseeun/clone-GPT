import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory fallback if DB is not yet started
let mockConversations = [
  {
    id: 'conv-sample-1',
    title: 'React와 Node.js 연동 방법',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'conv-sample-2',
    title: 'DeepSeek API 사용 가이드',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

let mockMessages = {
  'conv-sample-1': [
    { id: 'm1', role: 'user', content: 'React와 Node.js를 어떻게 연동하나요?', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', role: 'assistant', content: 'React 프론트엔드와 Node.js(Express) 백엔드는 주로 RESTful API 또는 SSE(Server-Sent Events), WebSocket 등을 통해 통신합니다.\n\n```javascript\nfetch("http://localhost:5000/api/health")\n  .then(res => res.json())\n  .then(data => console.log(data));\n```\n위와 같이 프론트엔드에서 백엔드 API를 호출할 수 있습니다.', created_at: new Date(Date.now() - 3590000).toISOString() }
  ],
  'conv-sample-2': [
    { id: 'm3', role: 'user', content: 'DeepSeek API 특징을 알려줘', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm4', role: 'assistant', content: 'DeepSeek API는 OpenAI 호환 인터페이스를 지원하며 고성능 추론 및 코딩에 특화된 모델(deepseek-chat, deepseek-reasoner)을 합리적인 비용으로 제공합니다.', created_at: new Date(Date.now() - 86390000).toISOString() }
  ]
};

let dbConnected = false;

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CloneGPT Backend',
    database: dbConnected ? 'connected' : 'disconnected (mock mode)',
    timestamp: new Date().toISOString()
  });
});

// 2. Get all conversations
app.get('/api/conversations', async (req, res) => {
  if (dbConnected) {
    try {
      const result = await pool.query('SELECT * FROM conversations ORDER BY updated_at DESC');
      return res.json(result.rows);
    } catch (err) {
      console.error('DB query error:', err.message);
    }
  }
  return res.json(mockConversations);
});

// 3. Create a new conversation
app.post('/api/conversations', async (req, res) => {
  const { title } = req.body;
  const convTitle = title || '새로운 대화';

  if (dbConnected) {
    try {
      const result = await pool.query(
        'INSERT INTO conversations (title) VALUES ($1) RETURNING *',
        [convTitle]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('DB insert error:', err.message);
    }
  }

  const newConv = {
    id: 'conv-' + Date.now(),
    title: convTitle,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockConversations.unshift(newConv);
  mockMessages[newConv.id] = [];
  return res.status(201).json(newConv);
});

// 4. Get conversation messages
app.get('/api/conversations/:id', async (req, res) => {
  const { id } = req.params;
  if (dbConnected) {
    try {
      const convResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [id]);
      if (convResult.rows.length === 0) {
        return res.status(404).json({ error: '대화를 찾을 수 없습니다.' });
      }
      const msgResult = await pool.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [id]
      );
      return res.json({
        conversation: convResult.rows[0],
        messages: msgResult.rows
      });
    } catch (err) {
      console.error('DB query error:', err.message);
    }
  }

  const conv = mockConversations.find(c => c.id === id);
  if (!conv) {
    return res.status(404).json({ error: '대화를 찾을 수 없습니다.' });
  }
  return res.json({
    conversation: conv,
    messages: mockMessages[id] || []
  });
});

// 5. Delete conversation
app.delete('/api/conversations/:id', async (req, res) => {
  const { id } = req.params;
  if (dbConnected) {
    try {
      await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
      return res.json({ success: true, message: '대화방이 삭제되었습니다.' });
    } catch (err) {
      console.error('DB delete error:', err.message);
    }
  }

  mockConversations = mockConversations.filter(c => c.id !== id);
  delete mockMessages[id];
  return res.json({ success: true, message: '대화방이 삭제되었습니다.' });
});

// 6. Send message (2주차 기본 동작 및 3주차 DeepSeek 연동 베이스)
app.post('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
  }

  // 1~2주차: 기본 에코 및 AI 시뮬레이션 응답
  const userMsg = {
    id: 'user-' + Date.now(),
    role: 'user',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  const aiMsg = {
    id: 'ai-' + (Date.now() + 1),
    role: 'assistant',
    content: `안녕하세요! CloneGPT 2주차 프로토타입 응답입니다.\n\n전송하신 메시지: **"${content.trim()}"**\n\n현재 화면 개발 및 기본 연동 단계이며, 3주차에 DeepSeek API 연동을 통해 실시간 스트리밍 AI 답변이 연결될 예정입니다.`,
    created_at: new Date(Date.now() + 1000).toISOString()
  };

  if (dbConnected) {
    try {
      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [id, userMsg.role, userMsg.content]
      );
      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [id, aiMsg.role, aiMsg.content]
      );
      await pool.query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (err) {
      console.error('DB insert message error:', err.message);
    }
  } else {
    if (!mockMessages[id]) mockMessages[id] = [];
    mockMessages[id].push(userMsg, aiMsg);
  }

  return res.status(201).json({
    userMessage: userMsg,
    assistantMessage: aiMsg
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 CloneGPT Backend Server running on http://localhost:${PORT}`);
  dbConnected = await initDatabase();
});
