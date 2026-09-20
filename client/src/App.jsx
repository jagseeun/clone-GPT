import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ChatArea from './components/ChatArea.jsx';
import ChatInput from './components/ChatInput.jsx';
import PromptModal from './components/PromptModal.jsx';
import { PanelLeft, ChevronDown, SquarePen, KeyRound, X, Sun, Moon, Brain, Check, Sparkles, Zap } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiConfig, setApiConfig] = useState({
    hasApiKey: false,
    defaultModel: 'deepseek-chat',
    availableModels: []
  });
  const [showBanner, setShowBanner] = useState(true);

  // 프롬프트 개선 모달 상태
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [originalPromptForModal, setOriginalPromptForModal] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');

  // 테마 상태 (Dark / Light)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('clonegpt_theme') || 'dark';
  });

  // 전역 메모리(이전 대화 기억) ON/OFF 상태 (상단 헤더에서만 제어)
  const [useGlobalMemory, setUseGlobalMemory] = useState(() => {
    return localStorage.getItem('clonegpt_memory') !== 'false';
  });

  // 선택된 AI 모델 (deepseek-chat 또는 deepseek-reasoner)
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('clonegpt_model') || 'deepseek-chat';
  });

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef(null);

  // 대화방별 진행 중인 백그라운드 스트림 저장소 (Map: convId -> { tempAiMsgId, userMsg, aiMsg, controller, isDone })
  const activeStreamsRef = useRef(new Map());
  // 강제 UI 리렌더링 트리거용 상태
  const [, setStreamTick] = useState(0);

  // 현재 보고 있는 대화방 ID를 ref로 추적
  const currentIdRef = useRef(currentId);
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  // 테마 변경 반영
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clonegpt_theme', theme);
  }, [theme]);

  // 메모리 설정 저장
  useEffect(() => {
    localStorage.setItem('clonegpt_memory', useGlobalMemory ? 'true' : 'false');
  }, [useGlobalMemory]);

  // 모델 설정 저장
  useEffect(() => {
    localStorage.setItem('clonegpt_model', selectedModel);
  }, [selectedModel]);

  // 바깥 클릭 시 모델 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // 3. 특정 대화방 클릭 시 메시지 로드 (진행 중인 스트림이 있다면 함께 복원)
  const handleSelectConversation = async (id) => {
    try {
      setCurrentId(id);
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        let loadedMessages = data.messages || [];

        // 이 방에 아직 끝나지 않은 백그라운드 스트림이 있다면 합쳐서 표시!
        if (activeStreamsRef.current.has(id)) {
          const active = activeStreamsRef.current.get(id);
          if (!active.isDone) {
            const hasTemp = loadedMessages.some((m) => m.id === active.tempAiMsgId);
            if (!hasTemp) {
              const withoutUser = loadedMessages.filter((m) => m.id !== active.userMsg.id);
              loadedMessages = [...withoutUser, active.userMsg, active.aiMsg];
            }
          }
        }

        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // 4. 새로운 대화 시작 (메인 화면)
  const handleNewChat = () => {
    setCurrentId(null);
    setMessages([]);
    setInput('');
  };

  // 5. 대화방 삭제
  const handleDeleteConversation = async (id) => {
    if (activeStreamsRef.current.has(id)) {
      activeStreamsRef.current.get(id).controller?.abort();
      activeStreamsRef.current.delete(id);
    }
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

  // 6. 현재 보고 있는 방의 생성 중지(Abort)
  const handleStopGeneration = () => {
    if (currentId && activeStreamsRef.current.has(currentId)) {
      const active = activeStreamsRef.current.get(currentId);
      active.controller?.abort();
      activeStreamsRef.current.delete(currentId);
      setStreamTick((t) => t + 1);
    }
  };

  // 7. AI 프롬프트 개선 실행
  const handleEnhancePrompt = async () => {
    const raw = input.trim();
    if (!raw || isEnhancingPrompt) return;

    setIsEnhancingPrompt(true);
    setOriginalPromptForModal(raw);

    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: raw }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '프롬프트 개선 실패');
      }

      const data = await res.json();
      setEnhancedPrompt(data.enhancedPrompt);
      setShowPromptModal(true);
    } catch (err) {
      console.error('Enhance prompt error:', err);
      alert('프롬프트 개선 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // 개선된 프롬프트를 입력창에 적용
  const handleApplyEnhancedPrompt = (newPrompt) => {
    setInput(newPrompt);
    setShowPromptModal(false);
  };

  // 개선된 프롬프트로 바로 전송
  const handleSendEnhancedDirectly = (newPrompt) => {
    setShowPromptModal(false);
    executeSendMessage(newPrompt);
  };

  // 8. 메시지 전송 로직 (다중 세션 백그라운드 스트리밍 보존)
  const executeSendMessage = async (textToSend) => {
    const text = textToSend.trim();
    if (!text) return;

    // 현재 방이 이미 생성 중이면 중복 전송 방지
    if (currentId && activeStreamsRef.current.has(currentId) && !activeStreamsRef.current.get(currentId).isDone) {
      return;
    }

    setInput('');

    let convId = currentId;

    try {
      // 신규 대화인 경우 대화방 먼저 생성 (첫 질문 전송 시 AI가 스마트 요약 제목으로 자동 갱신)
      if (!convId) {
        const cleanPreview = text
          .replace(/당신은.*?전문가(?:입니다|로서)[.,\s]*/gi, '')
          .replace(/^(안녕|안녕하세요|질문이\s*있는데|혹시)\s*,?\s*/gi, '')
          .trim();
        const initialTitle = (cleanPreview.slice(0, 18) + (cleanPreview.length > 18 ? '...' : '')) || '새로운 대화';

        const convRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: initialTitle }),
        });
        if (convRes.ok) {
          const newConv = await convRes.json();
          convId = newConv.id;
          setCurrentId(convId);
          setConversations((prev) => [newConv, ...prev]);
        }
      }

      // 사용자 메시지 생성
      const userMsg = {
        id: 'user-temp-' + Date.now(),
        role: 'user',
        content: text,
      };

      // AI 답변을 담을 스트리밍 메시지 임시 생성
      const tempAiMsgId = 'ai-stream-' + Date.now();
      const aiMsg = {
        id: tempAiMsgId,
        role: 'assistant',
        content: '',
        reasoning: '',
      };

      // 현재 방을 보고 있으면 화면에 즉시 낙관적 반영
      if (currentIdRef.current === convId || !currentIdRef.current) {
        setMessages((prev) => [...prev, userMsg, aiMsg]);
      }

      const controller = new AbortController();

      // 세션별 진행 스트림 맵에 등록 (사용자가 다른 방을 가도 여기서 안전하게 보존)
      activeStreamsRef.current.set(convId, {
        tempAiMsgId,
        userMsg,
        aiMsg,
        controller,
        isDone: false,
      });
      setStreamTick((t) => t + 1);

      // 스트리밍 API 호출
      const response = await fetch(`/api/conversations/${convId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          useGlobalMemory,
          model: selectedModel,
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
            const streamObj = activeStreamsRef.current.get(convId);

            if (data.type === 'title_updated' && data.title) {
              setConversations((prev) =>
                prev.map((c) => (c.id === convId ? { ...c, title: data.title } : c))
              );
            } else if (data.type === 'user_saved') {
              if (streamObj) streamObj.userMsg = data.userMessage;
              if (currentIdRef.current === convId) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === userMsg.id ? data.userMessage : m))
                );
              }
            } else if (data.type === 'reasoning') {
              if (streamObj) streamObj.aiMsg.reasoning += data.chunk;
              if (currentIdRef.current === convId) {
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === tempAiMsgId);
                  if (!exists) return [...prev, streamObj?.aiMsg || aiMsg];
                  return prev.map((m) =>
                    m.id === tempAiMsgId
                      ? { ...m, reasoning: (m.reasoning || '') + data.chunk }
                      : m
                  );
                });
              }
            } else if (data.type === 'chunk') {
              if (streamObj) streamObj.aiMsg.content += data.chunk;
              if (currentIdRef.current === convId) {
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === tempAiMsgId);
                  if (!exists) return [...prev, streamObj?.aiMsg || aiMsg];
                  return prev.map((m) =>
                    m.id === tempAiMsgId
                      ? { ...m, content: (m.content || '') + data.chunk }
                      : m
                  );
                });
              }
            } else if (data.type === 'done') {
              if (streamObj) streamObj.isDone = true;
              activeStreamsRef.current.delete(convId);
              setStreamTick((t) => t + 1);

              if (currentIdRef.current === convId) {
                setMessages((prev) => {
                  const withoutTemp = prev.filter((m) => m.id !== tempAiMsgId);
                  return [...withoutTemp, data.assistantMessage];
                });
              }
              fetchConversations();
            } else if (data.type === 'error') {
              if (streamObj) streamObj.isDone = true;
              activeStreamsRef.current.delete(convId);
              setStreamTick((t) => t + 1);

              if (currentIdRef.current === convId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAiMsgId
                      ? { ...m, content: m.content + `\n\n⚠️ ${data.error}` }
                      : m
                  )
                );
              }
            }
          } catch (e) {
            console.warn('SSE Parse error:', e);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user for conv', convId);
        if (currentIdRef.current === convId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id.startsWith('ai-stream-')
                ? { ...m, content: m.content + '\n\n*(사용자에 의해 생성이 중단되었습니다)*' }
                : m
            )
          );
        }
      } else {
        console.error('Failed to send message:', err);
        if (currentIdRef.current === convId) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'err-' + Date.now(),
              role: 'assistant',
              content: `⚠️ 메시지 전송 중 오류가 발생했습니다: ${err.message}`,
            },
          ]);
        }
      }
    } finally {
      if (activeStreamsRef.current.has(convId)) {
        activeStreamsRef.current.delete(convId);
        setStreamTick((t) => t + 1);
      }
    }
  };

  const handleSend = () => {
    executeSendMessage(input);
  };

  // 현재 보고 있는 방이 답변을 생성 중인지 확인
  const isCurrentRoomLoading = Boolean(
    currentId &&
    activeStreamsRef.current.has(currentId) &&
    !activeStreamsRef.current.get(currentId)?.isDone
  );

  const streamingMessageId = isCurrentRoomLoading
    ? activeStreamsRef.current.get(currentId)?.tempAiMsgId
    : null;

  const modelsList = [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek-V3',
      tag: 'Chat',
      icon: <Zap size={15} color="#10a37f" />,
      desc: '빠르고 자연스러운 대화, 일상 질문, 코딩에 최적화된 최신 671B 모델',
    },
    {
      id: 'deepseek-reasoner',
      name: 'DeepSeek-R1',
      tag: 'Reasoner',
      icon: <Sparkles size={15} color="#8b5cf6" />,
      desc: 'OpenAI o1급 심층 사고 모델. 생각 과정(Reasoning)을 거쳐 최고 난도 문제 해결',
    },
  ];

  const currentModelObj = modelsList.find((m) => m.id === selectedModel) || modelsList[0];

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

            {/* 모델 드롭다운 셀렉터 */}
            <div className="model-selector-wrapper" ref={modelMenuRef}>
              <button
                className="model-selector"
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                title="AI 모델 선택"
              >
                <span>CloneGPT</span>
                <span className="model-tag">{currentModelObj.name}</span>
                <ChevronDown size={14} />
              </button>

              {isModelMenuOpen && (
                <div className="model-dropdown-menu">
                  {modelsList.map((m) => (
                    <div
                      key={m.id}
                      className={`model-option-item ${selectedModel === m.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setIsModelMenuOpen(false);
                      }}
                    >
                      <div style={{ marginTop: '2px' }}>{m.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div className="model-option-name">
                          <span>{m.name}</span>
                          {selectedModel === m.id && <Check size={14} color="#10a37f" />}
                        </div>
                        <div className="model-option-desc">{m.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 전역 메모리 ON/OFF 버튼 (상단에서만 표시) */}
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
            isLoading={isCurrentRoomLoading}
            streamingMessageId={streamingMessageId}
          />
        )}

        {/* 입력창 및 전송/중단/프롬프트 개선 버튼 */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onStop={handleStopGeneration}
          isLoading={isCurrentRoomLoading}
          onEnhancePrompt={handleEnhancePrompt}
          isEnhancing={isEnhancingPrompt}
        />
      </main>

      {/* AI 프롬프트 개선 확인 모달 */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        originalPrompt={originalPromptForModal}
        enhancedPrompt={enhancedPrompt}
        onApply={handleApplyEnhancedPrompt}
        onSendDirectly={handleSendEnhancedDirectly}
        onRegenerate={handleEnhancePrompt}
        isRegenerating={isEnhancingPrompt}
      />
    </div>
  );
}
