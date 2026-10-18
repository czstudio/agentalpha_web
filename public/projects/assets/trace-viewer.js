/* trace-viewer.js · 研报工厂 T0 轨迹回放器
   纯前端、零框架依赖：fetch JSON 后逐步展开 thought / tool call / observation / 最终研报。
   渐进增强：容器内预置静态列表（无 JS 或 fetch 失败时原样展示），JS 挂载成功后才隐藏静态列表。
   控制：上一步 / 下一步、自动播放与暂停、range 滑杆拖动、左右方向键。 */
(function () {
  'use strict';
  if (!document.documentElement.classList.contains('js')) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function kindLabel(kind) {
    return { start: '入口', dispatch: '调度', worker: '工具观察', synthesis: '合成', done: '完成' }[kind] || kind;
  }

  function mount(container, data) {
    var steps = data.steps || [];
    if (!steps.length) return false;
    var cur = 0;
    var timer = null;

    container.textContent = '';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', '研报工厂运行轨迹回放器');

    /* 头部：标题与提示 */
    var head = el('div', 'tv-head');
    var title = el('div', 'tv-title', data.meta && data.meta.title ? data.meta.title : '运行轨迹回放');
    var sub = el('div', 'tv-sub');
    sub.textContent = '数据日期 ' + (data.meta && data.meta.data_as_of || '未知')
      + ' · ' + (data.meta && data.meta.engine || '') + ' · 点击步骤或拖动滑杆逐步回放';
    head.appendChild(title); head.appendChild(sub);
    container.appendChild(head);

    /* 步骤导轨 */
    var rail = el('div', 'tv-rail');
    rail.setAttribute('role', 'tablist');
    var railBtns = [];
    steps.forEach(function (s, idx) {
      var b = el('button', 'tv-step', s.stage);
      b.type = 'button';
      b.setAttribute('aria-label', '第 ' + s.i + ' 步 ' + s.stage + '（' + kindLabel(s.kind) + '）');
      b.addEventListener('click', function () { go(idx); });
      rail.appendChild(b);
      railBtns.push(b);
    });
    container.appendChild(rail);

    /* 当前面板：thought / tool / observation */
    var panel = el('div', 'tv-panel');
    var meta = el('div', 'tv-meta');
    var thought = el('div', 'tv-thought');
    var tool = el('div', 'tv-tool');
    var obs = el('div', 'tv-obs');
    panel.appendChild(meta); panel.appendChild(thought); panel.appendChild(tool); panel.appendChild(obs);
    container.appendChild(panel);

    /* 控制条：上一步 / 播放暂停 / 下一步 / 滑杆 */
    var ctrl = el('div', 'tv-ctrl');
    var prev = el('button', 'tv-btn', '上一步');
    var play = el('button', 'tv-btn tv-play', '播放');
    var next = el('button', 'tv-btn', '下一步');
    prev.type = next.type = play.type = 'button';
    var slider = el('input', 'tv-range');
    slider.type = 'range';
    slider.min = '1'; slider.max = String(steps.length); slider.step = '1'; slider.value = '1';
    slider.setAttribute('aria-label', '轨迹步骤滑杆');
    var pos = el('span', 'tv-pos', '1 / ' + steps.length);
    ctrl.appendChild(prev); ctrl.appendChild(play); ctrl.appendChild(next);
    ctrl.appendChild(slider); ctrl.appendChild(pos);
    container.appendChild(ctrl);

    /* 非法转移拦截记录 */
    var bad = data.illegal_edges || [];
    if (bad.length) {
      var box = el('div', 'tv-illegal');
      box.appendChild(el('div', 'tv-illegal-h', '非法转移拦截测试（全部抛 ValueError）'));
      bad.forEach(function (e) {
        var row = el('div', 'tv-illegal-row');
        row.appendChild(el('span', 'tv-illegal-edge', e.edge));
        row.appendChild(el('span', 'tv-illegal-res', e.raised ? '已拦截 · ' + e.error : '未拦截'));
        box.appendChild(row);
      });
      container.appendChild(box);
    }

    function render() {
      var s = steps[cur];
      meta.textContent = '第 ' + s.i + ' 步 · ' + s.stage + ' · ' + s.role + ' · ' + kindLabel(s.kind);
      thought.textContent = s.thought || '';
      thought.style.display = s.thought ? '' : 'none';
      if (s.tool) {
        tool.textContent = 'tool call：' + s.tool;
        tool.style.display = '';
      } else { tool.style.display = 'none'; }
      obs.textContent = s.observation || '';
      obs.style.display = s.observation ? '' : 'none';
      railBtns.forEach(function (b, i) {
        b.classList.toggle('on', i === cur);
        b.classList.toggle('seen', i < cur);
      });
      slider.value = String(cur + 1);
      pos.textContent = (cur + 1) + ' / ' + steps.length;
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      play.textContent = '播放';
      play.setAttribute('aria-pressed', 'false');
    }

    function go(i) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      render();
      if (cur === steps.length - 1) stop();
    }

    prev.addEventListener('click', function () { stop(); go(cur - 1); });
    next.addEventListener('click', function () { stop(); go(cur + 1); });
    play.addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (cur === steps.length - 1) cur = -1;
      play.textContent = '暂停';
      play.setAttribute('aria-pressed', 'true');
      timer = setInterval(function () {
        if (cur >= steps.length - 1) { stop(); return; }
        go(cur + 1);
      }, 2200);
    });
    slider.addEventListener('input', function () { stop(); go(parseInt(slider.value, 10) - 1); });
    container.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { stop(); go(cur - 1); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { stop(); go(cur + 1); ev.preventDefault(); }
    });

    render();
    return true;
  }

  function init() {
    var nodes = document.querySelectorAll('.tv[data-src]');
    Array.prototype.forEach.call(nodes, function (node) {
      var fallback = node.querySelector('.tv-fallback');
      fetch(node.getAttribute('data-src'))
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (mount(node, data) && fallback) fallback.style.display = 'none';
        })
        .catch(function () { /* 加载失败：保留静态列表 */ });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
