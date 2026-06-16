import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import {
  EditOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  DatabaseOutlined,
  SettingOutlined,
  SearchOutlined,
  MoreOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import type { Session, Status } from '../types'
import { escapeHtml, statusLabel } from '../utils'
import { StatusDot, IconButton } from './primitives'
import brandLogo from '../../../assets/LocalLLM-brandLogo.png'

interface SidebarProps {
  sessions: Session[]
  currentSessionId: string
  historySearch: string
  historyMenuId: string
  sidebarCollapsed: boolean
  view: 'chat' | 'terminal' | 'knowledge'
  chatMessages: unknown[]
  status: Status
  settingsOpen: boolean
  busy: boolean
  onNewChat: () => void
  onFocusChat: () => void
  onShowTerminal: () => void
  onShowKnowledgeBase: () => void
  onSearchChange: (value: string) => void
  onOpenSession: (sessionId: string) => void
  onToggleHistoryMenu: (sessionId: string) => void
  onEditSession: (sessionId: string) => void
  onExportSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onToggleSettings: () => void
  onToggleSidebar: () => void
  onSave: () => void
  onStart: () => void
  onStop: () => void
}

type GroupKey = 'pinned' | 'today' | 'yesterday' | 'lastWeek' | 'earlier'
interface Group {
  key: GroupKey
  label: string
  sessions: Session[]
}

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'lastWeek', 'earlier']

function getGroups(sessions: Session[]): Group[] {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = startOfDay - 86400000
  const weekStart = startOfDay - 7 * 86400000

  const buckets: Record<Exclude<GroupKey, 'pinned'>, Session[]> = {
    today: [],
    yesterday: [],
    lastWeek: [],
    earlier: [],
  }
  for (const s of sessions) {
    const ts = s.updatedAt || s.createdAt || 0
    if (ts >= startOfDay) buckets.today.push(s)
    else if (ts >= yesterdayStart) buckets.yesterday.push(s)
    else if (ts >= weekStart) buckets.lastWeek.push(s)
    else buckets.earlier.push(s)
  }

  const labelMap: Record<Exclude<GroupKey, 'pinned'>, string> = {
    today: '今天',
    yesterday: '昨天',
    lastWeek: '上周',
    earlier: '更早',
  }
  return GROUP_ORDER
    .map((k) => ({ key: k, label: labelMap[k], sessions: buckets[k] }))
    .filter((g) => g.sessions.length > 0)
}

