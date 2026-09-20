import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import PaginatedMarkdown from './PaginatedMarkdown';

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
          <CodeBlock language={match ? match[1] : ''} codeText={rawText}>
            {children}
          </CodeBlock>
        );
      },
    }),
    []
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleCopyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div className="chat-messages" ref={scrollRef}>
      <div className="chat-messages-container">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isStreaming = msg.id === streamingMessageId;
          const hasReasoning = !!msg.reasoning;
          const isThinking = isStreaming && hasReasoning && !msg.content;

          return (
            <div key={msg.id || idx} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
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

                    {/* 본문 마크다운 (헤딩 기반 페이지 분할 및 좌측 목차 지원) */}
                    {msg.content ? (
                      <PaginatedMarkdown
                        content={msg.content}
                        isStreaming={isStreaming}
                        components={markdownComponents}
                      />
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
                          onClick={() => handleCopyMessage(msg.id || idx, msg.content)}
                          title="답변 전체 복사"
                        >
                          {copiedMessageId === (msg.id || idx) ? (
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
  );
}
