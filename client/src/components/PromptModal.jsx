import React from 'react';
import { Sparkles, X, Check, ArrowUp, RefreshCw } from 'lucide-react';

export default function PromptModal({
  isOpen,
  onClose,
  originalPrompt,
  enhancedPrompt,
  onApply,
  onSendDirectly,
  onRegenerate,
  isRegenerating,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={20} color="#10a37f" />
            <span>AI 프롬프트 마스터 개선</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 모달 본문 (비교 영역) */}
        <div className="modal-body">
          <p className="modal-description">
            세계 최고 수준의 프롬프트 엔지니어링 기법(<strong>전문가 페르소나 부여</strong>, <strong>구체적 맥락 정의</strong>, <strong>단계별 사고 유도</strong>, <strong>출력 양식 제약</strong>)을 적용하여 AI가 가장 완벽하게 답변할 수 있도록 개선했습니다.
          </p>

          <div className="prompt-comparison">
            {/* 원본 프롬프트 */}
            <div className="prompt-box original">
              <div className="prompt-box-label">입력한 원본 프롬프트</div>
              <div className="prompt-box-content">{originalPrompt}</div>
            </div>

            {/* 개선된 프롬프트 */}
            <div className="prompt-box enhanced">
              <div className="prompt-box-header">
                <div className="prompt-box-label highlight">
                  <Sparkles size={14} color="#10a37f" />
                  <span>개선된 마스터 프롬프트</span>
                </div>
                {onRegenerate && (
                  <button
                    className="icon-btn"
                    style={{ fontSize: '12px', padding: '3px 8px', gap: '4px' }}
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    title="다른 스타일로 다시 개선하기"
                  >
                    <RefreshCw size={12} className={isRegenerating ? 'spin-animation' : ''} />
                    <span>다시 생성</span>
                  </button>
                )}
              </div>
              <div className="prompt-box-content enhanced-content">
                {isRegenerating ? '새로운 최적화 프롬프트를 생성하고 있습니다...' : enhancedPrompt}
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 버튼 */}
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose}>
            취소
          </button>
          <button
            className="modal-btn outline"
            onClick={() => onApply(enhancedPrompt)}
            title="입력창에 이 프롬프트를 채워 넣고 검토합니다"
          >
            <Check size={16} />
            <span>입력창에 적용</span>
          </button>
          <button
            className="modal-btn primary"
            onClick={() => onSendDirectly(enhancedPrompt)}
            title="개선된 프롬프트로 즉시 답변을 요청합니다"
          >
            <ArrowUp size={16} />
            <span>바로 전송하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
