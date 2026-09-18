import React from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, User, Brain, Sun, Moon } from 'lucide-react';

export default function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  theme,
  onToggleTheme,
  useGlobalMemory,
  onToggleMemory,
}) {
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

      <div className="history-section">
        <div className="history-title">대화 내역</div>
        {conversations.length === 0 ? (
          <div style={{ padding: '16px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            대화 내역이 없습니다.
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`history-item ${conv.id === currentId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="history-item-content">
                <MessageSquare size={16} />
                <span className="history-item-title" title={conv.title}>
                  {conv.title}
                </span>
              </div>
              <button
                className="delete-chat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                title="대화 삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 설정 및 기능 제어 푸터 */}
      <div className="sidebar-footer">
        {/* 이전 대화 기억(전역 메모리) ON/OFF */}
        <div
          className="sidebar-setting-row"
          onClick={onToggleMemory}
          title="다른 대화방의 과거 기억을 참고할지 여부를 설정합니다"
        >
          <div className="setting-label">
            <Brain size={16} color={useGlobalMemory ? '#10a37f' : 'var(--text-muted)'} />
            <span>이전 대화 기억</span>
          </div>
          <label className="switch" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={useGlobalMemory}
              onChange={onToggleMemory}
            />
            <span className="slider"></span>
          </label>
        </div>

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
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>사용자</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CloneGPT Pro</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
