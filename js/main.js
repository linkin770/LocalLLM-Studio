/* =================================================================
   本语 / LocalLLM Studio — Design Preview
   交互：视图切换、侧边栏折叠、prompt 卡片、菜单、新对话、状态模拟
   ================================================================= */

(function () {
  'use strict';

  // ============== 视图切换（侧边栏 segmented nav） ==============
  const navItems = document.querySelectorAll('.sb-quicknav-item');
  const views = document.querySelectorAll('[data-view-panel]');
  function switchView(viewName) {
    navItems.forEach((n) => {
      const active = n.dataset.view === viewName;
      n.classList.toggle('is-active', active);
      n.setAttribute('aria-selected', String(active));
    });
    views.forEach((v) => {
      v.hidden = v.dataset.viewPanel !== viewName
        && v.dataset.viewPanel !== (viewName === 'chat' ? 'chat-with-msgs' : 'chat-with-msgs');
    });
  }
  navItems.forEach((n) => {
    n.addEventListener('click', () => {
      const view = n.dataset.view;
      // 切到知识库 / 设置时清空 chat 内容；切回对话时恢复
      views.forEach((v) => {
        if (v.dataset.viewPanel === 'chat' || v.dataset.viewPanel === 'chat-with-msgs') {
          v.hidden = view !== 'chat';
        } else {
          v.hidden = v.dataset.viewPanel !== view;
        }
      });
    });
  });

  // ============== 侧边栏折叠 ==============
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggleSidebar');
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // ============== 会话列表点击切换 ==============
  const sessionItems = document.querySelectorAll('.sb-item');
  sessionItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      // 忽略菜单按钮点击
      if (e.target.closest('.sb-item-menu') || e.target.closest('.sb-menu')) return;
      sessionItems.forEach((n) => n.classList.remove('is-active'));
      item.classList.add('is-active');
      // 切到带消息的视图
      const title = item.dataset.title || '新对话';
      const chatWithMsgs = document.querySelector('[data-view-panel="chat-with-msgs"]');
      // 简单演示：切到"量子计算"时显示完整对话，其他显示空状态
      if (title.includes('量子')) {
        views.forEach((v) => {
          v.hidden = v.dataset.viewPanel !== 'chat-with-msgs';
        });
        navItems.forEach((n) => {
          const active = n.dataset.view === 'chat';
          n.classList.toggle('is-active', active);
          n.setAttribute('aria-selected', String(active));
        });
      } else {
        views.forEach((v) => {
          v.hidden = v.dataset.viewPanel !== 'chat';
        });
        navItems.forEach((n) => {
          const active = n.dataset.view === 'chat';
          n.classList.toggle('is-active', active);
          n.setAttribute('aria-selected', String(active));
        });
      }
    });
  });

  // ============== 会话菜单 ==============
  const allMenus = document.querySelectorAll('.sb-menu');
  document.querySelectorAll('[data-session-menu]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.sessionMenu;
      const menu = document.querySelector(`.sb-menu[data-menu-for="${id}"]`);
      if (!menu) return;
      const wasOpen = menu.classList.contains('is-open');
      allMenus.forEach((m) => m.classList.remove('is-open'));
      if (!wasOpen) menu.classList.add('is-open');
    });
  });
  document.addEventListener('click', () => {
    allMenus.forEach((m) => m.classList.remove('is-open'));
  });
  document.querySelectorAll('.sb-menu button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('danger')) {
        const menu = btn.closest('.sb-menu');
        const id = menu.dataset.menuFor;
        const item = document.querySelector(`.sb-item[data-session="${id}"]`);
        if (item) item.style.transition = 'opacity 200ms', setTimeout(() => item.remove(), 200);
        updateCount();
      }
      menu.classList.remove('is-open');
    });
  });

  // ============== 分组展开/折叠 ==============
  document.querySelectorAll('.sb-group-header').forEach((btn) => {
    const group = btn.closest('.sb-group');
    group.dataset.open = 'true';
    btn.addEventListener('click', () => {
      const open = group.dataset.open === 'true';
      group.dataset.open = open ? 'false' : 'true';
    });
  });

  function updateCount() {
    const total = document.querySelectorAll('.sb-item').length;
    const countEl = document.getElementById('sessionCount');
    if (countEl) countEl.textContent = total;
    const grp = document.querySelector('.sb-group-count');
    if (grp) grp.textContent = total;
  }

  // ============== 新对话按钮 ==============
  const newChatBtn = document.getElementById('newChatBtn');
  newChatBtn.addEventListener('click', () => {
    sessionItems.forEach((n) => n.classList.remove('is-active'));
    views.forEach((v) => {
      v.hidden = v.dataset.viewPanel !== 'chat';
    });
    navItems.forEach((n) => {
      const active = n.dataset.view === 'chat';
      n.classList.toggle('is-active', active);
      n.setAttribute('aria-selected', String(active));
    });
    const ta = document.getElementById('composerText');
    if (ta) ta.value = '';
    ta?.focus();
  });

  // ============== Prompt 卡片点击 → 模拟发消息 ==============
  const composerText = document.getElementById('composerText');
  document.querySelectorAll('.prompt-card').forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt || '';
      if (composerText) composerText.value = prompt;
      composerText?.focus();
      // 微动画
      card.style.transform = 'scale(0.97)';
      setTimeout(() => (card.style.transform = ''), 100);
    });
  });

  // ============== Composer 发送按钮 ==============
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.addEventListener('click', () => sendMessage());
  composerText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const text = composerText.value.trim();
    if (!text) return;
    // 切到带消息视图
    views.forEach((v) => {
      v.hidden = v.dataset.viewPanel !== 'chat-with-msgs';
    });
    // 追加 user 消息
    const feed = document.getElementById('chatFeed');
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.innerHTML = `
      <div class="chat-msg-bubble">${escapeHtml(text)}</div>
      <span class="chat-msg-avatar">你</span>
    `;
    feed.appendChild(userMsg);
    composerText.value = '';
    // 模拟 AI 回复中（空 bubble）
    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-msg assistant';
    aiMsg.innerHTML = `
      <span class="chat-msg-avatar ai">AI</span>
      <div class="chat-msg-body"><p style="opacity:0.5">▍生成中…</p></div>
    `;
    feed.appendChild(aiMsg);
    feed.scrollTop = feed.scrollHeight;
    // 模拟打字
    setTimeout(() => {
      aiMsg.querySelector('.chat-msg-body').innerHTML =
        '<p>这是一个本地模型的回复演示。在实际应用中，llama-server 会流式返回内容并实时填充到此处。</p>';
      feed.scrollTop = feed.scrollHeight;
    }, 700);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ============== 设置子导航 ==============
  const settingsNavItems = document.querySelectorAll('.settings-nav-item');
  settingsNavItems.forEach((n) => {
    n.addEventListener('click', () => {
      settingsNavItems.forEach((x) => x.classList.remove('is-active'));
      n.classList.add('is-active');
    });
  });

  // ============== 状态切换 ==============
  const statusBtn = document.getElementById('statusBtn');
  const statusDot = statusBtn?.querySelector('.sb-status-dot');
  const statusName = statusBtn?.querySelector('.sb-status-name');
  const states = [
    { state: 'running', name: '运行中' },
    { state: 'starting', name: '启动中' },
    { state: 'stopped', name: '未运行' },
  ];
  let statusIdx = 0;
  statusBtn?.addEventListener('click', () => {
    statusIdx = (statusIdx + 1) % states.length;
    const s = states[statusIdx];
    if (statusDot) statusDot.dataset.state = s.state;
    if (statusName) statusName.textContent = s.name;
  });

  // ============== 自动 resize textarea ==============
  composerText.addEventListener('input', () => {
    composerText.style.height = 'auto';
    composerText.style.height = Math.min(composerText.scrollHeight, 160) + 'px';
  });

  // ============== 滚动揭示 ==============
  const reveals = document.querySelectorAll('.feature, .specs-row, .empty-state, .feature h2');
  reveals.forEach((el) => el.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // ============== 平滑滚动锚点 ==============
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
