import React, { useState, useEffect } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  User,
  Sun,
  Moon,
  Search,
  Pencil,
  Check,
  X,
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  theme,
  onToggleTheme,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // 검색 필터링된 대화 목록
  const filteredConversations = conversations.filter((c) =>
    (c.title || '새로운 대화').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const startEditing = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title || '');
    setDeletingId(null);
  };

  const handleSaveRename = (id, e) => {
    e?.stopPropagation();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const startDeleting = (id, e) => {
    e.stopPropagation();
    setDeletingId(id);
    setEditingId(null);
  };

  const handleConfirmDelete = (id, e) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeletingId(null);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  // Escape 키 누르면 수정 또는 삭제 모드 취소
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEditingId(null);
        setDeletingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? '' : 'closed'}`}>
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewChat}>
          <Plus size={18} />
          <span>새로운 대화</span>
        </button>
        <button
          className="icon-btn"
          onClick={onToggle}
          title="사이드바 닫기"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* 4주차: 대화 실시간 검색창 */}
      <div className="sidebar-search-container">
        <div className="sidebar-search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="대화 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="검색어 지우기"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="history-section">
        <div className="history-title">
          {searchQuery ? `검색 결과 (${filteredConversations.length})` : '대화 내역'}
        </div>

        {filteredConversations.length === 0 ? (
          <div className="history-empty-box">
            <MessageSquare size={20} className="history-empty-icon" />
            <div className="history-empty-text">
              {searchQuery
                ? '일치하는 대화가 없습니다.'
                : '대화 내역이 없습니다.\n새 대화를 시작해보세요!'}
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isEditing = editingId === conv.id;
            const isDeleting = deletingId === conv.id;

            return (
              <div
                key={conv.id}
                className={`history-item ${conv.id === currentId ? 'active' : ''} ${isDeleting ? 'is-deleting' : ''}`}
                onClick={() => {
                  if (isDeleting) {
                    setDeletingId(null);
                    return;
                  }
                  if (!isEditing) {
                    onSelectConversation(conv.id);
                  }
                }}
              >
                {/* 1. 편집 모드 */}
                {isEditing ? (
                  <div className="history-item-edit-box" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="history-rename-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conv.id, e);
                        if (e.key === 'Escape') handleCancelRename(e);
                      }}
                      autoFocus
                    />
                    <button
                      className="history-action-btn confirm"
                      onClick={(e) => handleSaveRename(conv.id, e)}
                      title="저장"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="history-action-btn cancel"
                      onClick={handleCancelRename}
                      title="취소"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : isDeleting ? (
                  /* 2. [4주차 개선] ChatGPT 스타일 깔끔한 삭제 확인 모드 */
                  <div className="history-item-content delete-mode" onClick={(e) => e.stopPropagation()}>
                    <Trash2 size={16} className="delete-mode-icon" />
                    <span className="history-item-title deleting" title={conv.title}>
                      {conv.title}
                    </span>
                    <div className="history-actions active-actions">
                      <button
                        className="history-action-btn confirm-delete-btn"
                        onClick={(e) => handleConfirmDelete(conv.id, e)}
                        title="삭제 확인"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        className="history-action-btn cancel-delete-btn"
                        onClick={handleCancelDelete}
                        title="취소"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 3. 일반 목록 모드 */
                  <>
                    <div className="history-item-content">
                      <MessageSquare size={16} />
                      <span className="history-item-title" title={conv.title}>
                        {conv.title}
                      </span>
                    </div>

                    <div className="history-actions">
                      <button
                        className="history-action-btn"
                        onClick={(e) => startEditing(conv, e)}
                        title="대화 제목 수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="history-action-btn delete-btn"
                        onClick={(e) => startDeleting(conv.id, e)}
                        title="대화 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 설정 및 기능 제어 푸터 */}
      <div className="sidebar-footer">
        {/* 라이트 / 다크 테마 전환 */}
        <div
          className="sidebar-setting-row"
          onClick={onToggleTheme}
          title="라이트 모드와 다크 모드를 전환합니다"
        >
          <div className="setting-label">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </div>

        {/* 사용자 프로필 배지 */}
        <div className="user-badge">
          <div className="avatar user-avatar">
            <User size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>사용자</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              DeepSeek Connected
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
