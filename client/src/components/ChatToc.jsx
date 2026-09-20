import React from 'react';
import { Bookmark } from 'lucide-react';

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

/**
 * 챗봇 아이콘 바로 밑에 배치되는 배경 없는 텍스트 목차 컴포넌트
 */
export function MessageToc({ pages, currentPageIdx, onSelectPage, isFullView }) {
  if (!pages || pages.length < 2) return null;

  return (
    <nav className="avatar-sub-toc">
      <div className="sub-toc-header">
        <Bookmark size={11} color="#10a37f" />
        <span>목차</span>
      </div>

      <div className="sub-toc-list">
        {pages.map((p, idx) => {
          const isActive = !isFullView && currentPageIdx === idx;
          return (
            <button
              key={p.id || idx}
              className={`sub-toc-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPage(idx)}
              title={`${idx + 1}. ${p.title}`}
            >
              <span className="sub-toc-num">{idx + 1}.</span>
              <span className="sub-toc-title">{p.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MessageToc;