function formatRelative(ts: number): string {
  const now = Date.now()
  const diff = Math.max(0, now - ts)
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const d = new Date(ts)
  const today = new Date()
  if (d.getFullYear() === today.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export function Sidebar({
  sessions,
  currentSessionId,
  historySearch,
  historyMenuId,
  view,
  status,
  settingsOpen,
  busy,
  onNewChat,
  onFocusChat,
  onShowTerminal,
  onShowKnowledgeBase,
  onSearchChange,
  onOpenSession,
  onToggleHistoryMenu,
  onEditSession,
  onExportSession,
  onDeleteSession,
  onToggleSettings,
  onSave,
  onStart,
  onStop,
}: SidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(new Set())

  const filteredSessions = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) =>
      String(s.title || '').toLowerCase().includes(q),
    )
  }, [sessions, historySearch])

  const groups = useMemo(() => getGroups(filteredSessions), [filteredSessions])
  const totalCount = filteredSessions.length

  const historyListRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!historyListRef.current) return
    const activeEl = historyListRef.current.querySelector('.sb-item.is-active')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentSessionId])

  // close menu on outside click
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!historyMenuId) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggleHistoryMenu(historyMenuId)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [historyMenuId, onToggleHistoryMenu])

  const toggleGroup = useCallback((key: GroupKey) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const running = status.state === 'running' || status.state === 'starting'
  const handleStatusAction = () => {
    if (busy) return
    if (running) onStop()
    else {
      onSave()
      onStart()
    }
  }

  const statusKind: 'running' | 'stopped' | 'warning' | 'danger' | 'idle' | 'pending' | 'error' =
    status.state === 'running' ? 'running' :
    status.state === 'error' ? 'error' :
    status.state === 'starting' || status.state === 'stopping' ? 'pending' :
    'stopped'

  const navItems = [
    { key: 'chat', label: '对话', icon: <MessageOutlined />, active: view === 'chat', onClick: onFocusChat, title: '进入对话' },
    { key: 'knowledge', label: '知识库', icon: <DatabaseOutlined />, active: view === 'knowledge', onClick: onShowKnowledgeBase, title: '管理知识库' },
    { key: 'settings', label: '设置', icon: <SettingOutlined />, active: view === 'settings', onClick: onToggleSettings, title: '打开设置' },
  ]

  return (
    <aside className="sidebar sb-v2">
      {/* ----- Brand row ----- */}
      <div className="sb-brand">
        <div className="sb-mark" aria-hidden="true">
          <img src={brandLogo} alt="" />
        </div>
        <div className="sb-brand-text">
          <strong>LocalLLM Studio</strong>
          <span>本地模型对话</span>
        </div>
      </div>

      {/* ----- Quick nav (icon row) ----- */}
      <div className="sb-quicknav" role="tablist" aria-label="视图切换">
        {navItems.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={it.active}
            title={it.title}
            className={`sb-quicknav-item ${it.active ? 'is-active' : ''}`}
            onClick={it.onClick}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
      </div>

      {/* ----- New chat (primary) ----- */}
      <button
        type="button"
        className="sb-newchat"
        onClick={onNewChat}
        data-action="new-chat"
      >
        <PlusOutlined />
        <span>新对话</span>
        <span className="sb-newchat-hint">
          <span className="sb-newchat-hint-text">新建</span>
        </span>
      </button>

      {/* ----- Search ----- */}
      <div className="p-field sb-search">
        <span className="icon-left"><SearchOutlined /></span>
        <input
          data-history-search
          placeholder="搜索会话"
          value={historySearch}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {historySearch ? (
          <button
            type="button"
            className="sb-search-clear"
            onClick={() => onSearchChange('')}
            aria-label="清空"
            title="清空"
          >
            ×
          </button>
        ) : null}
      </div>

      {/* ----- Session list ----- */}
      <div className="sb-list" ref={historyListRef}>
        <div className="sb-list-header">
          <span className="sb-list-title">会话</span>
          <span className="sb-list-count">{totalCount}</span>
        </div>

        {groups.length === 0 ? (
          <div className="sb-empty">
            {historySearch ? '没有匹配的会话' : '还没有会话，开始一次新对话试试'}
          </div>
        ) : (
          <div className="sb-groups">
            {groups.map((g) => {
              const collapsed = collapsedGroups.has(g.key)
              return (
                <section key={g.key} className="sb-group">
                  <button
                    type="button"
                    className="sb-group-header"
                    onClick={() => toggleGroup(g.key)}
                    aria-expanded={!collapsed}
                  >
                    <span className="sb-group-caret" data-collapsed={collapsed ? 'true' : 'false'}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="sb-group-label">{g.label}</span>
                    <span className="sb-group-count">{g.sessions.length}</span>
                  </button>
                  {!collapsed ? (
                    <ul className="sb-items" role="list">
                      {g.sessions.map((s) => {
                        const isActive = s.id === currentSessionId
                        const ts = s.updatedAt || s.createdAt || 0
                        const open = historyMenuId === s.id
                        return (
                          <li
                            key={s.id}
                            className={`sb-item ${isActive ? 'is-active' : ''}`}
                            role="listitem"
                          >
                            <button
                              type="button"
                              className="sb-item-main"
                              onClick={() => onOpenSession(s.id)}
                              title={s.title || '新聊天'}
                            >
                              <span className="sb-item-icon" aria-hidden="true">
                                <MessageOutlined />
                              </span>
                              <span className="sb-item-text">
                                <span className="sb-item-title">{escapeHtml(s.title || '新聊天')}</span>
                                <span className="sb-item-meta">{formatRelative(ts)}</span>
                              </span>
                            </button>
                            <div className="sb-item-actions">
                              <IconButton
                                size="sm"
                                title="更多"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleHistoryMenu(s.id)
                                }}
                              >
                                <MoreOutlined />
                              </IconButton>
                            </div>

                            {open ? (
                              <div className="sb-menu" ref={menuRef} role="menu">
                                <button
                                  type="button"
                                  className="sb-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditSession(s.id)
                                    onToggleHistoryMenu(s.id)
                                  }}
                                >
                                  <EditOutlined />
                                  <span>编辑</span>
                                </button>
                                <button
                                  type="button"
                                  className="sb-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onExportSession(s.id)
                                    onToggleHistoryMenu(s.id)
                                  }}
                                >
                                  <DownloadOutlined />
                                  <span>导出</span>
                                </button>
                                <div className="sb-menu-sep" />
                                <button
                                  type="button"
                                  className="sb-menu-item danger"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteSession(s.id)
                                    onToggleHistoryMenu(s.id)
                                  }}
                                >
                                  <DeleteOutlined />
                                  <span>删除</span>
                                </button>
                              </div>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* ----- Bottom: status ----- */}
      <div className="sb-bottom">
        <button
          type="button"
          className={`sb-status ${running ? 'is-running' : ''}`}
          onClick={handleStatusAction}
          disabled={busy}
          title={running ? '点击停止服务' : '点击保存并启动服务'}
        >
          <StatusDot kind={statusKind} />
          <span className="sb-status-text">
            <span className="sb-status-name">{statusLabel(status.state)}</span>
            {status.url ? <span className="sb-status-url">{escapeHtml(status.url)}</span> : null}
          </span>
        </button>
      </div>
    </aside>
  )
}
