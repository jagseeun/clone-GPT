import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  FileText, 
  List, 
  PanelLeftClose, 
  PanelLeftOpen,
  Bookmark
} from 'lucide-react';

/**
 * 마크다운 본문을 헤딩(#, ##, ###) 단위로 파싱하여 페이지 배열로 분할
 * @param {string} content 
 * @returns {Array<{id: number, title: string, content: string}> | null}
 */
export function parseMarkdownPages(content) {
  if (!content || typeof content !== 'string') return null;
  const text = content.trim();

  // 1. 각 레벨별 헤딩 검색
  const h1Matches = [...text.matchAll(/^#\s+([^\n]+)/gm)];
  const h2Matches = [...text.matchAll(/^##\s+([^\n]+)/gm)];
  const h3Matches = [...text.matchAll(/^###\s+([^\n]+)/gm)];

  let splitLevel = 0;
  if (h1Matches.length >= 2) {
    splitLevel = 1;
  } else if (h2Matches.length >= 2) {
    splitLevel = 2;
  } else if (h3Matches.length >= 2) {
    splitLevel = 3;
  }

  // 나눌 만한 2개 이상의 메인 헤딩이 없으면 단일 페이지로 유지
  if (splitLevel === 0) return null;

  const splitRegex = 
    splitLevel === 1 
      ? /(?=^#\s+[^\n]+)/gm 
      : splitLevel === 2 
        ? /(?=^##\s+[^\n]+)/gm 
        : /(?=^###\s+[^\n]+)/gm;

  const rawChunks = text.split(splitRegex).filter((c) => c.trim().length > 0);
  if (rawChunks.length < 2) return null;

  const pages = [];
  let intro = '';

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i].trim();
    const firstLine = chunk.split('\n')[0].trim();
    const headingPattern = 
      splitLevel === 1 
        ? /^#\s+(.+)$/ 
        : splitLevel === 2 
          ? /^##\s+(.+)$/ 
          : /^###\s+(.+)$/;
    const match = firstLine.match(headingPattern);

    if (match) {
      const cleanTitle = match[1].replace(/[*_`#]/g, '').trim();
      const pageContent = intro ? `${intro}\n\n${chunk}` : chunk;
      intro = '';
      pages.push({
        id: pages.length + 1,
        title: cleanTitle,
        content: pageContent,
      });
    } else {
      // 첫 번째 헤딩 이전의 도입부 텍스트
      intro = chunk;
    }
  }

  if (intro && pages.length > 0) {
    pages[0].content = `${intro}\n\n${pages[0].content}`;
  }

  return pages.length >= 2 ? pages : null;
}

export default function PaginatedMarkdown({ content, isStreaming, components }) {
  const pages = useMemo(() => {
    // 실시간 스트리밍 중에는 끊김 없이 전체를 보여주고, 완료 시 페이지 분할 계산
    if (isStreaming) return null;
    return parseMarkdownPages(content);
  }, [content, isStreaming]);

  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState('paginated'); // 'paginated' | 'full'
  const [isTocOpen, setIsTocOpen] = useState(true);
  const cardRef = useRef(null);
  const isFirstMount = useRef(true);

  // 페이지 변경 시 해당 카드 위치로 부드럽게 스크롤
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  // 페이지 분할이 필요 없거나 단일 섹션인 경우 기본 마크다운으로 렌더링
  if (!pages || pages.length < 2) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    );
  }

  const safeCurrentPage = Math.min(currentPage, pages.length - 1);
  const currentSection = pages[safeCurrentPage];

  return (
    <div className="paginated-card" ref={cardRef}>
      {/* 1. 상단 컨트롤 바 */}
      <div className="paginated-topbar">
        <div className="paginated-left-meta">
          <button
            className={`toc-toggle-pill ${isTocOpen ? 'active' : ''}`}
            onClick={() => setIsTocOpen(!isTocOpen)}
            title={isTocOpen ? '목차 접기' : '목차 펼치기'}
          >
            {isTocOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
            <span>목차 {isTocOpen ? '접기' : '보기'}</span>
          </button>

          {viewMode === 'paginated' && (
            <div className="page-breadcrumb">
              <span className="badge-page-num">
                {safeCurrentPage + 1} / {pages.length}
              </span>
              <span className="page-breadcrumb-title" title={currentSection.title}>
                {currentSection.title}
              </span>
            </div>
          )}
        </div>

        {/* 뷰 모드 전환 버튼 (페이지 모드 vs 전체 보기) */}
        <div className="paginated-mode-toggles">
          <button
            className={`mode-toggle-btn ${viewMode === 'paginated' ? 'active' : ''}`}
            onClick={() => setViewMode('paginated')}
            title="페이지별로 나누어 읽기"
          >
            <BookOpen size={13} />
            <span>페이지 모드</span>
          </button>
          <button
            className={`mode-toggle-btn ${viewMode === 'full' ? 'active' : ''}`}
            onClick={() => setViewMode('full')}
            title="전체 내용을 한 번에 연속으로 읽기"
          >
            <FileText size={13} />
            <span>전체 보기</span>
          </button>
        </div>
      </div>

      {/* 2. 본문 영역 */}
      {viewMode === 'paginated' ? (
        <div className={`paginated-main ${isTocOpen ? 'toc-open' : 'toc-closed'}`}>
          {/* 왼쪽 목차 (TOC) */}
          {isTocOpen && (
            <aside className="paginated-toc-aside">
              <div className="toc-title-header">
                <Bookmark size={13} color="#10a37f" />
                <span>목차 (TOC)</span>
              </div>
              <div className="toc-nav-list">
                {pages.map((p, idx) => {
                  const isActive = idx === safeCurrentPage;
                  return (
                    <button
                      key={p.id}
                      className={`toc-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setCurrentPage(idx)}
                      title={p.title}
                    >
                      <span className="toc-nav-num">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="toc-nav-text">{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* 오른쪽 페이지 본문 마크다운 */}
          <div className="paginated-content-wrapper">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {currentSection.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        /* 전체 보기 모드 */
        <div className="paginated-full-wrapper">
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* 3. 하단 페이지 네비게이션 바 (페이지 모드일 때만 표시) */}
      {viewMode === 'paginated' && (
        <div className="paginated-bottom-bar">
          <button
            className="paginated-nav-btn prev"
            disabled={safeCurrentPage === 0}
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            title="이전 페이지 (이전 섹션)"
          >
            <ChevronLeft size={16} />
            <span>이전 페이지</span>
          </button>

          {/* 빠른 이동 점(Dots) 네비게이션 */}
          <div className="paginated-dots-nav">
            {pages.map((p, idx) => (
              <button
                key={idx}
                className={`page-jump-dot ${idx === safeCurrentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(idx)}
                title={`${idx + 1}섹션: ${p.title}`}
              />
            ))}
          </div>

          <span className="paginated-counter">
            <strong>{safeCurrentPage + 1}</strong> / {pages.length}
          </span>

          <button
            className="paginated-nav-btn next"
            disabled={safeCurrentPage === pages.length - 1}
            onClick={() => setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1))}
            title="다음 페이지 (다음 섹션)"
          >
            <span>다음 페이지</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
