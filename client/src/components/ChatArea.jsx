import React, { useEffect, useRef } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';

export default function ChatArea({ messages, isLoading }) {
  const scrollRef = useRef(null);
  const [copiedId, setCopiedId] = React.useState(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="chat-messages" ref={scrollRef}>
      <div className="chat-messages-container">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id || idx} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
              {!isUser && (
                <div className="avatar bot-avatar">
                  <Bot size={18} />
                </div>
              )}
              <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
                <div className="message-content">
                  {msg.content}
                </div>
                {!isUser && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      className="icon-btn"
                      style={{ padding: '4px', fontSize: '12px' }}
                      onClick={() => handleCopy(msg.id || idx, msg.content)}
                      title="메시지 복사"
                    >
                      {copiedId === (msg.id || idx) ? <Check size={14} color="#10a37f" /> : <Copy size={14} />}
                    </button>
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

        {isLoading && (
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
