import React from 'react';
import { Bookmark, ChevronUp, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

/**
 * 텍스트 슬러그 생성 함수
 */
/**
 * 텍스트 슬러그 생성 함수 (메시지 ID 접두사 지원)
 */
export function slugify(text, msgId = '') {
  if (!text) return '';
  const clean = text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
  const base = clean ? `sec-${clean}` : 'sec-item';
  return msgId ? `${msgId}-${base}` : base;
}

/**
 * 마크다운 본문에서 코드 블록을 제외하고 헤딩(#, ##, ###) 목록 추출
 */
export function extractHeadings(content, msgId = '') {
  if (!content || typeof content !== 'string') return [];

  // 코드 블록 내부의 주석(# 등)은 헤딩으로 오인되지 않도록 제거
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
  const lines = stripped.split('\n');
  const items = [];
  const seenCounts = {};

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const cleanTitle = match[2].replace(/[*_`#]/g, '').trim();
      if (cleanTitle) {
        const base = slugify(cleanTitle, msgId);
        let id = base;
        if (!seenCounts[base]) {
          seenCounts[base] = 1;
        } else {
          id = `${base}-${seenCounts[base]}`;
          seenCounts[base]++;
        }
        items.push({
          id,
          level,
          title: cleanTitle,
        });
      }
    }
  }
  return items;
}

export default function ChatToc({
  headings = [],
  activeHeadingId,
  activeHeadingIdx = 0,
  isOpen,
  onToggle,
  onSelectHeading,
  onStep,
}) {
  if (!headings || headings.length < 2) return null;

  return (
    <>
      {/* 1. 좌측 도킹 목차 사이드바 (채팅창 바로 왼쪽) */}
      <aside className={`chat-side-toc ${isOpen ? 'open' : 'closed'}`}>
        <div className="side-toc-header">
          <div className="side-toc-title">
            <Bookmark size={14} color="#10a37f" />
            <span>목차 (TOC)</span>
          </div>
          <div className="side-toc-actions">
            {/* 이전/다음 섹션 스텝 버튼 */}
            <div className="side-toc-stepper">
              <button
                className="toc-step-btn"
                onClick={() => onStep(-1)}
                disabled={activeHeadingIdx <= 0}
                title="이전 섹션으로 이동"
              >
                <ChevronUp size={13} />
              </button>
              <button
                className="toc-step-btn"
                onClick={() => onStep(1)}
                disabled={activeHeadingIdx >= headings.length - 1}
                title="다음 섹션으로 이동"
              >
                <ChevronDown size={13} />
              </button>
            </div>
            <button
              className="side-toc-close-btn"
              onClick={onToggle}
              title="목차 닫기"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>

        <div className="side-toc-subhead">
          <span>{activeHeadingIdx + 1} / {headings.length} 섹션</span>
        </div>

        {/* 목차 리스트 */}
        <nav className="side-toc-nav">
          {headings.map((h, idx) => {
            const isActive = activeHeadingId === h.id || activeHeadingIdx === idx;
            return (
              <button
                key={h.id}
                className={`side-toc-item level-${h.level} ${isActive ? 'active' : ''}`}
                onClick={() => onSelectHeading(h.id, idx)}
                title={h.title}
              >
                <span className="side-toc-num">{String(idx + 1).padStart(2, '0')}</span>
                <span className="side-toc-text">{h.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 2. 목차가 닫혀있을 때 화면 좌측에 노출되는 미니 토글 버튼 */}
      {!isOpen && (
        <button
          className="side-toc-open-pill"
          onClick={onToggle}
          title="목차 열기"
        >
          <PanelLeftOpen size={14} />
          <span>목차 ({headings.length})</span>
        </button>
      )}
    </>
  );
}
