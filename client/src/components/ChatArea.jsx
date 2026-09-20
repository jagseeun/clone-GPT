import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import ChatToc, { extractHeadings, slugify } from './ChatToc';

// 텍스트 추출 헬퍼 함수
function extractText(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return String(node || '');
}

// 개별 코드 블록 컴포넌트 (언어 표시 + 원클릭 복사 버튼)
function CodeBlock({ language, codeText, children }) {
  const [copied, setCopied] = useState(false);

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
        <code>{children}</code>
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
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [activeHeadingIdx, setActiveHeadingIdx] = useState(0);

  // 가장 최근 어시스턴트 메시지 중 2개 이상의 헤딩을 가진 메시지 탐색
  const latestAssistantWithHeadings = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.content) {
        const msgId = msg.id || `msg-${i}`;
        const headings = extractHeadings(msg.content, msgId);
        if (headings.length >= 2) {
          return { msgId, headings };
        }
      }
    }
    return null;
  }, [messages]);

  // 대화나 헤딩 메시지가 바뀔 때 첫 헤딩으로 초기화
  const currentMsgIdRef = useRef(null);
  useEffect(() => {
    if (latestAssistantWithHeadings?.msgId !== currentMsgIdRef.current) {
      currentMsgIdRef.current = latestAssistantWithHeadings?.msgId;
      setActiveHeadingIdx(0);
      if (latestAssistantWithHeadings?.headings?.[0]) {
        setActiveHeadingId(latestAssistantWithHeadings.headings[0].id);
      } else {
        setActiveHeadingId(null);
      }
    }
  }, [latestAssistantWithHeadings?.msgId]);

  // 스크롤 감지를 통한 활성 목차(TOC) 자동 하이라이트 동기화
  useEffect(() => {
    if (!latestAssistantWithHeadings || latestAssistantWithHeadings.headings.length === 0) return;

    const headings = latestAssistantWithHeadings.headings;
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const topTarget = intersecting[0].target;
          setActiveHeadingId(topTarget.id);
          const idx = headings.findIndex((h) => h.id === topTarget.id);
          if (idx !== -1) {
            setActiveHeadingIdx(idx);
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '0px 0px -65% 0px',
        threshold: 0.1,
      }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [latestAssistantWithHeadings]);

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

  // 목차 클릭 시 해당 헤딩으로 부드러운 스크롤 & 펄스 하이라이트 효과
  const handleSelectHeading = (id, idx) => {
    setActiveHeadingId(id);
    setActiveHeadingIdx(idx);
    const targetEl = document.getElementById(id);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetEl.classList.remove('highlight-pulse');
      void targetEl.offsetWidth; // force reflow
      targetEl.classList.add('highlight-pulse');
    }
  };

  // 목차 이전/다음 스텝 이동
  const handleStepHeading = (direction) => {
    if (!latestAssistantWithHeadings) return;
    const headings = latestAssistantWithHeadings.headings;
    const nextIdx = activeHeadingIdx + direction;
    if (nextIdx >= 0 && nextIdx < headings.length) {
      handleSelectHeading(headings[nextIdx].id, nextIdx);
    }
  };

  // 마크다운 커스텀 렌더러 생성 (헤딩 ID 일치 및 코드 블록 복사 지원)
  const getMarkdownComponents = (msgId) => {
    const seenMap = {};
    const getId = (text) => {
      const base = slugify(text, msgId);
      if (!seenMap[base]) {
        seenMap[base] = 1;
        return base;
      }
      const id = `${base}-${seenMap[base]}`;
      seenMap[base]++;
      return id;
    };

    return {
      pre({ children }) {
        return <>{children}</>;
      },
      h1({ children, ...props }) {
        const text = extractText(children);
        const id = getId(text);
        return (
          <h1 id={id} className="markdown-heading" {...props}>
            {children}
          </h1>
        );
      },
      h2({ children, ...props }) {
        const text = extractText(children);
        const id = getId(text);
        return (
          <h2 id={id} className="markdown-heading" {...props}>
            {children}
          </h2>
        );
      },
      h3({ children, ...props }) {
        const text = extractText(children);
        const id = getId(text);
        return (
          <h3 id={id} className="markdown-heading" {...props}>
            {children}
          </h3>
        );
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
          <CodeBlock language={match ? match[1] : ''} codeText={rawText}>
            {children}
          </CodeBlock>
        );
      },
    };
  };

  return (
    <div className="chat-layout-wrapper">
      {/* 1. 채팅 영역 좌측에 깔끔하게 도킹된 목차 (TOC) 사이드바 */}
      {latestAssistantWithHeadings && (
        <ChatToc
          headings={latestAssistantWithHeadings.headings}
          activeHeadingId={activeHeadingId}
          activeHeadingIdx={activeHeadingIdx}
          isOpen={isTocOpen}
          onToggle={() => setIsTocOpen((prev) => !prev)}
          onSelectHeading={handleSelectHeading}
          onStep={handleStepHeading}
        />
      )}

      {/* 2. 본문 채팅 메시지 스트림 (충분한 너비와 쾌적한 가독성 보장) */}
      <div className="chat-messages" ref={scrollRef}>
        <div className="chat-messages-container">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isStreaming = msg.id === streamingMessageId;
            const hasReasoning = !!msg.reasoning;
            const isThinking = isStreaming && hasReasoning && !msg.content;
            const msgId = msg.id || `msg-${idx}`;

            return (
              <div key={msgId} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
                {!isUser && (
                  <div className="avatar bot-avatar">
                    <Bot size={18} />
                  </div>
                )}
                <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
                  {isUser ? (
                    <div className="message-content user-text">{msg.content}</div>
                  ) : (
                    <div className="message-content markdown-body">
                      {/* DeepSeek-R1 생각 과정 박스 */}
                      {(hasReasoning || isThinking) && (
                        <ReasoningBox
                          reasoning={msg.reasoning}
                          isThinking={isThinking}
                        />
                      )}

                      {/* 본문 마크다운 (순수 ReactMarkdown으로 안정적이고 깨짐 없는 렌더링) */}
                      {msg.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={getMarkdownComponents(msgId)}
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
                  )}
                </div>
                {isUser && (
                  <div className="avatar user-avatar">
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && !streamingMessageId && (
            <div className="message-row assistant">
              <div className="avatar bot-avatar">
                <Bot size={18} />
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
    </div>
  );
}
