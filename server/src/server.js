import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDatabase } from './config/db.js';
import { generateDeepSeekStream } from './services/deepseek.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory fallback if DB is not connected
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
    { id: 'm2', role: 'assistant', content: 'React 프론트엔드와 Node.js(Express) 백엔드는 주로 RESTful API 또는 SSE(Server-Sent Events)를 통해 통신합니다.\n\n```javascript\nfetch("http://localhost:5000/api/health")\n  .then(res => res.json())\n  .then(data => console.log(data));\n```\n위와 같이 프론트엔드에서 백엔드 API를 호출할 수 있습니다.', created_at: new Date(Date.now() - 3590000).toISOString() }
  ],
  'conv-sample-2': [
    { id: 'm3', role: 'user', content: 'DeepSeek API 특징을 알려줘', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm4', role: 'assistant', content: 'DeepSeek API는 OpenAI 호환 인터페이스를 지원하며 고성능 추론 및 코딩에 특화된 모델(deepseek-chat, deepseek-reasoner)을 합리적인 비용으로 제공합니다.', created_at: new Date(Date.now() - 86390000).toISOString() }
  ]
};

let dbConnected = false;

// 1. Health check & configuration endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CloneGPT Backend',
    database: dbConnected ? 'connected' : 'disconnected (mock mode)',
    hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY?.trim(),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    hasApiKey: !!process.env.DEEPSEEK_API_KEY?.trim(),
    defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    availableModels: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3 (Chat)', desc: '빠르고 스마트한 대화 & 코딩 최적화' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoner)', desc: 'OpenAI o1급 심층 사고 & 복잡한 추론 특화' },
    ]
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

// 6. [3주차 핵심] DeepSeek 실시간 SSE 스트리밍 메시지 전송 엔드포인트
app.post('/api/conversations/:id/messages/stream', async (req, res) => {
  const { id } = req.params;
  const { content, useGlobalMemory = true, model = 'deepseek-chat' } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
  }

  const trimmedContent = content.trim();

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let isClientConnected = true;
  res.on('close', () => {
    isClientConnected = false;
  });

  // 사용자 메시지 생성 및 DB 저장
  const userMsg = {
    id: 'user-' + Date.now(),
    role: 'user',
    content: trimmedContent,
    created_at: new Date().toISOString()
  };

  let historyMessages = [];
  let globalMemory = [];

  if (dbConnected) {
    try {
      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [id, userMsg.role, userMsg.content]
      );
      // 같은 대화방 내 최근 이전 대화 맥락 20개 조회 (질문과 답변 시간순 정렬)
      const prevResult = await pool.query(
        `SELECT role, content FROM (
           SELECT role, content, created_at 
           FROM messages 
           WHERE conversation_id = $1 
           ORDER BY created_at DESC 
           LIMIT 20
         ) sub ORDER BY created_at ASC`,
        [id]
      );
      historyMessages = prevResult.rows.map(r => ({ role: r.role, content: r.content }));

      // 전역 메모리가 켜져 있는 경우: 다른 이전 대화방의 최근 대화 기록 조회
      if (useGlobalMemory) {
        const globalResult = await pool.query(
          `SELECT role, content FROM (
             SELECT role, content, created_at 
             FROM messages 
             WHERE conversation_id != $1 
             ORDER BY created_at DESC 
             LIMIT 15
           ) sub ORDER BY created_at ASC`,
          [id]
        );
        globalMemory = globalResult.rows.map(r => ({ role: r.role, content: r.content }));
      }
    } catch (err) {
      console.error('DB save user message error:', err.message);
      historyMessages = [{ role: 'user', content: trimmedContent }];
    }
  } else {
    if (!mockMessages[id]) mockMessages[id] = [];
    mockMessages[id].push(userMsg);
    historyMessages = mockMessages[id].slice(-20).map(m => ({ role: m.role, content: m.content }));

    if (useGlobalMemory) {
      for (const [convKey, msgs] of Object.entries(mockMessages)) {
        if (convKey !== id) {
          globalMemory.push(...msgs.slice(-5).map(m => ({ role: m.role, content: m.content })));
        }
      }
    }
  }

  // 사용자 메시지 전송 완료 이벤트 통지
  res.write(`data: ${JSON.stringify({ type: 'user_saved', userMessage: userMsg })}\n\n`);

  // DeepSeek AI 스트리밍 생성
  let fullAiResponse = '';
  let fullReasoning = '';

  try {
    const stream = generateDeepSeekStream(historyMessages, globalMemory, model);

    for await (const chunk of stream) {
      if (chunk.type === 'reasoning') {
        fullReasoning += chunk.text;
        if (isClientConnected) {
          try {
            res.write(`data: ${JSON.stringify({ type: 'reasoning', chunk: chunk.text })}\n\n`);
          } catch (e) {}
        }
      } else if (chunk.type === 'content') {
        fullAiResponse += chunk.text;
        if (isClientConnected) {
          try {
            res.write(`data: ${JSON.stringify({ type: 'chunk', chunk: chunk.text })}\n\n`);
          } catch (e) {}
        }
      }
    }

    // AI 답변 DB 저장 (화면을 전환했어도 백그라운드에서 완료 후 안전하게 DB 저장)
    const aiMsg = {
      id: 'ai-' + Date.now(),
      role: 'assistant',
      content: fullAiResponse,
      reasoning: fullReasoning,
      created_at: new Date().toISOString()
    };

    if (dbConnected && fullAiResponse) {
      try {
        await pool.query(
          'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
          [id, aiMsg.role, aiMsg.content]
        );
        await pool.query(
          'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );
      } catch (err) {
        console.error('DB save AI message error:', err.message);
      }
    } else if (fullAiResponse) {
      if (!mockMessages[id]) mockMessages[id] = [];
      mockMessages[id].push(aiMsg);
    }

    if (isClientConnected) {
      res.write(`data: ${JSON.stringify({ type: 'done', assistantMessage: aiMsg })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Streaming error:', error);
    if (isClientConnected) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// 7. Non-streaming 메시지 전송 (호환용)
app.post('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
  }

  const userMsg = {
    id: 'user-' + Date.now(),
    role: 'user',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  let fullAiResponse = '';
  const stream = generateDeepSeekStream([{ role: 'user', content: content.trim() }]);
  for await (const chunk of stream) {
    fullAiResponse += chunk;
  }

  const aiMsg = {
    id: 'ai-' + (Date.now() + 1),
    role: 'assistant',
    content: fullAiResponse,
    created_at: new Date().toISOString()
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
