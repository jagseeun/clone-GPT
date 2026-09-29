import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Sparkles, Paperclip, FileText, X } from 'lucide-react';

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
  const fileInputRef = useRef(null);
  const [attachedFile, setAttachedFile] = useState(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || attachedFile) && !isLoading) {
        handleSubmit();
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 최대 1MB 크기 제한 (텍스트/코드 분석용)
    if (file.size > 1024 * 1024) {
      alert('파일 크기는 최대 1MB까지 첨부할 수 있습니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const sizeStr =
        file.size < 1024
          ? `${file.size} B`
          : `${(file.size / 1024).toFixed(1)} KB`;

      setAttachedFile({
        name: file.name,
        size: sizeStr,
        content,
        extension,
      });
    };
    reader.onerror = () => {
      alert('파일을 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const handleSubmit = () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;
    onSend(attachedFile);
    setAttachedFile(null);
  };

  return (
    <div className="input-section">
      <div className="input-container">
        {/* 4주차: 첨부된 파일 칩 배지 */}
        {attachedFile && (
          <div className="attached-file-badge">
            <FileText size={14} className="file-icon" />
            <span className="attached-file-name" title={attachedFile.name}>
              {attachedFile.name}
            </span>
            <span className="attached-file-size">({attachedFile.size})</span>
            <button
              className="attached-file-remove-btn"
              onClick={handleRemoveFile}
              title="첨부 파일 취소"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* 숨김 파일 입력기 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".txt,.md,.py,.js,.jsx,.ts,.tsx,.json,.csv,.html,.css,.sql,.sh,.yml,.yaml,.xml,.c,.cpp,.java,.env"
        />

        <div className="input-row">
          {/* 4주차: 파일 첨부 버튼 (클립) */}
          <button
            className="attach-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="텍스트 또는 소스코드 파일 첨부 (.txt, .py, .js, .json, .md 등)"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            placeholder={
              isLoading
                ? '답변을 생성하는 중입니다...'
                : attachedFile
                ? `${attachedFile.name}에 대해 질문하거나 지시사항을 입력하세요...`
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
              onClick={handleSubmit}
              disabled={!input.trim() && !attachedFile}
              title="메시지 전송"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="input-disclaimer">
        CloneGPT는 실수를 할 수 있습니다. 중요한 정보는 항상 확인하세요.
      </div>
    </div>
  );
}
