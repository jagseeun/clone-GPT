import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ChatArea from './components/ChatArea.jsx';
import ChatInput from './components/ChatInput.jsx';
import { PanelLeft, ChevronDown, SquarePen, KeyRound, X, Sun, Moon, Brain } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiConfig, setApiConfig] = useState({ hasApiKey: false, model: 'deepseek-chat' });
  const [showBanner, setShowBanner] = useState(true);

  // 테마 상태 (Dark / Light)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('clonegpt_theme') || 'dark';
  });

  // 전역 메모리(이전 대화 기억) ON/OFF 상태
  const [useGlobalMemory, setUseGlobalMemory] = useState(() => {
    return localStorage.getItem('clonegpt_memory') !== 'false';
  });

  const abortControllerRef = useRef(null);

  // 테마 변경 반영
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clonegpt_theme', theme);
  }, [theme]);

  // 메모리 설정 저장
  useEffect(() => {
    localStorage.setItem('clonegpt_memory', useGlobalMemory ? 'true' : 'false');
  }, [useGlobalMemory]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleMemory = () => {
    setUseGlobalMemory((prev) => !prev);
  };

  // 1. 서버 설정 및 API 키 상태 조회
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setApiConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch server config:', err);
    }
  };

  // 2. 대화 목록 불러오기
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchConversations();
  }, []);

  // 3. 특정 대화 선택 시 메시지 로드
  const handleSelectConversation = async (id) => {
    if (isLoading) handleStopGeneration();
    try {
      setCurrentId(id);
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // 4. 새로운 대화 시작 (화면 리셋)
  const handleNewChat = () => {
    if (isLoading) handleStopGeneration();
    setCurrentId(null);
    setMessages([]);
    setInput('');
  };

  // 5. 대화방 삭제
  const handleDeleteConversation = async (id) => {
    if (isLoading && currentId === id) handleStopGeneration();
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentId === id) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // 6. 생성 중지(Abort) 핸들러
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingMessageId(null);
  };

  // 7. [3주차 핵심] DeepSeek 실시간 SSE 스트리밍 메시지 전송
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    let convId = currentId;

    try {
      // 신규 대화인 경우 대화방 생성
      if (!convId) {
        const title = text.length > 25 ? text.slice(0, 25) + '...' : text;
        const convRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        if (convRes.ok) {
          const newConv = await convRes.json();
          convId = newConv.id;
          setCurrentId(convId);
          setConversations((prev) => [newConv, ...prev]);
        }
      }

      // 사용자 메시지 낙관적 UI 추가
      const tempUserMsg = {
        id: 'user-temp-' + Date.now(),
        role: 'user',
        content: text,
      };

      // AI 답변을 담을 스트리밍 메시지 임시 생성
      const tempAiMsgId = 'ai-stream-' + Date.now();
      const tempAiMsg = {
        id: tempAiMsgId,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);
      setStreamingMessageId(tempAiMsgId);

      // AbortController 준비
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 스트리밍 API 호출 (전역 메모리 ON/OFF 상태 전달)
      const response = await fetch(`/api/conversations/${convId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          useGlobalMemory,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(jsonStr);

            if (data.type === 'user_saved') {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempUserMsg.id ? data.userMessage : m))
              );
            } else if (data.type === 'chunk') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAiMsgId
                    ? { ...m, content: m.content + data.chunk }
                    : m
                )
              );
            } else if (data.type === 'done') {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempAiMsgId ? data.assistantMessage : m))
              );
              fetchConversations();
            } else if (data.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAiMsgId
                    ? { ...m, content: m.content + `\n\n⚠️ ${data.error}` }
                    : m
                )
              );
            }
          } catch (e) {
            console.warn('SSE Parse error:', e);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingMessageId
              ? { ...m, content: m.content + '\n\n*(사용자에 의해 생성이 중단되었습니다)*' }
              : m
          )
        );
      } else {
        console.error('Failed to send message:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            role: 'assistant',
            content: `⚠️ 메시지 전송 중 오류가 발생했습니다: ${err.message}`,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(false)}
        conversations={conversations}
        currentId={currentId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        useGlobalMemory={useGlobalMemory}
        onToggleMemory={handleToggleMemory}
      />

      <main className="main-content">
        {/* 상단 알림 배너 */}
        {!apiConfig.hasApiKey && showBanner && (
          <div className="api-key-banner">
            <div className="banner-content">
              <KeyRound size={16} className="banner-icon" />
              <span>
                <strong>DeepSeek API 키 안내:</strong> <code>server/.env</code> 파일에 <code>DEEPSEEK_API_KEY</code>를 설정하면 실제 AI 모델의 답변을 받아볼 수 있습니다.
              </span>
            </div>
            <button className="banner-close-btn" onClick={() => setShowBanner(false)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* 상단 네비게이션 헤더 */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isSidebarOpen && (
              <button
                className="icon-btn"
                onClick={() => setIsSidebarOpen(true)}
                title="사이드바 열기"
              >
                <PanelLeft size={20} />
              </button>
            )}
            <button className="model-selector">
              <span>CloneGPT</span>
              <span className="model-tag">{apiConfig.model || 'deepseek-chat'}</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 전역 메모리 ON/OFF 버튼 */}
            <button
              className={`memory-pill-btn ${useGlobalMemory ? 'active' : ''}`}
              onClick={handleToggleMemory}
              title={`이전 대화 기억(전역 메모리): ${useGlobalMemory ? '켜짐 (다른 채팅방 기억 참고)' : '꺼짐 (대화방 독립)'}`}
            >
              <div className={`memory-dot ${useGlobalMemory ? 'active' : ''}`}></div>
              <Brain size={14} />
              <span>기억 {useGlobalMemory ? 'ON' : 'OFF'}</span>
            </button>

            {/* 테마 토글 버튼 */}
            <button
              className="icon-btn"
              onClick={handleToggleTheme}
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* 새 대화 버튼 */}
            <button
              className="icon-btn"
              onClick={handleNewChat}
              title="새 대화 시작"
            >
              <SquarePen size={18} />
            </button>
          </div>
        </header>

        {/* 메인 화면 (빈 대화) vs 채팅 화면 */}
        {messages.length === 0 ? (
          <WelcomeScreen onSelectPrompt={(prompt) => setInput(prompt)} />
        ) : (
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            streamingMessageId={streamingMessageId}
          />
        )}

        {/* 입력창 및 전송/중단 버튼 */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onStop={handleStopGeneration}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
