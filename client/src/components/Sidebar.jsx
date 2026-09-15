import React from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, User } from 'lucide-react';

export default function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
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

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="avatar user-avatar">
            <User size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>사용자</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CloneGPT Free Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
