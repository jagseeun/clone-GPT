import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, Sparkles } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  isLoading,
  onEnhancePrompt,
  isEnhancing,
}) {
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
          placeholder={
            isLoading
              ? '답변을 생성하는 중입니다...'
              : '메시지를 입력하세요... (Enter로 전송, Shift + Enter로 줄바꿈)'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        {/* AI 프롬프트 개선 버튼 */}
        <button
          className="enhance-btn"
          onClick={onEnhancePrompt}
          disabled={!input.trim() || isLoading || isEnhancing}
          title="입력한 질문을 AI 최고급 마스터 프롬프트로 개선합니다"
        >
          <Sparkles size={14} color="#10a37f" className={isEnhancing ? 'spin-animation' : ''} />
          <span>{isEnhancing ? '개선 중...' : '프롬프트 개선'}</span>
        </button>

        {/* 전송 / 생성 중단 버튼 */}
        {isLoading ? (
          <button
            className="send-btn stop-btn"
            onClick={onStop}
            title="답변 생성 중지"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={onSend}
            disabled={!input.trim()}
            title="메시지 전송"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      <div className="input-disclaimer">
        CloneGPT는 실수를 할 수 있습니다. 중요한 정보는 항상 확인하세요.
      </div>
    </div>
  );
}
