import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check } from 'lucide-react';

// 개별 코드 블록 컴포넌트 (언어 표시 + 원클릭 복사 버튼)
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeText = String(children).replace(/\n$/, '');

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

export default function ChatArea({ messages, isLoading, streamingMessageId }) {
  const scrollRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

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
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          if (inline) {
                            return <code className="inline-code" {...props}>{children}</code>;
                          }
                          return (
                            <CodeBlock className={className} {...props}>
                              {children}
                            </CodeBlock>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {isStreaming && (
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
