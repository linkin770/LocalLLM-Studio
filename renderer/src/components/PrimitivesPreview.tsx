// 临时组件 — Step 2 验证用：展示新原子组件库
// 可在 Step 3 验收后删除
import { useState } from 'react'
import { StatusDot, Pill, Chip, IconButton, TextField, Kbd, KbdGroup, Divider, Button, StatusPill } from './primitives'

export function PrimitivesPreview() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('qwen2.5-7b')

  return (
    <>
      {/* 触发按钮：固定右下角小尺寸 */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="原子组件预览 (Step 2 临时)"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 1000,
          width: 32,
          height: 32,
          borderRadius: 16,
          background: 'var(--ink-1)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          boxShadow: 'var(--shadow-lg)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        p
      </button>

      {open ? (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 56,
            zIndex: 1000,
            width: 480,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--line-strong)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-xl)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-1)' }}>原子组件预览</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Step 2 · 临时调试面板</div>
            </div>
            <IconButton size="sm" bordered onClick={() => setOpen(false)} aria-label="关闭">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </IconButton>
          </div>

          {/* StatusDot */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>StatusDot</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><StatusDot kind="running" /> running · 脉冲</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><StatusDot kind="starting" /> starting · 旋转</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><StatusDot kind="stopped" /> stopped</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><StatusDot kind="warning" /> warning</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><StatusDot kind="danger" /> danger</span>
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Pill */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pill</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Pill tone="success">就绪</Pill>
              <Pill tone="warning">加载中</Pill>
              <Pill tone="danger">错误</Pill>
              <Pill tone="neutral">空闲</Pill>
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Chip */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Chip</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Chip dot="accent">qwen2.5-7b-Q4</Chip>
              <Chip dot="success">运行中</Chip>
              <Chip dot="warning">启动中</Chip>
              <Chip tone="accent" onRemove={() => {}}>code-review</Chip>
              <Chip tone="success">screenshot.png</Chip>
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* StatusPill */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>StatusPill</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusPill status="running" name="qwen2.5-7b-Q4" meta=":8080" />
              <StatusPill status="starting" name="qwen2.5-7b" meta="加载中…" />
              <StatusPill status="stopped" name="已停止" />
              <StatusPill status="running" name="24.6 t/s" bare />
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Button + IconButton */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Button / IconButton</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary">保存</Button>
              <Button variant="secondary">取消</Button>
              <Button variant="ghost">放弃</Button>
              <Button variant="danger">删除</Button>
              <IconButton bordered>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </IconButton>
              <IconButton size="sm" bordered>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </IconButton>
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* TextField */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>TextField</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TextField
                placeholder="搜索..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                iconLeft={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>}
              />
              <TextField size="sm" placeholder="小号" />
              <TextField placeholder="带后缀" suffix="t/s" />
            </div>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Kbd */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Kbd / KbdGroup</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>
              <KbdGroup><Kbd>⌘</Kbd><Kbd>⇧</Kbd><Kbd>P</Kbd></KbdGroup>
              <Kbd>↵</Kbd>
              <Kbd>ESC</Kbd>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
