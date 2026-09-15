import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ChatInput({ input, setInput, onSend, isLoading }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSend();
      }
    }
  };

  return (
    <div className="input-section">
      <div className="input-container">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          rows={1}
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="send-btn"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          title="메시지 전송"
        >
          <ArrowUp size={18} />
        </button>
      </div>
      <div className="input-disclaimer">
        CloneGPT는 실수를 할 수 있습니다. 중요한 정보는 항상 확인하세요.
      </div>
    </div>
  );
}
