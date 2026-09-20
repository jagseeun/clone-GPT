import React from 'react';
import { Bookmark, ChevronUp, ChevronDown, PanelLeftClose, PanelLeftOpen, Layers } from 'lucide-react';

/**
 * 마크다운 본문을 코드 블록 손상 없이 안전하게 헤딩(# 또는 ##) 단위의 페이지로 분할
 */
export function splitMarkdownPages(content) {
  if (!content || typeof content !== 'string') {
    return [{ id: 'page-0', title: '전체', content: content || '' }];
  }

  const lines = content.split('\n');
  const pages = [];
  let currentTitle = '개요';
  let currentLines = [];
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 코드 블록 감지 (``` 또는 ~~~)
    if (/^```|^~~~/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      currentLines.push(line);
      continue;
    }

    // 코드 블록 내부의 # 주석은 절대 헤딩으로 분할하지 않음
    if (inCodeFence) {
      currentLines.push(line);
      continue;
    }

    // 코드 블록 외부의 #, ## 헤딩 감지
    const headingMatch = trimmed.match(/^(#{1,2})\s+(.+)$/);
    if (headingMatch) {
      const cleanTitle = headingMatch[2].replace(/[*_`#]/g, '').trim();

      // 이전 페이지에 내용이 있으면 페이지로 저장
      if (currentLines.join('').trim().length > 0) {
        pages.push({
          id: `page-${pages.length}`,
          title: currentTitle,
          content: currentLines.join('\n').trim(),
        });
        currentLines = [];
      }

      currentTitle = cleanTitle || `섹션 ${pages.length + 1}`;
      currentLines.push(line); // 헤딩 라인 포함
    } else {
      currentLines.push(line);
    }
  }

  // 마지막 남은 라인들 푸시
  if (currentLines.length > 0 && currentLines.join('').trim().length > 0) {
    pages.push({
      id: `page-${pages.length}`,
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    });
  }

  // 스트리밍 등으로 인해 닫히지 않은 코드 블록이 있다면 닫아주기
  for (const page of pages) {
    const fences = (page.content.match(/^```/gm) || []).length;
    if (fences % 2 !== 0) {
      page.content += '\n```';
    }
  }

  // 1페이지 이하이면 분할 없이 반환
  if (pages.length <= 1) {
    return [{ id: 'page-0', title: '전체', content }];
  }

  return pages;
}

export default function ChatToc({
  isOpen,
  onToggle,
  pages = [],
  currentPageIdx = 0,
  isFullView = false,
  onToggleFullView,
  onSelectPage,
  onStep,
}) {
  if (!pages || pages.length < 2) return null;

  return (
    <>
      {/* 1. 좌측 도킹 목차 사이드바 (채팅창 바로 왼쪽) */}
      <aside className={`chat-side-toc ${isOpen ? 'open' : 'closed'}`}>
        <div className="side-toc-header">
          <div className="side-toc-title">
            <Bookmark size={14} color="#10a37f" />
            <span>페이지 목차</span>
          </div>
          <div className="side-toc-actions">
            {/* 이전/다음 페이지 스텝 버튼 */}
            <div className="side-toc-stepper">
              <button
                className="toc-step-btn"
                onClick={() => onStep(-1)}
                disabled={currentPageIdx <= 0 || isFullView}
                title="이전 페이지로 이동"
              >
                <ChevronUp size={13} />
              </button>
              <button
                className="toc-step-btn"
                onClick={() => onStep(1)}
                disabled={currentPageIdx >= pages.length - 1 || isFullView}
                title="다음 페이지로 이동"
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
          <span>
            {isFullView
              ? `전체 ${pages.length}개 페이지 펼침`
              : `${currentPageIdx + 1} / ${pages.length} 페이지`}
          </span>
          {onToggleFullView && (
            <button
              className="side-toc-viewmode-btn"
              onClick={onToggleFullView}
              title={isFullView ? '페이지별 모드로 전환' : '전체 연속 모드로 전환'}
            >
              <Layers size={11} />
              <span>{isFullView ? '페이지 보기' : '전체 보기'}</span>
            </button>
          )}
        </div>

        {/* 목차 페이지 리스트 */}
        <nav className="side-toc-nav">
          {pages.map((p, idx) => {
            const isActive = !isFullView && currentPageIdx === idx;
            return (
              <button
                key={p.id || idx}
                className={`side-toc-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectPage(idx)}
                title={`${idx + 1}페이지: ${p.title}`}
              >
                <span className="side-toc-num">{String(idx + 1).padStart(2, '0')}</span>
                <span className="side-toc-text">{p.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 2. 목차가 닫혀있을 때 화면 좌측에 노출되는 미니 토글 알약 버튼 */}
      {!isOpen && (
        <button
          className="side-toc-open-pill"
          onClick={onToggle}
          title="목차 열기"
        >
          <PanelLeftOpen size={14} />
          <span>목차 ({pages.length}P)</span>
        </button>
      )}
    </>
  );
}
