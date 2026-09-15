import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ChatArea from './components/ChatArea.jsx';
import ChatInput from './components/ChatInput.jsx';
import { PanelLeft, ChevronDown, SquarePen } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 대화 목록 불러오기
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
    fetchConversations();
  }, []);

  // 특정 대화 선택 시 메시지 로드
  const handleSelectConversation = async (id) => {
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

  // 새로운 대화 시작 (화면 초기화)
  const handleNewChat = () => {
    setCurrentId(null);
    setMessages([]);
    setInput('');
  };

  // 대화방 삭제
  const handleDeleteConversation = async (id) => {
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

  // 메시지 전송
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    let convId = currentId;

    try {
      // 대화방이 없는 상태(신규 대화)라면 먼저 대화방 생성
      if (!convId) {
        const title = text.length > 20 ? text.slice(0, 20) + '...' : text;
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

      // 낙관적 UI 업데이트 (사용자 메시지 선반영)
      const tempUserMsg = {
        id: 'temp-' + Date.now(),
        role: 'user',
        content: text,
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // 백엔드로 메시지 전송
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          data.userMessage,
          data.assistantMessage,
        ]);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: '⚠️ 메시지 전송 중 오류가 발생했습니다. 백엔드 서버 상태를 확인해주세요.',
        },
      ]);
    } finally {
      setIsLoading(false);
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
      />

      <main className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span className="model-tag">DeepSeek</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <button
            className="icon-btn"
            onClick={handleNewChat}
            title="새 대화 시작"
          >
            <SquarePen size={18} />
          </button>
        </header>

        {messages.length === 0 ? (
          <WelcomeScreen onSelectPrompt={(prompt) => setInput(prompt)} />
        ) : (
          <ChatArea messages={messages} isLoading={isLoading} />
        )}

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
