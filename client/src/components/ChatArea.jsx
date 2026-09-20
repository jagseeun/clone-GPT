import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Bot, User, Copy, Check, ChevronDown, ChevronRight, ChevronLeft, Sparkles, Layers, BookOpen } from 'lucide-react';
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

  // 메시지별 현재 페이지 번호 관리 { [msgId]: pageIndex }
  const [messagePages, setMessagePages] = useState({});
  // 메시지별 전체 보기 모드 관리 { [msgId]: boolean }
  const [fullViewModes, setFullViewModes] = useState({});

  const setMsgCurrentPage = (msgId, pageIdx) => {
    setMessagePages((prev) => ({ ...prev, [msgId]: pageIdx }));
    // 특정 페이지 클릭 시 전체 보기가 켜져있다면 페이지 모드로 전환
    setFullViewModes((prev) => ({ ...prev, [msgId]: false }));
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

  // 자동 스크롤 하단 이동 (스트리밍 및 메시지 추가 시)
  useEffect(() => {
    if (scrollRef.current && (isLoading || streamingMessageId)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    <div className="chat-messages" ref={scrollRef}>
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
                    onSelectPage={(pIdx) => setMsgCurrentPage(msgId, pIdx)}
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
                      <ReactMarkdown
                        remarkPlugins={remarkPlugins}
                        components={markdownComponents}
                      >
                        {isFullView ? msg.content : currentPage.content}
                      </ReactMarkdown>

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
    </div>
  );
}
