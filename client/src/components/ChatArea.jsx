import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Bot, User, Copy, Check, ChevronDown, ChevronRight, ChevronLeft, Sparkles, Layers, BookOpen, ArrowDown } from 'lucide-react';
import { splitMarkdownPages, MessageToc } from './ChatToc';

// 텍스트 추출 헬퍼 함수
function extractText(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return String(node || '');
}

// 개별 코드 블록 컴포넌트 (문법 색상 하이라이팅 + 언어 표시 + 원클릭 복사 버튼)
function CodeBlock({ language, codeText }) {
  const [copied, setCopied] = useState(false);

  // highlight.js를 통한 문법 색상 하이라이팅 적용 (파이썬, JS, C++, 쉘 등)
  const highlightedHtml = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(codeText, { language, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(codeText).value;
    } catch {
      return codeText;
    }
  }, [language, codeText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy} title="코드 복사">
          {copied ? (
            <>
              <Check size={13} color="#10a37f" />
              <span style={{ color: '#10a37f' }}>복사됨!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>코드 복사</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block-pre">
        <code
          className={`hljs ${language ? `language-${language}` : ''}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
}

// DeepSeek-R1 생각 과정 (Reasoning Process) 컴포넌트
function ReasoningBox({ reasoning, isThinking }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!reasoning && !isThinking) return null;

  return (
    <div className="reasoning-wrapper">
      <button
        className="reasoning-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="생각 과정 접기/펼치기"
      >
        <Sparkles size={14} color="#10a37f" />
        <span>{isThinking ? '추론 및 생각 중...' : '생각 과정 (Reasoning)'}</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen && (
        <div className="reasoning-box">
          {reasoning || '질문의 핵심을 분석하고 최적의 답변을 추론하는 중입니다...'}
          {isThinking && <span className="blinking-cursor">▍</span>}
        </div>
      )}
    </div>
  );
}

export default function ChatArea({ messages, isLoading, streamingMessageId }) {
  const scrollRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // 스마트 스크롤 제어: 사용자가 위로 휠을 올렸을 때 자동 스크롤 강제 이동을 방지
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const userScrolledUpRef = useRef(false);
  const prevMessagesCountRef = useRef(messages.length);

  // 메시지별 현재 페이지 번호 관리 { [msgId]: pageIndex }
  const [messagePages, setMessagePages] = useState({});
  // 메시지별 전체 보기 모드 관리 { [msgId]: boolean }
  const [fullViewModes, setFullViewModes] = useState({});

  // 마우스 휠 감지: 위로 1픽셀이라도 굴리는 순간(deltaY < 0) 즉각 자동 스크롤을 멈춰서 화면 끌어내림을 원천 차단!
  const handleWheelCapture = (e) => {
    if (e.deltaY < 0) {
      userScrolledUpRef.current = true;
      setIsUserScrolledUp(true);
    }
  };

  // 모바일/터치패드 터치 스크롤 감지
  const touchStartYRef = useRef(0);
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      const deltaY = e.touches[0].clientY - touchStartYRef.current;
      if (deltaY > 6) {
        userScrolledUpRef.current = true;
        setIsUserScrolledUp(true);
      }
    }
  };

  // 키보드(PageUp, ArrowUp, Home) 스크롤 감지
  const handleKeyDownCapture = (e) => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) {
      userScrolledUpRef.current = true;
      setIsUserScrolledUp(true);
    }
  };

  // 사용자의 스크롤 위치 감지 (바닥에서 25px 이상 벗어났는지 확인)
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 25) {
      if (!userScrolledUpRef.current) {
        userScrolledUpRef.current = true;
        setIsUserScrolledUp(true);
      }
    } else {
      if (userScrolledUpRef.current) {
        userScrolledUpRef.current = false;
        setIsUserScrolledUp(false);
      }
    }
  };

  // 최신 답변 위치로 부드럽게 이동하고 자동 스크롤 재개
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      userScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
    }
  };

  // 새로운 사용자 질문/메시지가 추가되면 스크롤 잠금을 해제하고 맨 아래로 이동
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      userScrolledUpRef.current = false;
      setIsUserScrolledUp(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages.length]);

  // 페이지 모드에서 특정 페이지로 이동 (하단 이전/다음 버튼 등)
  const setMsgCurrentPage = (msgId, pageIdx) => {
    setMessagePages((prev) => ({ ...prev, [msgId]: pageIdx }));
    setFullViewModes((prev) => ({ ...prev, [msgId]: false }));
  };

  // 목차 클릭 처리: 전체 모드일 때는 화면 전환 없이 해당 섹션 위치로 부드럽게 스크롤,
  // 페이지 모드일 때는 해당 페이지만 표시
  const handleSelectTocPage = (msgId, pageIdx) => {
    const isFull = !!fullViewModes[msgId];
    setMessagePages((prev) => ({ ...prev, [msgId]: pageIdx }));

    if (isFull) {
      // 전체 보기 모드: 전체 보기를 유지하고 해당 섹션 DOM으로 부드럽게 스크롤
      const targetElem = document.getElementById(`msg-${msgId}-section-${pageIdx}`);
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // 페이지 모드: 해당 페이지만 표시
      setFullViewModes((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const toggleFullView = (msgId) => {
    setFullViewModes((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // 각 메시지의 마크다운 페이지 분할 캐싱
  const parsedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const msgId = String(msg.id || `msg-${idx}`);
      if (msg.role === 'assistant' && msg.content) {
        const pages = splitMarkdownPages(msg.content);
        return { ...msg, msgId, pages };
      }
      return { ...msg, msgId, pages: [] };
    });
  }, [messages]);

  // 스트리밍 진행 중 새 페이지가 생기면 최신 페이지로 자동 추적
  useEffect(() => {
    if (streamingMessageId) {
      const streamMsg = parsedMessages.find((m) => m.msgId === String(streamingMessageId));
      if (streamMsg && streamMsg.pages.length > 0) {
        const lastPageIdx = streamMsg.pages.length - 1;
        setMessagePages((prev) => {
          if (prev[streamMsg.msgId] !== lastPageIdx) {
            return { ...prev, [streamMsg.msgId]: lastPageIdx };
          }
          return prev;
        });
      }
    }
  }, [parsedMessages, streamingMessageId]);

  // 답변 스트리밍 중 자동 스크롤: 사용자가 위로 휠을 올린 경우 화면 끌어내림을 방지!
  useEffect(() => {
    if (scrollRef.current && (isLoading || streamingMessageId)) {
      if (!userScrolledUpRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, isLoading, streamingMessageId]);

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // remark-gfm 설정 (singleTilde: false 설정으로 '900~1,000kcal', '2~3시간' 등 숫자 범위 물결표가 취소선으로 오인식되는 문제 방지)
  const remarkPlugins = useMemo(() => [[remarkGfm, { singleTilde: false }]], []);

  // 마크다운 커스텀 렌더러
  const markdownComponents = useMemo(
    () => ({
      pre({ children }) {
        return <>{children}</>;
      },
      code({ node, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const rawText = extractText(children).replace(/\n$/, '');
        const isBlock = match || rawText.includes('\n');

        if (!isBlock) {
          return (
            <code className="inline-code" {...props}>
              {children}
            </code>
          );
        }

        return (
          <CodeBlock language={match ? match[1] : ''} codeText={rawText} />
        );
      },
    }),
    []
  );

  return (
    <div
      className="chat-messages"
      ref={scrollRef}
      onScroll={handleScroll}
      onWheelCapture={handleWheelCapture}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <div className="chat-messages-container">
        {parsedMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isStreaming = msg.msgId === String(streamingMessageId);
          const hasReasoning = !!msg.reasoning;
          const isThinking = isStreaming && hasReasoning && !msg.content;
          const msgId = msg.msgId;

          const pages = msg.pages || [];
          const hasMultiplePages = pages.length > 1;
          const currentPageIdx = Math.min(messagePages[msgId] || 0, Math.max(0, pages.length - 1));
          const isFullView = !!fullViewModes[msgId];
          const currentPage = pages[currentPageIdx] || { title: '개요', content: msg.content };

          // 1. 사용자 메시지
          if (isUser) {
            return (
              <div key={msgId || idx} className="message-row user">
                <div className="message-bubble user">
                  <div className="message-content user-text">{msg.content}</div>
                </div>
                <div className="avatar user-avatar">
                  <User size={18} />
                </div>
              </div>
            );
          }

          // 2. 어시스턴트 메시지 (좌측 아바타 컬럼 바로 밑에 목차 배치)
          return (
            <div
              key={msgId || idx}
              className={`message-row assistant ${hasMultiplePages ? 'has-toc-col' : ''}`}
            >
              {/* 좌측 컬럼: 챗봇 아바타 + 그 바로 아래에 배경 없는 텍스트 목차 */}
              <div className="assistant-avatar-col">
                <div className="avatar bot-avatar">
                  <Bot size={18} />
                </div>

                {hasMultiplePages && (
                  <MessageToc
                    pages={pages}
                    currentPageIdx={currentPageIdx}
                    isFullView={isFullView}
                    onSelectPage={(pIdx) => handleSelectTocPage(msgId, pIdx)}
                  />
                )}
              </div>

              {/* 우측 컬럼: 답변 본문 박스 */}
              <div className="message-bubble assistant paginated-bubble">
                {/* DeepSeek-R1 생각 과정 박스 */}
                {(hasReasoning || isThinking) && (
                  <ReasoningBox
                    reasoning={msg.reasoning}
                    isThinking={isThinking}
                  />
                )}

                {hasMultiplePages ? (
                  <div className="paginated-card">
                    {/* 상단 페이지 정보 & 모드 전환 바 */}
                    <div className="paginated-topbar">
                      <div className="paginated-left-meta">
                        <span className="badge-page-num">
                          {isFullView ? '전체 보기' : `P. ${currentPageIdx + 1} / ${pages.length}`}
                        </span>
                        <span className="page-breadcrumb-title">
                          {isFullView ? '모든 페이지 연속 보기' : currentPage.title}
                        </span>
                      </div>

                      <div className="paginated-mode-toggles">
                        <button
                          className={`mode-toggle-btn ${!isFullView ? 'active' : ''}`}
                          onClick={() => isFullView && toggleFullView(msgId)}
                          title="페이지별 모드"
                        >
                          <BookOpen size={12} />
                          <span>페이지</span>
                        </button>
                        <button
                          className={`mode-toggle-btn ${isFullView ? 'active' : ''}`}
                          onClick={() => !isFullView && toggleFullView(msgId)}
                          title="전체 연속 모드"
                        >
                          <Layers size={12} />
                          <span>전체</span>
                        </button>
                      </div>
                    </div>

                    {/* 페이지 본문 (깨짐 없는 마크다운 렌더링 + syntax highlighting) */}
                    <div className="paginated-content-wrapper markdown-body">
                      {isFullView ? (
                        <div className="full-view-container">
                          {pages.map((p, pIdx) => (
                            <div
                              key={p.id || pIdx}
                              id={`msg-${msgId}-section-${pIdx}`}
                              className="full-view-section"
                            >
                              <ReactMarkdown
                                remarkPlugins={remarkPlugins}
                                components={markdownComponents}
                              >
                                {p.content}
                              </ReactMarkdown>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={remarkPlugins}
                          components={markdownComponents}
                        >
                          {currentPage.content}
                        </ReactMarkdown>
                      )}

                      {isStreaming && (
                        <span className="blinking-cursor">▍</span>
                      )}
                    </div>

                    {/* 하단 페이지 넘기기 컨트롤러 (깔끔한 페이지 텍스트 표시) */}
                    {!isFullView && (
                      <div className="paginated-bottom-bar">
                        <button
                          className="paginated-nav-btn"
                          disabled={currentPageIdx <= 0}
                          onClick={() => setMsgCurrentPage(msgId, currentPageIdx - 1)}
                        >
                          <ChevronLeft size={13} />
                          <span>이전</span>
                        </button>

                        <div className="paginated-page-indicator">
                          <span className="current-page-num">{currentPageIdx + 1}</span>
                          <span className="page-slash">/</span>
                          <span className="total-page-num">{pages.length} 페이지</span>
                        </div>

                        <button
                          className="paginated-nav-btn"
                          disabled={currentPageIdx >= pages.length - 1}
                          onClick={() => setMsgCurrentPage(msgId, currentPageIdx + 1)}
                        >
                          <span>다음</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 단일 페이지 기본 렌더링 */
                  <div className="message-content markdown-body">
                    {msg.content ? (
                      <ReactMarkdown
                        remarkPlugins={remarkPlugins}
                        components={markdownComponents}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      isStreaming && !hasReasoning && (
                        <span className="blinking-cursor">▍</span>
                      )
                    )}

                    {isStreaming && msg.content && (
                      <span className="blinking-cursor">▍</span>
                    )}
                  </div>
                )}

                {!isStreaming && msg.content && (
                  <div className="message-actions">
                    <button
                      className="icon-btn action-btn"
                      onClick={() => handleCopyMessage(msgId, msg.content)}
                      title="답변 전체 복사"
                    >
                      {copiedMessageId === msgId ? (
                        <Check size={14} color="#10a37f" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && !streamingMessageId && (
          <div className="message-row assistant">
            <div className="assistant-avatar-col">
              <div className="avatar bot-avatar">
                <Bot size={18} />
              </div>
            </div>
            <div className="message-bubble assistant">
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 최신 답변 보기 플로팅 버튼 (사용자가 위쪽으로 스크롤했을 때 표시) */}
      {isUserScrolledUp && (
        <button
          className="scroll-to-bottom-float-btn"
          onClick={scrollToBottom}
          title="최신 답변으로 이동"
        >
          <ArrowDown size={14} />
          <span>최신 답변 보기</span>
        </button>
      )}
    </div>
  );
}
