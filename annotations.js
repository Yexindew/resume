// === 文档标注系统 v2 — 微信读书风格 ===
(function () {
  var API = 'https://aiteamwork.adp.test.sankuai.com/goaltree/api/ai/annotations';
  var DOC = location.href.split('?')[0].split('#')[0];
  var SW = { 'SWIMLANE': 'yanli06-pwhym' };
  var HEADERS = { 'Content-Type': 'application/json', 'SWIMLANE': 'yanli06-pwhym' };
  var annotations = [];
  var pending = null;
  var selectedTag = '疑问';

  var TAG_COLORS = { '重点': 'rgba(74,222,128,.3)', '疑问': 'rgba(251,191,36,.3)', '待验证': 'rgba(251,146,60,.3)', '已解决': 'rgba(156,163,175,.15)' };
  var TAG_BORDERS = { '重点': '#16a34a', '疑问': '#d97706', '待验证': '#ea580c', '已解决': '#9ca3af' };

  // ─────────────────────────────────────────────
  // CSS 注入
  // ─────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '.ann-hl{cursor:pointer;border-radius:2px;padding:0 1px;transition:opacity .15s}',
    '.ann-hl:hover{opacity:.75}',
    '#annToolbar{position:fixed;display:none;z-index:99995;background:#1c1c1e;border-radius:10px;padding:5px 4px;box-shadow:0 4px 16px rgba(0,0,0,.35);display:none}',
    '#annToolbar button{background:none;border:none;color:#fff;padding:6px 12px;cursor:pointer;font-size:12px;border-radius:7px;white-space:nowrap}',
    '#annToolbar button:hover{background:rgba(255,255,255,.12)}',
    '#annToolbar .sep{width:1px;background:rgba(255,255,255,.2);margin:4px 2px;align-self:stretch}',
    '#annBubble{position:fixed;z-index:99994;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.15);padding:14px;width:268px;display:none;font-size:13px;max-height:min(72vh,520px);overflow-y:auto}',
    '#annForm{position:fixed;z-index:99993;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.18);padding:14px;width:280px;display:none}',
    '#annForm textarea{width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px;font-size:13px;resize:none;font-family:inherit;box-sizing:border-box;outline:none}',
    '#annForm textarea:focus{border-color:#0D7A5F}',
    '.ann-tag-btn{font-size:11px;padding:3px 9px;border-radius:10px;border:1px solid #e5e7eb;cursor:pointer;background:#fff;color:#374151;transition:all .15s}',
    '.ann-tag-btn.active{background:#0D7A5F;color:#fff;border-color:#0D7A5F}',
    '#annToggle{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:99989;background:#0D7A5F;color:#fff;border:none;border-radius:8px 0 0 8px;padding:10px 5px;cursor:pointer;font-size:11px;writing-mode:vertical-rl;letter-spacing:1px;transition:background .2s}',
    '#annToggle:hover{background:#065f46}',
    '#annPanel{position:fixed;top:0;right:-380px;width:360px;height:100vh;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,.12);z-index:99991;transition:right .3s ease;display:flex;flex-direction:column}',
    '.ann-card{padding:6px 10px;margin-bottom:5px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;transition:border-color .2s}',
    '.ann-card:hover{border-color:#0D7A5F}',
    '@media(max-width:600px){#annPanel{width:100vw;right:-100vw}#annForm{width:calc(100vw - 32px);left:16px!important}}'
  ].join('\n');
  document.head.appendChild(style);

  // ─────────────────────────────────────────────
  // 作者管理 — localStorage
  // ─────────────────────────────────────────────
  function getAuthor() { return localStorage.getItem('ann_author'); }

  function ensureAuthor(cb) {
    var a = getAuthor();
    if (a) { cb(a); return; }
    showAuthorModal(cb);
  }

  function showAuthorModal(cb) {
    var overlay = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center');
    var card = el('div', 'background:#fff;border-radius:18px;padding:26px 28px;width:300px;box-shadow:0 10px 40px rgba(0,0,0,.2)');
    card.innerHTML =
      '<div style="font-size:16px;font-weight:600;margin-bottom:6px">你是谁？</div>' +
      '<div style="font-size:13px;color:#6b7280;margin-bottom:16px">输入名字，评论自动署名，下次不再问</div>' +
      '<input id="_annNameInput" type="text" placeholder="输入名字（如 yanli）" style="width:100%;border:1.5px solid #e5e7eb;border-radius:9px;padding:9px 12px;font-size:14px;outline:none;box-sizing:border-box">' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">' +
      '<button id="_annSkip" style="padding:8px 16px;border-radius:9px;border:1px solid #e5e7eb;background:#fff;font-size:13px;cursor:pointer;color:#6b7280">跳过</button>' +
      '<button id="_annOk" style="padding:8px 18px;border-radius:9px;border:none;background:#0D7A5F;color:#fff;font-size:13px;cursor:pointer;font-weight:500">确认</button>' +
      '</div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    var input = card.querySelector('#_annNameInput');
    input.focus();
    input.addEventListener('focus', function () { this.style.borderColor = '#0D7A5F'; });
    input.addEventListener('blur', function () { this.style.borderColor = '#e5e7eb'; });

    function confirm() {
      var name = input.value.trim() || 'anonymous';
      localStorage.setItem('ann_author', name);
      document.body.removeChild(overlay);
      cb(name);
    }
    card.querySelector('#_annOk').onclick = confirm;
    card.querySelector('#_annSkip').onclick = function () { document.body.removeChild(overlay); cb('anonymous'); };
    input.onkeydown = function (e) { if (e.key === 'Enter') confirm(); };
  }

  // ─────────────────────────────────────────────
  // 选中工具栏
  // ─────────────────────────────────────────────
  var toolbar = el('div', '');
  toolbar.id = 'annToolbar';
  toolbar.innerHTML =
    '<button data-act="comment">💬 评论</button>' +
    '<div class="sep"></div>' +
    '<button data-act="highlight">🔖 划线</button>';
  toolbar.style.display = 'none';
  document.body.appendChild(toolbar);

  toolbar.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    hideToolbar();
    if (btn.dataset.act === 'comment') openForm();
    else quickHighlight();
  });

  function showToolbar(rect) {
    toolbar.style.display = 'flex';
    var tw = toolbar.offsetWidth || 170;
    var left = clamp(rect.left + rect.width / 2 - tw / 2, 8, window.innerWidth - tw - 8);
    var top = rect.top - 44;
    if (top < 8) top = rect.bottom + 8;
    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
  }

  function hideToolbar() { toolbar.style.display = 'none'; }

  // ─────────────────────────────────────────────
  // 评论表单
  // ─────────────────────────────────────────────
  var form = el('div', '');
  form.id = 'annForm';
  form.innerHTML =
    '<div id="_annQuote" style="font-size:11px;color:#6b7280;margin-bottom:8px;border-left:3px solid #e5e7eb;padding-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>' +
    '<textarea id="_annText" rows="3" placeholder="写下你的想法..."></textarea>' +
    '<div style="display:flex;gap:6px;margin:8px 0">' +
    ['重点', '疑问', '待验证'].map(function (t) {
      return '<button class="ann-tag-btn' + (t === '疑问' ? ' active' : '') + '" data-tag="' + t + '">' +
        (t === '重点' ? '🟢' : t === '疑问' ? '🟡' : '🟠') + ' ' + t + '</button>';
    }).join('') +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px">' +
    '<button id="_annCancel" style="padding:6px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:12px;cursor:pointer">取消</button>' +
    '<button id="_annSubmit" style="padding:6px 14px;border-radius:8px;border:none;background:#0D7A5F;color:#fff;font-size:13px;cursor:pointer;font-weight:500">提交</button>' +
    '</div>';
  document.body.appendChild(form);

  form.addEventListener('click', function (e) {
    var btn = e.target.closest('.ann-tag-btn');
    if (!btn) return;
    form.querySelectorAll('.ann-tag-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    selectedTag = btn.dataset.tag;
  });
  form.querySelector('#_annCancel').onclick = closeForm;
  form.querySelector('#_annSubmit').onclick = submitForm;

  function openForm() {
    if (!pending) return;
    form.querySelector('#_annQuote').textContent = '「' + pending.text.substring(0, 55) + (pending.text.length > 55 ? '...' : '') + '」';
    form.querySelector('#_annText').value = '';
    form.style.display = 'block';
    var rect = pending.rect;
    var left = clamp(rect.left, 8, window.innerWidth - 296);
    var top = rect.bottom + 10;
    if (top + 220 > window.innerHeight) top = rect.top - 230;
    form.style.left = left + 'px';
    form.style.top = clamp(top, 8, window.innerHeight - 230) + 'px';
    form.querySelector('#_annText').focus();
  }

  function closeForm() { form.style.display = 'none'; pending = null; }

  function submitForm() {
    var content = form.querySelector('#_annText').value.trim();
    if (!content || !pending) return;
    var snap = pending;
    ensureAuthor(function (author) {
      var body = { docUrl: DOC, anchorText: snap.text, anchorStart: 0, anchorEnd: snap.text.length, anchorPath: '', content: content, author: author, tags: selectedTag, parentId: null };
      var btn = form.querySelector('#_annSubmit');
      btn.disabled = true;
      fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (d) { btn.disabled = false; closeForm(); if (d.code === 0) loadAnnotations(); else alert('提交失败'); })
        .catch(function () { btn.disabled = false; alert('网络错误'); });
    });
  }

  function quickHighlight() {
    if (!pending) return;
    var snap = pending;
    pending = null;
    ensureAuthor(function (author) {
      var body = { docUrl: DOC, anchorText: snap.text, anchorStart: 0, anchorEnd: snap.text.length, anchorPath: '', content: '划线', author: author, tags: '重点', parentId: null };
      fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.code === 0) loadAnnotations(); });
    });
  }

  // ─────────────────────────────────────────────
  // 气泡 Popover（点击高亮文字）
  // ─────────────────────────────────────────────
  var bubble = el('div', '');
  bubble.id = 'annBubble';
  document.body.appendChild(bubble);

  function showBubble(ann, rect) {
    var replies = (ann.replies || []).map(function (r) {
      return '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #f3f4f6;font-size:12px;color:#374151">' +
        esc(r.content) + ' <span style="color:#9ca3af;font-size:10px">— ' + esc(r.author) + '</span></div>';
    }).join('');

    bubble.innerHTML =
      '<div style="font-size:11px;color:#6b7280;background:#f9fafb;padding:4px 8px;border-radius:6px;margin-bottom:8px;border-left:3px solid ' + (TAG_BORDERS[ann.tags] || '#d1d5db') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">「' + esc((ann.anchor_text || '').substring(0, 50)) + '」</div>' +
      '<div style="font-size:13px;color:#1a1a1a;margin-bottom:8px;line-height:1.5">' + esc(ann.content) + '</div>' +
      '<div style="font-size:11px;color:#9ca3af;display:flex;justify-content:space-between;align-items:center">' +
      '<span>' + esc(ann.author) + (ann.tags ? ' · <span style="background:#f3f4f6;padding:1px 6px;border-radius:6px">' + ann.tags + '</span>' : '') + '</span>' +
      '<span style="display:flex;gap:10px;align-items:center">' +
      '<button id="_annReplyBtn" style="background:none;border:none;color:#0D7A5F;font-size:11px;cursor:pointer;padding:0">↩ 回复</button>' +
      (ann.author === getAuthor() ? '<button id="_annDeleteBtn" style="background:none;border:none;color:#d1d5db;font-size:11px;cursor:pointer;padding:0" title="删除">🗑</button>' : '') +
      '</span>' +
      '</div>' + replies +
      '<div id="_annReplyBox" style="display:none;margin-top:10px">' +
      '<textarea id="_annReplyText" placeholder="回复..." style="width:100%;height:44px;border:1.5px solid #e5e7eb;border-radius:8px;padding:7px;font-size:12px;resize:none;box-sizing:border-box;outline:none"></textarea>' +
      '<button id="_annReplySend" style="margin-top:5px;padding:4px 12px;border-radius:7px;border:none;background:#0D7A5F;color:#fff;font-size:11px;cursor:pointer">发送</button>' +
      '</div>';

    bubble.style.display = 'block';
    var bh = bubble.offsetHeight;
    var left = clamp(rect.left, 8, window.innerWidth - 284);
    var top = rect.bottom + 10;
    if (top + bh > window.innerHeight - 8) top = rect.top - bh - 10;
    bubble.style.left = left + 'px';
    bubble.style.top = clamp(top, 8, window.innerHeight - bh - 8) + 'px';

    bubble.querySelector('#_annReplyBtn').onclick = function () {
      var box = bubble.querySelector('#_annReplyBox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
      if (box.style.display === 'block') {
        var ta = box.querySelector('#_annReplyText');
        ta.style.borderColor = '#e5e7eb';
        ta.addEventListener('focus', function () { this.style.borderColor = '#0D7A5F'; });
        ta.addEventListener('blur', function () { this.style.borderColor = '#e5e7eb'; });
        ta.focus();
      }
    };

    var delBtn = bubble.querySelector('#_annDeleteBtn');
    if (delBtn) delBtn.onclick = function () {
      if (!confirm('删除这条批注？')) return;
      fetch(API + '/' + ann.id, { method: 'DELETE', headers: SW })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d.code === 0) { hideBubble(); loadAnnotations(); } });
    };

    bubble.querySelector('#_annReplySend').onclick = function () {
      var content = bubble.querySelector('#_annReplyText').value.trim();
      if (!content) return;
      ensureAuthor(function (author) {
        var body = { docUrl: DOC, anchorText: '', anchorStart: 0, anchorEnd: 0, anchorPath: '', content: content, author: author, tags: '', parentId: ann.id };
        fetch(API, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.code === 0) { hideBubble(); loadAnnotations(); } });
      });
    };
  }

  function hideBubble() { bubble.style.display = 'none'; }

  // ─────────────────────────────────────────────
  // 侧栏面板
  // ─────────────────────────────────────────────
  var toggle = el('button', '');
  toggle.id = 'annToggle';
  toggle.textContent = '📝批注';
  document.body.appendChild(toggle);

  var panel = el('div', '');
  panel.id = 'annPanel';
  panel.innerHTML =
    '<div style="padding:14px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">' +
    '<h3 style="margin:0;font-size:15px;font-weight:600">📝 批注 (<span id="_annCount">0</span>)</h3>' +
    '<button id="_annClose" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;line-height:1">✕</button>' +
    '</div>' +
    '<div id="_annList" style="flex:1;overflow-y:auto;padding:14px"></div>';
  document.body.appendChild(panel);

  toggle.onclick = function () {
    panel.style.right = panel.style.right === '0px' ? '-380px' : '0px';
  };
  panel.querySelector('#_annClose').onclick = function () { panel.style.right = '-380px'; };

  // ─────────────────────────────────────────────
  // 划词检测
  // ─────────────────────────────────────────────
  document.addEventListener('mouseup', function (e) {
    if (e.target.closest('#annToolbar,#annForm,#annToggle,#annPanel,#annBubble,#sidebar,.sidebar')) return;
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var text = sel.toString().trim();
      if (text.length < 2 || text.length > 500) { hideToolbar(); return; }
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      pending = { text: text, rect: rect };
      showToolbar(rect);
    }, 50);
  });

  document.addEventListener('mousedown', function (e) {
    if (!e.target.closest('#annToolbar,#annForm,#annBubble')) {
      hideToolbar();
      hideBubble();
    }
  });

  // ─────────────────────────────────────────────
  // 加载 & 渲染
  // ─────────────────────────────────────────────
  function loadAnnotations() {
    fetch(API + '?doc_url=' + encodeURIComponent(DOC), { headers: SW })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.code === 0) { annotations = d.data || []; renderHighlights(); renderPanel(); }
      })
      .catch(function () {});
  }

  function renderHighlights() {
    document.querySelectorAll('.ann-hl').forEach(function (el) {
      el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
    });
    annotations.forEach(function (a) {
      if (!a.anchor_text) return;
      try { highlightOne(a); } catch (e) {}
    });
  }

  function highlightOne(a) {
    var color = TAG_COLORS[a.tags] || 'rgba(251,191,36,.25)';
    var border = TAG_BORDERS[a.tags] || '#d97706';
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.parentElement.closest('#annToolbar,#annForm,#annToggle,#annPanel,#annBubble,#sidebar,.sidebar')
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var idx = node.textContent.indexOf(a.anchor_text);
      if (idx >= 0) {
        var range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + a.anchor_text.length);
        var mark = document.createElement('mark');
        mark.className = 'ann-hl';
        mark.dataset.id = a.id;
        mark.style.cssText = 'background:' + color + ';border-bottom:2px solid ' + border + ';padding:0 1px';
        mark.title = a.author + ': ' + a.content;
        mark.addEventListener('click', function (e) {
          e.stopPropagation();
          var ann = annotations.find(function (x) { return x.id === parseInt(this.dataset.id); }, this);
          if (ann) showBubble(ann, this.getBoundingClientRect());
        });
        range.surroundContents(mark);
        return;
      }
    }
  }

  function renderPanel() {
    var list = panel.querySelector('#_annList');
    var count = panel.querySelector('#_annCount');
    count.textContent = annotations.length;
    toggle.textContent = '📝批注' + (annotations.length > 0 ? '(' + annotations.length + ')' : '');

    if (annotations.length === 0) {
      list.innerHTML = '<p style="color:#9ca3af;text-align:center;margin-top:40px">暂无批注<br><small>选中文字即可添加</small></p>';
      return;
    }
    list.innerHTML = annotations.map(function (a, idx) {
      var border = TAG_BORDERS[a.tags] || '#e5e7eb';
      var repliesHtml = (a.replies || []).map(function (r) {
        return '<div style="margin-top:5px;padding:5px 8px;background:#f9fafb;border-radius:6px;border-left:2px solid #d1d5db">' +
          '<div style="font-size:11px;color:#374151;line-height:1.5">' + esc(r.content) + '</div>' +
          '<div style="font-size:10px;color:#9ca3af;margin-top:2px">' + esc(r.author) + '</div>' +
          '</div>';
      }).join('');
      return '<div class="ann-card" data-sid="' + a.id + '" style="border-left:3px solid ' + border + '">' +
        '<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:3px">' +
          '<span style="font-size:10px;font-weight:600;color:#fff;background:#9ca3af;border-radius:4px;padding:1px 5px;flex-shrink:0">#' + (idx + 1) + '</span>' +
          (a.anchor_text ? '<div style="font-size:11px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">「' + esc(a.anchor_text.substring(0, 50)) + '」</div>' : '') +
        '</div>' +
        '<div style="font-size:12px;color:#1a1a1a;margin-bottom:3px;line-height:1.55">' + esc(a.content) + '</div>' +
        '<div style="font-size:10px;color:#9ca3af">' + esc(a.author) + (a.tags ? ' · <span style="background:#f3f4f6;padding:1px 5px;border-radius:5px">' + esc(a.tags) + '</span>' : '') + '</div>' +
        repliesHtml +
        '</div>';
    }).join('');

    list.querySelectorAll('.ann-card').forEach(function (card) {
      card.onclick = function () {
        var id = parseInt(this.dataset.sid);
        var hl = document.querySelector('.ann-hl[data-id="' + id + '"]');
        if (hl) {
          hl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hl.style.outline = '2px solid #0D7A5F';
          setTimeout(function () { hl.style.outline = ''; }, 1500);
        }
      };
    });
  }

  // ─────────────────────────────────────────────
  // 工具函数
  // ─────────────────────────────────────────────
  function el(tag, css) { var e = document.createElement(tag); if (css) e.style.cssText = css; return e; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }
  function esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }

  loadAnnotations();
})();
