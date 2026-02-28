/* dashboard.js — MV3 compliant, all events via addEventListener */
'use strict';

const AI_BACKEND = 'http://127.0.0.1:5050';

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

function srcClass(s) {
  s = (s || '').toLowerCase();
  if (s.includes('ai') || s.includes('hatebert') || s.includes('detoxify')) return 'src-ai';
  if (s.includes('composer')) return 'src-composer';
  return '';
}
function sevClass(s) { return s ? `sev-${s.toLowerCase()}` : ''; }
function scoreColor(n) { return n >= 0.85 ? '#ef4444' : n >= 0.6 ? '#f59e0b' : n >= 0.3 ? '#a78bfa' : '#22c55e'; }

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${name}`);
  });
  if (name === 'charts') setTimeout(drawAllCharts, 60);
  if (name === 'wordlist') setTimeout(initWordListTab, 0);
}

// ── Canvas helpers ────────────────────────────────────────────────────────────
function getCtx(id, h) {
  const c = $(id);
  if (!c) return null;
  const p = c.parentElement;
  c.width  = p.clientWidth  || 400;
  c.height = h || p.clientHeight || 220;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  return ctx;
}

// Bar chart
function drawBarChart(id, labels, values, palette) {
  if (!labels.length) return;
  const c = $(id); if (!c) return;
  const ctx = getCtx(id);
  const W = c.width, H = c.height;
  const PL = 10, PR = 10, PT = 22, PB = 40;
  const max = Math.max(...values, 1);
  const bw  = (W - PL - PR) / labels.length;
  const ch  = H - PT - PB;

  labels.forEach((lbl, i) => {
    const v  = values[i];
    const bh = (v / max) * ch;
    const x  = PL + i * bw + bw * 0.12;
    const y  = PT + ch - bh;
    const w  = bw * 0.76;
    if (bh < 1) return;

    const g = ctx.createLinearGradient(x, y, x, y + bh);
    const col = palette[i % palette.length];
    g.addColorStop(0, col[0]);
    g.addColorStop(1, col[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, w, bh, 3);
    ctx.fill();

    // value label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(v, x + w / 2, y - 5);

    // x-axis label
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui';
    const short = lbl.length > 13 ? lbl.slice(0, 12) + '…' : lbl;
    ctx.fillText(short, x + w / 2, H - 8);
  });
}

// Donut chart
function drawDonut(id, labels, values, colors) {
  const c = $(id); if (!c) return;
  const ctx = getCtx(id);
  const W = c.width, H = c.height;
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) { ctx.fillStyle = '#374151'; ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('No data', W / 2, H / 2); return; }

  const cx = W * 0.36, cy = H / 2;
  const r  = Math.min(cx, cy) * 0.78;
  const ir = r * 0.54;
  let a = -Math.PI / 2;

  values.forEach((v, i) => {
    const s = (v / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a, a + s);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    a += s;
  });

  // hole
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, 2 * Math.PI);
  ctx.fillStyle = '#12121f';
  ctx.fill();

  // center total
  ctx.fillStyle = '#e0e0f0';
  ctx.font = 'bold 18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.fillStyle = '#6b7280';
  ctx.font = '10px system-ui';
  ctx.fillText('total', cx, cy + 18);

  // legend
  const lx = W * 0.62;
  let ly = cy - (labels.length * 22) / 2 + 6;
  ctx.textAlign = 'left';
  labels.forEach((lbl, i) => {
    ctx.fillStyle = colors[i];
    ctx.fillRect(lx, ly - 9, 10, 10);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px system-ui';
    ctx.fillText(`${lbl}  ${values[i]}`, lx + 14, ly);
    ly += 22;
  });
}

// Line chart
function drawLineChart(id, labels, values, color) {
  if (values.length < 2) return;
  const c = $(id); if (!c) return;
  const ctx = getCtx(id, 260);
  const W = c.width, H = c.height;
  const PL = 36, PR = 14, PT = 16, PB = 28;
  const max = Math.max(...values, 1);
  const cW = W - PL - PR, cH = H - PT - PB;
  const xs = labels.map((_, i) => PL + i * (cW / (labels.length - 1)));
  const ys = values.map(v => PT + cH - (v / max) * cH);

  // grid
  for (let i = 0; i <= 4; i++) {
    const y = PT + i * (cH / 4);
    ctx.strokeStyle = '#1e1e36';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PL, y);
    ctx.lineTo(PL + cW, y);
    ctx.stroke();
    ctx.fillStyle = '#4b5563';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(max * (1 - i / 4)), PL - 4, y + 3);
  }

  // fill
  const g = ctx.createLinearGradient(0, PT, 0, PT + cH);
  g.addColorStop(0, color + '44');
  g.addColorStop(1, color + '05');
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  xs.forEach((x, i) => ctx.lineTo(x, ys[i]));
  ctx.lineTo(xs[xs.length - 1], PT + cH);
  ctx.lineTo(xs[0], PT + cH);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  xs.forEach((x, i) => ctx.lineTo(x, ys[i]));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // dots + x-labels
  xs.forEach((x, i) => {
    ctx.beginPath();
    ctx.arc(x, ys[i], 3, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x, H - 6);
  });
}

// Histogram
function drawHistogram(id, buckets, color) {
  const c = $(id); if (!c) return;
  const ctx = getCtx(id, 220);
  const W = c.width, H = c.height;
  const PL = 10, PR = 10, PT = 16, PB = 32;
  const max = Math.max(...buckets, 1);
  const bw  = (W - PL - PR) / buckets.length;
  const ch  = H - PT - PB;
  const xlabels = ['0-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90','90-100'];

  buckets.forEach((v, i) => {
    const bh = (v / max) * ch;
    const x  = PL + i * bw + 1;
    const y  = PT + ch - bh;
    const w  = bw - 2;
    if (bh < 1) return;
    const g = ctx.createLinearGradient(x, y, x, y + bh);
    g.addColorStop(0, color);
    g.addColorStop(1, color + '66');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, w, bh, 2);
    ctx.fill();
    if (v > 0) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(v, x + w / 2, y - 4);
    }
    ctx.fillStyle = '#4b5563';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(xlabels[i], x + w / 2, H - 8);
  });
  ctx.fillStyle = '#6b7280';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Detoxify Toxicity %', W / 2, H - 1);
}

// Heatmap
function drawHeatmap(hourCounts) {
  const grid = $('heatmapGrid');
  const lbls = $('heatmapLabels');
  if (!grid) return;
  const max = Math.max(...hourCounts, 1);
  grid.innerHTML = '';
  lbls.innerHTML = '';

  hourCounts.forEach((v, h) => {
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    const alpha = Math.round((v / max) * 220).toString(16).padStart(2, '0');
    cell.style.background = v === 0 ? '#1a1a2e' : `#a78bfa${alpha}`;
    const tip = document.createElement('div');
    tip.className = 'hm-tooltip';
    tip.textContent = `${h}:00 — ${v} detection${v !== 1 ? 's' : ''}`;
    cell.appendChild(tip);
    grid.appendChild(cell);

    const lbl = document.createElement('div');
    lbl.className = 'hm-label';
    lbl.textContent = h % 6 === 0 ? `${h}h` : '';
    lbls.appendChild(lbl);
  });
}

// ── Draw all charts ───────────────────────────────────────────────────────────
function drawAllCharts() {
  const d = window._chartData || {};
  const PAL = [
    ['#6366f1','#312e81'], ['#a78bfa','#6d28d9'], ['#ec4899','#9d174d'],
    ['#2dd4bf','#115e59'], ['#f59e0b','#92400e'], ['#22c55e','#14532d']
  ];

  // Domain bar
  const doms = Object.entries(d.domainCounts || {}).sort((a,b) => b[1]-a[1]).slice(0, 6);
  drawBarChart('domainChart', doms.map(([k]) => k), doms.map(([,v]) => v), PAL);

  // Severity donut
  drawDonut('severityChart', ['High','Medium','Low'], [d.highS||0, d.medS||0, d.lowS||0], ['#ef4444','#f59e0b','#22c55e']);

  // Source donut
  const sc = d.sourceCounts || {};
  const sKeys = Object.keys(sc).filter(k => sc[k] > 0);
  drawDonut('sourceChart', sKeys, sKeys.map(k => sc[k]), ['#a78bfa','#ec4899','#2dd4bf','#f59e0b']);

  // Hate score histogram
  const buckets = new Array(10).fill(0);
  (d.hateScores || []).forEach(s => { const b = Math.min(Math.floor(s * 10), 9); buckets[b]++; });
  drawHistogram('hateScoreChart', buckets, '#a78bfa');

  // Top words bar
  const words = Object.entries(d.wordCounts || {}).sort((a,b) => b[1]-a[1]).slice(0, 10);
  drawBarChart('wordBarChart', words.map(([k]) => k), words.map(([,v]) => v), PAL);

  // 7-day line chart
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d2 = new Date(now);
    d2.setDate(d2.getDate() - i);
    days.push(d2.toLocaleDateString('en-US', {month:'short', day:'numeric'}));
  }
  const dc = d.dayCounts || {};
  drawLineChart('timelineChart', days.map(d => d.split(' ')[1]), days.map(d => dc[d] || 0), '#6366f1');

  // Heatmap
  drawHeatmap(d.hourCounts || new Array(24).fill(0));
}

// ── Main data load ────────────────────────────────────────────────────────────
function loadDashboard() {
  chrome.storage.local.get(['toxicLog'], result => {
    const log = result.toxicLog || [];

    let aiDet = 0, compW = 0;
    let highS = 0, medS = 0, lowS = 0, todayC = 0;
    const wordCounts = {}, domainCounts = {};
    const sourceCounts = {'word-list': 0, 'AI (Detoxify)': 0, 'Composer Guard': 0};
    const hateScores = [], hourCounts = new Array(24).fill(0), dayCounts = {};
    const today = new Date().setHours(0, 0, 0, 0);

    log.forEach(e => {
      const src = (e.source || '').toLowerCase();
      const sev = (e.severity || '').toLowerCase();
      const dom = e.domain || 'unknown';
      const ts  = e.timestamp || Date.now();

      if (src === 'word-list') {
        sourceCounts['word-list']++;
        if (e.word) {
          const normWord = (e.word || '').trim().toLowerCase();
          wordCounts[normWord] = (wordCounts[normWord] || 0) + 1;
        }
      } else if (src.includes('ai') || src.includes('hatebert') || src.includes('detoxify')) {
        aiDet++;
        sourceCounts['AI (Detoxify)']++;
      } else if (src.includes('composer')) {
        compW++;
        sourceCounts['Composer Guard']++;
      }

      if (sev === 'high') highS++;
      else if (sev === 'medium') medS++;
      else if (sev === 'low') lowS++;
      if (dom !== 'unknown') domainCounts[dom] = (domainCounts[dom] || 0) + 1;
      if (new Date(ts).setHours(0, 0, 0, 0) === today) todayC++;
      // Collect toxicity score from any AI entry — hateScore field OR detoxifyScores.toxicity
      const tox = typeof e.hateScore === 'number' ? e.hateScore
                : typeof e.detoxifyScores?.toxicity === 'number' ? e.detoxifyScores.toxicity
                : null;
      if (tox !== null) hateScores.push(tox);

      const h   = new Date(ts).getHours();
      hourCounts[h]++;
      const day = new Date(ts).toLocaleDateString('en-US', {month:'short', day:'numeric'});
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const uniqueW = Object.keys(wordCounts).length;
    const topDom  = Object.entries(domainCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
    const avgHate = hateScores.length
      ? Math.round((hateScores.reduce((a,b) => a+b, 0) / hateScores.length) * 100) + '%'
      : '—';

    // Update stat cards
    $('totalDetections').textContent = log.length;
    $('uniqueWords').textContent     = uniqueW;
    $('topDomain').textContent       = topDom.length > 20 ? topDom.slice(0, 20) + '…' : topDom;
    $('todayCount').textContent      = todayC;
    $('aiDetections').textContent    = aiDet;
    $('composerWarns').textContent   = compW;
    $('highSev').textContent         = highS;
    $('medSev').textContent          = medS;
    $('lowSev').textContent          = lowS;
    $('avgHate').textContent         = avgHate;

    const identAttacks = log.filter(e => (e.detoxifyScores?.identity_attack || 0) > 0.30).length;

    // Widgets
    renderWordCloud(wordCounts, log);
    renderSourceBars(sourceCounts);
    renderAIInsights(log, aiDet, identAttacks, avgHate, hateScores);
    renderTimeline(log);

    // Store for charts tab
    window._chartData = { wordCounts, domainCounts, sourceCounts, hateScores, hourCounts, dayCounts, highS, medS, lowS };
    if ($('tab-charts').classList.contains('active')) drawAllCharts();
  });
}

// ── Word cloud ────────────────────────────────────────────────────────────────
function renderWordCloud(wordCounts, log) {
  const el = $('wordCloud');
  const sorted = Object.entries(wordCounts).sort((a,b) => b[1]-a[1]).slice(0, 24);
  if (!sorted.length) { el.innerHTML = '<div class="empty">No word-list hits yet.</div>'; return; }
  const wordSev = {};
  log.forEach(e => { if (e.word && e.severity) wordSev[e.word] = e.severity; });
  el.innerHTML = sorted.map(([w, c]) =>
    `<span class="word-pill sev-${wordSev[w]||'low'}">${esc(w)}<span class="wcount">${c}</span></span>`
  ).join('');
}

// ── Source bars ───────────────────────────────────────────────────────────────
function renderSourceBars(counts) {
  const el  = $('sourceBars');
  const max = Math.max(...Object.values(counts), 1);
  const styles = {'word-list':'fill-purple','AI (Detoxify)':'fill-pink','Composer Guard':'fill-amber'};
  el.innerHTML = Object.entries(counts).map(([label, val]) => {
    const pct = Math.round((val / max) * 100);
    const barPct = Math.max(pct, 2);
    // Show count inside bar if wide enough (>15%), outside otherwise
    const countInside = pct > 15;
    return `<div class="source-row">
      <div class="source-label">${esc(label)}</div>
      <div class="source-bar-wrap">
        <div class="source-bar-bg">
          <div class="source-bar-fill ${styles[label]}" style="width:${barPct}%">${countInside ? val : ''}</div>
        </div>${!countInside ? `<span class="source-val-outside">${val}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── AI Insights ───────────────────────────────────────────────────────────────
function renderAIInsights(log, aiCount, sarcCount, avgHate, hateScores) {
  const el = $('aiInsights');
  if (!log.length) { el.innerHTML = '<div class="empty">No AI data yet.</div>'; return; }
  const maxScore  = hateScores.length ? Math.round(Math.max(...hateScores) * 100) : 0;
  const aiRatio   = log.length ? Math.round((aiCount / log.length) * 100) : 0;
  const aiDomains = {};
  log.forEach(e => {
    if ((e.source||'').toLowerCase().includes('ai')) {
      const d = e.domain || 'unknown';
      aiDomains[d] = (aiDomains[d] || 0) + 1;
    }
  });
  const topAiDom = Object.entries(aiDomains).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  const sc = n => { const v = parseInt(n); return !v ? '' : v >= 70 ? 'red' : v >= 40 ? 'amber' : 'green'; };

  el.innerHTML = `
    <div class="insight-row"><div class="insight-icon">🧹</div><div class="insight-body"><div class="insight-title">Detoxify Detections</div><div class="insight-sub">${aiRatio}% of all detections caught by AI (implicit hate, no word-list match needed)</div></div><div class="insight-score">${aiCount}</div></div>
    <div class="insight-row"><div class="insight-icon">📈</div><div class="insight-body"><div class="insight-title">Average Toxicity Score</div><div class="insight-sub">Mean Detoxify toxicity confidence across all AI-scored entries</div></div><div class="insight-score ${sc(avgHate)}\">${avgHate}</div></div>
    <div class="insight-row"><div class="insight-icon">🎭</div><div class="insight-body"><div class="insight-title">Identity Attacks Detected</div><div class="insight-sub">Entries where Detoxify identity_attack score exceeded 30%</div></div><div class="insight-score ${sarcCount>0?'amber':'green'}">${sarcCount}</div></div>
    <div class="insight-row"><div class="insight-icon">🌐</div><div class="insight-body"><div class="insight-title">Top AI-flagged Domain</div><div class="insight-sub">Most Detoxify hits — implicit hate with no word-list match</div></div><div class="insight-score" style="font-size:11px;max-width:130px;word-break:break-all">${esc(topAiDom)}</div></div>
    <div class="insight-row"><div class="insight-icon">🔴</div><div class="insight-body"><div class="insight-title">Peak Toxicity Score</div><div class="insight-sub">Highest single-text Detoxify confidence seen</div></div><div class="insight-score ${sc(maxScore+'%')}">${maxScore ? maxScore+'%' : '—'}</div></div>
  `;
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function renderTimeline(log) {
  const el  = $('timeline');
  const cnt = $('timelineCount');
  if (cnt) cnt.textContent = `${log.length} entries`;
  if (!log.length) { el.innerHTML = '<div class="empty">No detections logged yet.</div>'; return; }

  const SCORE_COLORS = {
    toxicity:        '#ef4444',
    severe_toxicity: '#f97316',
    obscene:         '#fb923c',
    threat:          '#fca5a5',
    insult:          '#f59e0b',
    identity_attack: '#c084fc',
  };
  const SCORE_SHORT = {
    toxicity:        'toxic',
    severe_toxicity: 'severe',
    obscene:         'obscene',
    threat:          'threat',
    insult:          'insult',
    identity_attack: 'identity',
  };

  el.innerHTML = [...log].reverse().slice(0, 80).map(e => {
    const src  = e.source || 'word-list';
    const sev  = e.severity || 'low';
    const dom  = e.domain || 'unknown';
    const time = e.timestamp ? new Date(e.timestamp).toLocaleString() : '';
    const text = e.text || e.transcript || '';
    const word = e.word || '';
    const snippet = text
      ? `<div class="t-text">"${esc(text.slice(0,140))}${text.length>140?'…':''}"</div>`
      : word ? `<div class="t-text">Matched: <strong style="color:#a78bfa">${esc(word)}</strong></div>` : '';

    // Build 6-category score tags
    const scores = e.detoxifyScores || {};
    const hasScores = Object.keys(scores).length > 0;
    const scoreTags = hasScores
      ? Object.entries(SCORE_SHORT)
          .filter(([key]) => scores[key] != null)
          .map(([key, label]) => {
            const pct = Math.round((scores[key] || 0) * 100);
            const col = SCORE_COLORS[key] || '#9ca3af';
            const dim = pct < 10;
            return `<span class="t-tag" style="background:${col}18;border-color:${col}44;color:${dim?'#6b7280':col};opacity:${dim?0.5:1}">${label}: ${pct}%</span>`;
          }).join('')
      : e.hateScore
        ? `<span class="t-tag src-ai">toxicity: ${Math.round(e.hateScore*100)}%</span>`
        : '';

    return `<div class="t-item ${sevClass(sev)}">
      <div class="t-top"><span class="t-domain">${esc(dom)}</span><span class="t-time">${time}</span></div>
      ${snippet}
      <div class="t-meta">
        <span class="t-tag ${srcClass(src)}">${esc(src)}</span>
        <span class="t-tag ${sevClass(sev)}">${sev}</span>
        ${scoreTags}
      </div>
    </div>`;
  }).join('');
}

// ── Header buttons ────────────────────────────────────────────────────────────
function refreshDashboard() {
  const btn = $('btnRefresh');
  btn.disabled = true;
  btn.textContent = 'Refreshing…';
  setTimeout(() => {
    loadDashboard();
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;flex-shrink:0"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> REFRESH`;
  }, 200);
}

function exportJSON() {
  chrome.storage.local.get(['toxicLog'], r => {
    const log  = r.toxicLog || [];
    const blob = new Blob([JSON.stringify(log, null, 2)], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `toxic-log-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
}

function exportCSV() {
  chrome.storage.local.get(['toxicLog'], r => {
    const log = r.toxicLog || [];
    const headers = ['timestamp','date','domain','words','severity','fullText','source','hateScore'];
    const escape  = v => {
      const s = String(v == null ? '' : v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    };
    const rows = log.map(e => [
      escape(e.timestamp || ''),
      escape(e.date      || ''),
      escape(e.domain    || ''),
      escape(Array.isArray(e.words) ? e.words.join('; ') : (e.word || '')),
      escape(e.severity  || ''),
      escape(e.fullText  || ''),
      escape(e.source    || ''),
      escape(e.hateScore != null ? e.hateScore : '')
    ].join(','));
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `toxic-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  });
}

function clearData() {
  if (confirm('Clear all collected data? This cannot be undone.')) {
    chrome.storage.local.set({toxicLog: []}, () => loadDashboard());
  }
}

// ── Playground ────────────────────────────────────────────────────────────────
const EXAMPLES = [
  {label:'direct hate',     cls:'hate',     text:'Go back to your own country, we don\'t want your kind here'},
  {label:'slur + threat',   cls:'hate',     text:'Those people are ruining everything, they should all be removed'},
  {label:'sarcasm + hate',  cls:'sarcasm',  text:'Oh great, another one of THOSE people moving into the neighbourhood. Really enriching the area.'},
  {label:'sarcasm + hate',  cls:'sarcasm',  text:'Wow what a surprise, they commit a crime and everyone acts shocked. So unexpected.'},
  {label:'implicit hate',   cls:'implicit', text:'I\'m just saying certain groups statistically have lower intelligence, it\'s just facts'},
  {label:'dog whistle',     cls:'implicit', text:'When will they stop replacing us? Our culture and traditions are disappearing.'},
  {label:'violent threat',  cls:'hate',     text:'If I ever see you again I will make you regret it, you piece of trash'},
  {label:'benign profanity',cls:'clean',    text:'Oh shit, I totally forgot to send that email. What a day.'},
  {label:'clean sarcasm',   cls:'clean',    text:'Oh sure, because THAT plan is definitely going to work. Absolute genius.'},
  {label:'clean text',      cls:'clean',    text:'The weather today is really nice, I went for a long walk in the park'},
];

function buildExamples() {
  const grid = $('examplesGrid');
  if (!grid) return;
  grid.innerHTML = EXAMPLES.map((ex, i) => `
    <button class="example-chip" data-idx="${i}">
      <div class="ec-label ${ex.cls}">${ex.label}</div>
      <div class="ec-text">${esc(ex.text.slice(0, 72))}…</div>
    </button>
  `).join('');

  grid.querySelectorAll('.example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const inp = $('testInput');
      if (inp) { inp.value = EXAMPLES[parseInt(chip.dataset.idx)].text; inp.focus(); }
    });
  });
}

async function runTest() {
  const inp  = $('testInput');
  const out  = $('testResult');
  const btn  = $('testBtn');
  const text = (inp?.value || '').trim();
  if (!text) { out.innerHTML = '<div class="empty">Please enter some text first.</div>'; return; }

  btn.disabled = true;
  out.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:#6b7280;font-size:13px"><div class="spinner"></div> Running Detoxify…</div>';

  const useZS = $('useZeroShot')?.checked;

  try {
    const res = await fetch(`${AI_BACKEND}/analyze/text`, {
      method:  'POST',
      headers: {'Content-Type': 'application/json'},
      body:    JSON.stringify({text, zero_shot: useZS}),
      signal:  AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    renderTestResult(await res.json());
  } catch (e) {
    const offline = e.message.includes('fetch') || e.message.includes('Failed') || e.message.includes('NetworkError') || e.name === 'TimeoutError';
    out.innerHTML = `<div style="color:#f87171;font-size:13px;padding:10px">
      ${offline
        ? '⚠️ Backend offline — start the server: <code>python server.py</code>'
        : `❌ Error: ${esc(e.message)}`}
    </div>`;
  }
  btn.disabled = false;
}

function renderTestResult(data) {
  const out    = $('testResult');
  const sev    = data.combined_severity || 'none';
  const dt     = data.detoxify || {};
  const scores = dt.scores || {};
  const tox    = Math.round((scores.toxicity || 0) * 100);
  const emoji  = {high:'🔴',medium:'🟡',low:'🟢',none:'✅'}[sev] || '—';
  const sevLbl = {high:'HIGH SEVERITY',medium:'MEDIUM SEVERITY',low:'LOW SEVERITY',none:'CLEAN / SAFE'}[sev];

  const SCORE_COLORS = {
    toxicity:        '#ef4444',
    severe_toxicity: '#f97316',
    obscene:         '#fb923c',
    threat:          '#fca5a5',
    insult:          '#f59e0b',
    identity_attack: '#c084fc',
  };

  const SCORE_LABELS = {
    toxicity:        'Toxicity',
    severe_toxicity: 'Severe Toxicity',
    obscene:         'Obscene',
    threat:          'Threat',
    insult:          'Insult',
    identity_attack: 'Identity Attack',
  };

  let html = `
    <div class="verdict-badge ${sev}">${emoji} ${sevLbl}</div>
  `;

  // Render all 6 Detoxify score bars
  Object.entries(scores).forEach(([key, val]) => {
    const pct   = Math.round(val * 100);
    const color = SCORE_COLORS[key] || '#a78bfa';
    const label = SCORE_LABELS[key] || key;
    html += `
      <div class="score-bar-wrap">
        <div class="score-bar-label"><span>${label}</span><span style="color:${color}">${pct}%</span></div>
        <div class="score-bar-bg"><div class="score-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
    `;
  });

  html += `
    <div class="result-metric"><span class="rm-label">Is toxic</span><span class="rm-val">${dt.is_toxic ? '<span style="color:#f87171">Yes</span>' : '<span style="color:#86efac">No</span>'}</span></div>
    <div class="result-metric"><span class="rm-label">Will blur on page</span><span class="rm-val">${data.should_blur ? '<span style="color:#f87171">Yes</span>' : '<span style="color:#86efac">No</span>'}</span></div>
  `;

  out.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Tab clicks
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Header buttons
  $('btnRefresh').addEventListener('click', refreshDashboard);
  $('btnExportJSON').addEventListener('click', exportJSON);
  $('btnExportCSV').addEventListener('click',  exportCSV);
  $('btnClear').addEventListener('click', clearData);

  // Playground run button
  $('testBtn').addEventListener('click', runTest);

  // Build example chips
  buildExamples();

  // Initial load
  loadDashboard();

  // Auto-refresh every 30s
  setInterval(loadDashboard, 30000);

  // Redraw charts on resize
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if ($('tab-charts').classList.contains('active')) drawAllCharts();
    }, 200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── WORD LIST TAB ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ── Multilingual Word List ────────────────────────────────────────────────────
const WL = {
  "Arabic":{h:["سكس", "طيز", "شرج", "لعق", "لحس", "مص", "تمص", "مفلقسة", "كس", "عاهرة", "جماع", "زب", "لواط", "اغتصاب", "نيك", "متناك", "متناكة", "شرموطة", "عرص", "خول", "قحبة", "لبوة"],m:["بيضان", "بز", "بزاز", "بظر", "فرج", "شاذ", "مبادل", "قضيب", "لوطي", "سحاق", "سحاقية", "خنثي"],l:["ثدي", "حلمة", "شهوة", "احتلام"]},
  "Chinese":{h:["乳交", "交配", "你个傻比", "你是鸡", "你是鸭", "傻比", "傻逼", "军妓", "几八", "几叭", "几巴", "几芭", "卖B", "卖比", "卖淫", "口交", "叫床", "塞你公", "塞你娘", "塞你母", "塞你爸", "塞你老师", "塞你老母", "大鸡巴", "奸", "奸你", "妓", "妓女", "妓院", "嫖娼", "射精", "小骚比", "小鸡巴", "屄", "屌", "干x娘", "干七八", "干你", "干你妈", "干你娘", "干你老母", "干你良", "干妳妈", "干妳娘", "干妳老母", "干妳马", "干您娘", "干机掰", "干死你", "幹", "强奸", "强奸你", "性交", "懆您妈", "懆您娘", "我操你祖宗十八代", "打炮", "抽插", "招妓", "插你", "插死你", "操你", "操你全家", "操你奶奶", "操你妈", "操你娘", "操你祖宗", "操你老妈", "操你老母", "操妳", "操妳全家", "操妳妈", "操妳娘", "操妳祖宗", "操机掰", "操比", "操逼", "日他娘", "日你", "日你妈", "日你老娘", "日你老母", "日批", "机八", "机巴", "灨你娘", "老骚比", "肛交", "轮奸", "骚比", "骚逼", "鸡八", "鸡叭", "鸡吧", "鸡奸", "鸡巴", "鸡芭", "𨳒", "陰莖", "㞗", "𨳊", "鳩", "𡳞", "𨶙", "撚", "𨳍", "閪", "咸家鏟", "冚家鏟", "咸家伶", "冚家拎"],m:["三级片", "下三烂", "下贱", "个老子的", "乳波臀浪", "他妈", "他妈ㄉ王八蛋", "他妈地", "他妈的", "他马的", "你他马的", "你她马的", "你妈", "你妈的", "你娘卡好", "你娘咧", "你它妈的", "你它马的", "你马的", "做爱", "册那", "刚瘪三", "卵", "卵子", "口肯", "吃屎", "后庭", "吹箫", "大卵子", "大卵泡", "奶子", "她妈的", "她马的", "妈B", "妈个B", "妈个比", "妈个老比", "妈比", "妈的B", "妈逼", "妳她妈的", "妳妈的", "妳娘的", "妳老母的", "妳马的", "姘头", "姣西", "姦", "娘个比", "婊子", "婊子养的", "嫖客", "它妈地", "它妈的", "密洞", "射你", "小乳头", "小卵子", "小卵泡", "小瘪三", "小肉粒", "小骚货", "小鸡鸡", "屁眼", "屁股", "巨乳", "干死CS", "干死GM", "干死客服", "性", "性器", "性无能", "性爱", "情色", "想上你", "懒8", "懒八", "懒叫", "懒教", "成人", "扒光", "打飞机", "撒尿", "放荡", "机机歪歪", "杂种", "浪叫", "淫", "淫乱", "淫妇", "淫棍", "淫水", "淫秽", "淫荡", "淫西", "湿透的内裤", "激情", "烂货", "烂逼", "爛", "狗屁", "狗日", "狗狼养的", "玉杵", "王八蛋", "瓜娃子", "瓜婆娘", "瓜批", "瘪三", "白烂", "精子", "老味", "老母", "老瘪三", "老骚货", "肉壁", "肉棍子", "肉棒", "肉缝", "肏", "肥西", "色情", "花柳", "荡妇", "賤", "贝肉", "贱B", "贱人", "贱货", "贼你妈", "赛你老母", "赛妳阿母", "赣您娘", "迷药", "逼", "逼样", "野鸡", "阳具", "阳萎", "阴唇", "阴户", "阴核", "阴毛", "阴茎", "阴道", "阴部", "雞巴", "驶你公", "驶你娘", "驶你母", "驶你爸", "驶你老师", "驶你老母", "骚货", "鸡8", "鸡鸡", "龟儿子", "龟头", "尻", "柒", "屎忽"],l:["九游", "乳", "乳头", "乳房", "仆街", "他奶奶", "他奶奶的", "他奶娘的", "他娘", "你全家", "你奶奶的", "你娘", "刚度", "包皮", "十三点", "双峰微颤", "处女", "外阴", "奶", "奶奶的熊", "她妈地", "妈妈的", "妈的", "娘的", "月经", "白痴", "白癡", "祖宗", "私服", "笨蛋", "老二", "靠北", "靠母", "靠爸", "靠背", "靠腰", "鬼公", "仆街", "笨實", "粉腸", "躝癱", "你老闆", "你老味", "你老母", "硬膠"]},
  "Czech":{h:["čurák", "do piče", "chuj", "jebat", "kokot", "kokotina", "koňomrd", "kunda", "kurva", "mamrd", "mrdat", "mrdka", "mrdník", "oslošoust", "piča", "píčus", "píchat", "pizda", "prcat", "šoustat", "šulin", "vypíčenec", "zkurvit", "zkurvysyn", "zmrd"],m:["buzna", "do prdele", "flundra", "hajzl", "hovno", "chcanky", "prdel", "prdelka", "sračka", "srát"],l:["bordel", "čumět", "debil", "dršťka", "držka", "žrát"]},
  "Danish":{h:["bøsserøv", "cock", "fisse", "hestepik", "luder", "pik", "pikslugeri", "piksutteri"],m:["anus", "fissehår", "fuck", "kussekryller", "pikhår", "røv", "røvhul", "røvskæg", "røvspræke"],l:["lort", "pis", "shit"]},
  "Dutch":{h:["afrukken", "aftrekken", "afzuigen", "beffen", "boerelul", "bokkelul", "hoer", "hoerenloper", "klaarkomen", "kontneuken", "kut", "lul", "naaien", "neuken", "ouwehoer", "ouwehoeren", "paardelul", "pijpen", "pik", "portiekslet", "rothoer", "rukken", "slet", "slik mijn zaad", "snol", "spuiten", "stoephoer", "trottoirteef", "verneuken", "vingeren"],m:["achter het raam zitten", "afberen", "aflebberen", "afrossen", "afwerkplaats", "afzeiken", "een halve man en een paardekop", "bagger schijten", "bedonderen", "befborstel", "bekken", "belazeren", "besodemieterd zijn", "besodemieteren", "beurt", "boemelen", "boerenpummel", "botergeil", "broekhoesten", "buffelen", "buiten de pot piesen", "da's kloten van de bok", "de ballen", "de hoer spelen", "de hond uitlaten", "de koffer induiken", "del", "de pijp uitgaan", "draaikont", "driehoog achter wonen", "drol", "drooggeiler", "droogkloot", "een beurt geven", "een nummertje maken", "een wip maken", "eikel", "flamoes", "flikken", "flikker", "galbak", "gat", "gedoogzone", "geilneef", "gesodemieter", "graftak", "gras maaien", "gratenkut", "greppeldel", "griet", "hoempert", "hoerenbuurt", "hoerig", "hol", "hufter", "huisdealer", "johny", "kanen", "kettingzeug", "klerebeer", "klojo", "klooien", "klootjesvolk", "klootoog", "klootzak", "kloten", "knor", "kont", "krentekakker", "kuttelikkertje", "kwakkie", "liefdesgrot", "lul-de-behanger", "lulhannes", "matennaaier", "matje", "mof", "neukstier", "nicht", "oetlul", "opgeilen", "opkankeren", "oprotten", "opsodemieteren", "op z'n hondjes", "op z'n sodemieter geven", "opzouten", "ouwe rukker", "paal", "palen", "penoze", "piesen", "pijpbekkieg", "pleurislaaier", "poep", "poepen", "poot", "publiciteitsgeil", "reet", "reetridder", "reet trappen, voor zijn", "remsporen", "reutelen", "rotzak", "rukhond", "schijt", "schijten", "schoft", "schuinsmarcheerder", "shit", "slempen", "sletterig", "standje", "standje-69", "stootje", "stront", "tapijtnek", "teef", "temeier", "teringlijer", "toeter", "tongzoeng", "triootjeg", "trottoir prostituée", "vergallen", "verkloten", "viespeuk", "vleesroos", "wippen", "wuftje", "zaadje", "zakkenwasser", "zeiken", "zeiker", "zuigen"],l:["aardappels afgieten", "asbak", "aso", "balen", "brugpieper", "dombo", "engerd", "gadverdamme", "godverdomme", "lummel", "mafketel", "naakt", "potverdorie", "raaskallen", "schatje", "sufferd", "voor jan lul", "voor jan-met-de-korte-achternaam", "watje", "welzijnsmafia", "wijf", "zuiplap"]},
  "English":{h:["anal", "anilingus", "bareback", "bdsm", "beastiality", "bestiality", "big black", "blowjob", "blow job", "blow your load", "bondage", "brown showers", "bukkake", "circlejerk", "cleveland steamer", "cock", "cocks", "creampie", "cum", "cumming", "cumshot", "cumshots", "cunnilingus", "cunt", "date rape", "daterape", "deep throat", "deepthroat", "dick", "dildo", "domination", "dominatrix", "donkey punch", "double dong", "double penetration", "dp action", "dvda", "ejaculation", "fag", "faggot", "felch", "fellatio", "feltch", "female squirting", "fisting", "fuck", "fucking", "gangbang", "gang bang", "gay sex", "gokkun", "golden shower", "group sex", "handjob", "hard core", "hardcore", "how to kill", "how to murder", "incest", "intercourse", "jack off", "jail bait", "jailbait", "jerk off", "jizz", "lolita", "masturbate", "masturbating", "masturbation", "motherfucker", "nambla", "neonazi", "nigga", "nigger", "orgy", "paedophile", "pedophile", "pegging", "phone sex", "pissing", "porn", "porno", "pornography", "pthc", "pussy", "rape", "raping", "rapist", "rimjob", "rimming", "sadism", "scat", "semen", "sex", "shemale", "shibari", "sodomize", "sodomy", "strap on", "strapon", "strip club", "swastika", "threesome", "tribadism", "two girls one cup", "urethra play", "urophilia", "vagina", "vibrator", "voyeur", "wank", "white power", "whore", "xx", "xxx", "yaoi", "zoophilia"],m:["acrotomophilia", "alabama hot pocket", "alaskan pipeline", "anus", "arsehole", "assmunch", "auto erotic", "autoerotic", "babeland", "baby batter", "baby juice", "ball gag", "ball gravy", "ball kicking", "ball licking", "ball sack", "ball sucking", "bangbros", "bangbus", "barely legal", "barenaked", "bastardo", "bastinado", "bbw", "beaver cleaver", "beaver lips", "big breasts", "big knockers", "big tits", "bimbos", "birdlock", "black cock", "blonde action", "blonde on blonde action", "blue waffle", "blumpkin", "boner", "booty call", "brunette action", "bulldyke", "bullet vibe", "bung hole", "bunghole", "busty", "buttcheeks", "camel toe", "camgirl", "camslut", "camwhore", "carpet muncher", "carpetmuncher", "chocolate rosebuds", "cialis", "clit", "clitoris", "clover clamps", "clusterfuck", "coprolagnia", "coprophilia", "cornhole", "dendrophilia", "dingleberry", "dingleberries", "dirty pillows", "dirty sanchez", "doggie style", "doggiestyle", "doggy style", "doggystyle", "dog style", "dolcett", "dommes", "dry hump", "eat my ass", "ecchi", "erotism", "eunuch", "fecal", "femdom", "figging", "fingerbang", "fingering", "foot fetish", "footjob", "frotting", "fuckin", "fucktards", "fudge packer", "fudgepacker", "futanari", "genitals", "giant cock", "girl on", "girl on top", "girls gone wild", "goatcx", "goatse", "goodpoop", "goo girl", "goregasm", "grope", "g-spot", "guro", "hand job", "hentai", "homoerotic", "hooker", "hot carl", "hot chick", "huge fat", "humping", "jelly donut", "juggs", "kinbaku", "kinkster", "kinky", "knobbing", "leather restraint", "leather straight jacket", "lemon party", "livesex", "lovemaking", "make me come", "male squirting", "menage a trois", "milf", "missionary position", "mound of venus", "mr hands", "muff diver", "muffdiving", "nawashi", "negro", "nimphomania", "nipple", "nipples", "nsfw images", "nutten", "nympho", "nymphomania", "octopussy", "omorashi", "one cup two girls", "one guy one jar", "orgasm", "pedobear", "penis", "piece of shit", "piss pig", "pisspig", "pleasure chest", "pole smoker", "ponyplay", "poof", "poon", "poontang", "punany", "poop chute", "poopchute", "prince albert piercing", "pubes", "queaf", "queef", "quim", "raging boner", "rectum", "reverse cowgirl", "rosy palm", "rosy palm and her 5 sisters", "rusty trombone", "santorum", "schlong", "scissoring", "sexcam", "sexo", "shaved beaver", "shaved pussy", "shitblimp", "shota", "shrimping", "skeet", "s&m", "snatch", "snowballing", "splooge", "splooge moose", "spooge", "spread legs", "spunk", "strappado", "style doggy", "suicide girls", "sultry women", "swinger", "tainted love", "taste my", "tea bagging", "throating", "thumbzilla", "tied up", "tight white", "tongue in a", "towelhead", "tub girl", "tubgirl", "tushy", "twink", "twinkie", "undressing", "upskirt", "venus mound", "viagra", "violet wand", "vorarephilia", "voyeurweb", "voyuer", "vulva", "worldsex", "wrapping men", "wrinkled starfish", "yellow showers", "yiffy", "🖕"],l:["apeshit", "ass", "asshole", "bastard", "beaner", "beaners", "bitch", "bitches", "bollocks", "boob", "boobs", "bullshit", "butt", "butthole", "coon", "coons", "darkie", "erotic", "escort", "fuck buttons", "god damn", "honkey", "horny", "jigaboo", "jiggaboo", "jiggerboo", "kike", "mong", "nig nog", "nsfw", "nude", "nudity", "paki", "panties", "panty", "pikey", "playboy", "raghead", "sexy", "sexual", "sexually", "sexuality", "shit", "shitty", "slanteye", "slut", "smut", "spastic", "spic", "suck", "sucks", "tit", "tits", "titties", "titty", "topless", "tosser", "tranny", "twat", "wetback", "wet dream"]},
  "Filipino":{h:["puta ka", "putang ina", "tang ina", "tangina", "burat", "kantot", "anak ka ng puta", "jakol"],m:["bayag", "nognog"],l:["bobo", "tanga", "ulol", "ulol"]},
  "Finnish":{h:["bylsiä", "haista vittu", "hevonvittu", "hevonvitunperse", "huorata", "kulli", "kullinluikaus", "kuppainen", "kuseksia", "kyrpiintynyt", "kyrpiintyä", "kyrpiä", "kyrpä", "kyrpänaama", "kyrvitys", "mulkero", "mulkku", "mulkvisti", "muna", "naida", "nainti", "nussia", "nussija", "nussinta", "panna", "pantava", "pillu", "pillut", "runkata", "runkkari", "runkkaus", "runkku", "tussu", "tussukka", "tussut", "vittu", "vittuilla", "vittumainen", "vittuuntua", "vittuuntunut", "vitun", "vitusti", "vituttaa", "vitutus"],m:["haista paska", "hevonpaska", "hevonperse", "kuin esterin perseestä", "kusaista", "kusettaa", "kusi", "kusipää", "kusta", "lutka", "molo", "molopää", "munapää", "munaton", "mutakuono", "mutiainen", "narttu", "neekeri", "nekru", "nuolla persettä", "paljaalla", "palli", "pallit", "paneskella", "panettaa", "pano", "paska", "paskainen", "paskamainen", "paskanmarjat", "paskantaa", "paskapuhe", "paskapää", "paskattaa", "paskiainen", "paskoa", "pehko", "persaukinen", "perse", "perseennuolija", "perseet olalla", "persereikä", "perseääliö", "persläpi", "perspano", "persvako", "pilkunnussija", "pistää", "pyllyvako", "reikä", "reva", "ripsipiirakka", "tuhkaluukku", "tumputtaa", "turpasauna", "vakipano", "vetää käteen", "vittuilu"],l:["alfred nussi", "haahka", "hatullinen", "helvetisti", "hevonkuusi", "hitosti", "hitto", "hässiä", "juosten kustu", "jutku", "jutsku", "jätkä", "kananpaska", "koiranpaska", "lahtari", "pentele", "perkele", "perkeleesti", "pipari", "piru", "ryssä", "rättipää", "saatanasti", "suklaaosasto", "tavara", "toosa", "viiksi", "äpärä"]},
  "French":{h:["baiser", "bite", "bitte", "brackmard", "branlage", "branler", "branlette", "chatte", "clito", "clitoris", "couilles", "cramouille", "enculé", "enculée", "enculeur", "enculeurs", "fille de pute", "fils de pute", "foutre", "gouine", "la putain de ta mère", "nique ta mère", "nique ta race", "putain", "pute", "ramoner", "sac à foutre", "salope", "suce", "tringler", "troncher", "trou du cul", "turlute"],m:["bander", "bigornette", "branleur", "branleuse", "brouter le cresson", "chier", "chiottes", "con", "connard", "connasse", "conne", "cul", "enfoiré", "enfoirée", "étron", "folle", "grande folle", "jouir", "ménage à trois", "nègre", "negro", "pédale", "pédé", "pouffiasse", "sac à merde", "salaud", "tapette", "teuch", "trique", "zigounette", "zizi"],l:["bloblos", "bordel", "bourré", "bourrée", "caca", "chiasse", "déconne", "déconner", "emmerdant", "emmerder", "emmerdeur", "emmerdeuse", "gerbe", "gerber", "grogniasse", "gueule", "MALPT", "merde", "merdeuse", "merdeux", "meuf", "palucher", "péter", "pipi", "pisser", "pousse-crotte", "tanche"]},
  "German":{h:["arschficker", "arschlecker", "bumsen", "fick", "ficken", "fotze", "hure", "hurensohn", "kampflesbe", "morgenlatte", "möse", "muschi", "onanieren", "orgasmus", "penis", "pimmel", "pimpern", "poppen", "schwanzlutscher", "titten", "vögeln", "wichse", "wichsen", "wichser"],m:["analritter", "arsch", "flittchen", "kimme", "MILF", "möpse", "nippel", "nutte", "pinkeln", "pissen", "pisser", "porno", "rosette", "scheiße", "scheisser", "schiesser", "schnackeln", "tittchen"],l:["arschloch", "bimbo", "bratze", "bonze", "dödel", "fratze", "hackfresse", "ische", "kackbratze", "kacke", "kacken", "kackwurst", "kanake", "lümmel", "mufti", "nackt", "neger", "nigger", "popel", "reudig", "schabracke", "schlampe", "schwuchtel", "vollpfosten"]},
  "Hindi":{h:["balatkar", "balatkari", "behen chod", "beti chod", "bhosad", "bhosadi ke", "chod", "chodu", "choot", "chootia", "chootiya", "chudaap", "chudai khanaa", "chudam chudai", "chude", "chut", "chutia", "chutiya", "gaand", "gandu", "gashti", "gasti", "loda", "lodu", "lund", "lund choos", "maa ki chut", "madar chod", "madarchod", "madhavchod", "mooh mein le", "randi", "teri maa ka bhosada", "teri maa ki behenchod", "teri maa ki chut", "tu chuda"],m:["aand", "aandu", "chakke", "chinaal", "chodu bhagat", "chooche", "choochi", "choope", "choot ke baal", "chuche", "chuchi", "chut ka chuha", "chut ka churan", "chut ka mail", "chut ke baal", "chut ke dhakkan", "chut maarli", "chutad", "chutadd", "chutan", "gaandfat", "gaandmasti", "gaandufad", "gandfattu", "ghassa", "ghasti", "gucchi", "gucchu", "jhant", "jhant chaatu", "jhant ka keeda", "jhant ke baal", "jhant ke pissu", "jhantu", "kutta kamina", "kutte ki aulad", "kutte ki jat", "lund ka bakkal", "lund khajoor", "lundtopi", "lundure", "maal", "mutth", "mutthal", "najayaz aulaad", "najayaz paidaish", "pataka", "patakha", "raand", "randaap", "randi rona", "saali randi", "suar", "suar ke lund", "suar ki aulad", "tatte", "tatti", "teri maa ka boba chusu"],l:["bhadva", "bhadve", "bhandve", "bhangi", "bhootni ke", "boobe", "chinki", "harami", "haramzade", "hawas", "hawas ke pujari", "hijda", "hijra", "kamine", "kaminey", "kanjar", "kutta", "kuttiya", "najayaz", "paki", "saala", "saala kutta", "saali kutti", "tharak", "tharki"]},
  "Hungarian":{h:["balfasz", "balfaszok", "balfaszokat", "balfaszt", "baszik", "bazmeg", "fasz", "faszfej", "faszfejek", "faszfejeket", "faszfejet", "faszok", "faszokat", "faszt", "kibaszott", "kibaszottabb", "kúr", "kurafi", "kurafik", "kurafikat", "kurafit", "kurva", "kurvák", "kurvákat", "kurvát", "legkibaszottabb", "picsa", "picsákat", "picsát", "pina", "pinák", "pinákat", "pinát", "pöcs", "pöcsök", "pöcsöket", "pöcsöt", "punci", "puncik", "segg", "seggek", "seggeket", "segget", "seggfej", "seggfejek", "seggfejeket", "seggfejet", "szajha", "szajhák", "szajhákat", "szajhát"],m:["csöcs", "csöcsök", "csöcsöket", "csöcsöt", "fing", "fingok", "fingokat", "fingot", "szar", "szarabb", "szarik", "szarok", "szarokat", "szart"],l:["barmok", "barmokat", "barmot", "barom", "buksza", "bukszák", "bukszákat", "bukszát", "búr", "búrok", "franc", "francok", "francokat", "francot", "geci", "gecibb", "gecik", "geciket", "gecit", "leggecibb", "legszarabb", "marha", "marhák", "marhákat", "marhát", "megdöglik", "pele", "pelék", "pofa", "pofákat", "pofát"]},
  "Italian":{h:["ammucchiata", "bagascia", "bagassa", "baldracca", "battona", "bocchinara", "bocchino", "bucaiolo", "cazzo", "cazzone", "chiavare", "chiavata", "ciucciami il cazzo", "culattone", "ditalino", "fica", "figa", "figlio di puttana", "fottere", "fottersi", "frocio", "froscio", "leccaculo", "mignotta", "minchia", "porca puttana", "potta", "puppami", "puttana", "recchione", "sborra", "sborrata", "sborrone", "scopare", "scopata", "slinguare", "spagnola", "spompinare", "sverginare", "testa di cazzo", "troia", "trombare", "vaffanculo", "zoccola"],m:["allupato", "anale", "arrapato", "arrusa", "arruso", "assatanato", "bagnarsi", "balle", "battere", "belino", "biga", "bofilo", "brinca", "budiùlo", "busone", "caciocappella", "cagna", "casci", "cazzata", "cazzimma", "checca", "chiappa", "ciospo", "coglione", "coglioni", "cornuto", "cozza", "culattina", "culo", "fava", "femminuccia", "figlio di buona donna", "figone", "finocchio", "fracicone", "fregna", "goldone", "guardone", "incazzarsi", "incoglionirsi", "ingoio", "lecchino", "lofare", "loffa", "loffare", "minchione", "mona", "monta", "montare", "mussa", "nave scuola", "nerchia", "padulo", "palle", "patacca", "patonza", "pecorina", "pesce", "picio", "pincare", "pippa", "pinnolone", "pipì", "pippone", "pisciare", "piscio", "pisello", "pistolotto", "pomiciare", "pompa", "pompino", "porca", "porco", "porco due", "porco zio", "quaglia", "regina", "rincoglionire", "rizzarsi", "sbattere", "sbattersi", "sbrodolata", "scorreggiare", "slinguata", "smandrappata", "soccia", "socmel", "sorca", "sticchio", "succhiami", "succhione", "sveltina", "tarzanello", "tette", "tirare", "topa", "vangare", "zinne", "zio cantante"],l:["boiata", "bordello", "cacca", "cadavere", "cagare", "cagata", "cesso", "imbecille", "mannaggia", "merda", "merdata", "merdoso", "palloso", "pirla", "porca madonna", "porca miseria", "rompiballe", "rompipalle", "ruffiano", "sega", "stronza", "stronzata", "stronzo", "terrone", "vacca"]},
  "Japanese":{h:["アナリングス", "アナル", "イラマチオ", "オーガズム", "オマンコ", "クンニリングス", "ゴールデンシャワー", "ゴックン", "スカトロ", "ストラップオン", "セックス", "ソドミー", "ちんこ", "ディープ・スロート", "ディルド", "デートレイプ", "ドッグスタイル", "ファック", "フィスト", "フェラチオ", "ぶっかけ", "ベアバック", "ペニス", "まんこ", "やりまん", "レイプ", "淫乱", "騎上位", "巨根", "強姦犯", "玉なめ", "玉舐め", "緊縛", "近親相姦", "後背位", "拷問", "殺し方", "殺人事件", "殺人方法", "児童性虐待", "射精", "手コキ", "獣姦", "正常位", "生殖器", "精液", "挿入", "大陰唇", "中出し", "潮吹き女", "潮吹き男性", "直腸", "奴隷", "二穴", "乳首", "売春婦", "糞", "糞尿愛好症", "糞便", "幼児性愛者", "輪姦", "肛門", "膣"],m:["アスホール", "エクスタシー", "エスコート", "エロティズム", "エロティック", "オカマ", "おしりのあな", "おっぱい", "オッパイ", "オナニー", "カーマスートラ", "カント", "クリトリス", "グループ・セックス", "ゲイ・セックス", "ゲイボーイ", "コカイン", "サディズム", "しばり", "スウィンガー", "スカートの中", "ストリップ劇場", "スラット", "スリット", "セクシーな", "セクシーな 10 代", "ディック", "テレフォンセックス", "トップレス", "なめ", "ヌード", "ハードコア", "パイパン", "バイブレーター", "バック・スタイル", "ビッチ", "フェティッシュ", "ふたなり", "フック", "プリンス アルバート ピアス", "ペニスバンド", "ボーイズラブ", "ボールギャグ", "ホモ", "ポルノ", "ポルノグラフィー", "ボンテージ", "マザー・ファッカー", "マスターベーション", "やおい", "ラティーナ", "ラバー", "レズビアン", "ローター", "ロリータ", "陰毛", "革抑制", "巨乳", "合意の性交", "支配", "自己愛性", "女王様", "女装", "新しいポルノ", "人妻", "性交", "足フェチ", "足を広げる", "脱衣", "茶色のシャワー", "剃毛", "貞操帯", "尿道プレイ", "覗き", "縛り", "噴出", "平手打ち", "変態", "勃起する", "夢精", "毛深い", "誘惑", "裸", "裸の女性", "乱交", "両性", "両性具有", "両刀"],l:["g スポット", "s ＆ m", "xx", "アジアのかわいい女の子", "いたずら", "エッチ", "おしっこ", "おしり", "オシリ", "おもらし", "お尻", "グロ", "デブ", "ニガー", "ネオ・ナチ", "パンティー", "ファンタジー", "プレイボーイ", "ぽっちゃり", "ランジェリー", "嫌い", "女の子", "女子高生", "人種", "卍", "宦官"]},
  "Korean":{h:["강간", "개새끼", "개자식", "개좆", "근친", "노모", "뒤질래", "때씹", "보지", "불알", "빠구리", "사까시", "씨발", "씨발놈", "씨팔", "씹", "씹물", "씹빨", "씹새끼", "씹알", "씹창", "씹팔", "암캐", "자지", "좆", "좆만", "죽일년", "창녀", "후장"],m:["개차반", "거유", "계집년", "니기미", "딸딸이", "망가", "몰카", "바바리맨", "섹스", "스와핑", "쌍놈", "야동", "야사", "야애니", "엄창", "에로", "유모", "은꼴", "자위", "종간나", "쥐좆", "직촬", "포르노", "하드코어", "호로", "화냥년", "후레아들"],l:["고자", "또라이", "뙤놈", "로리타", "미친", "미친새끼", "변태", "병신", "애자", "염병", "옘병", "육갑", "잡년", "짱깨", "쪽바리", "희쭈그리"]},
  "Norwegian":{h:["fitte", "kuk", "kukene", "kuker", "morraknuller", "morrapuler", "nigger", "pakkis", "pikk", "ståpikk", "ståpikkene", "ståpikker", "svartheiteste"],m:["asshole", "drittsekk", "faen i helvete", "forjævlig", "fuck", "føkk", "føkka", "føkkings", "jævla", "jævlig", "ræva", "ræven", "sotrør"],l:["dritt", "faen", "fan", "fanken", "forbanna", "forbannet", "fy faen", "helvete", "helvetet", "pokker", "satan", "shit", "sinnsykt", "skitt"]},
  "Persian":{h:["آب کیر", "ارگاسم", "پورن", "پورنو", "تجاوز", "جق", "جقی", "جلق", "جنده", "چوچول", "ساک زدن", "سکس", "سکس کردن", "سوپر", "شق کردن", "فیلم سوپر", "کس", "کس دادن", "کس کردن", "کسکش", "کوس", "کون", "کون دادن", "کون کردن", "کونکش", "کونی", "کیر", "کیری", "لاپایی", "منی", "هرزه"],m:["برهنه", "تخمی", "حشر", "حشری", "دودول", "سکسی", "شهوت", "شهوتی", "شونبول", "لاپا", "لاشی", "لخت"],l:["داف", "لش"]},
  "Polish":{h:["chuj", "chujnia", "cipa", "dmuchać", "do kurwy nędzy", "huj", "huj ci w dupę", "ja pierdolę", "jebać", "jebany", "kurwa", "kurwy", "kutafon", "kutas", "lizać pałę", "obciągać chuja", "obciągać fiuta", "obciągać loda", "pieprzyć", "pierdolec", "pierdolić", "pierdolnąć", "pierdolnięty", "pizda", "pojeb", "pojebany", "popierdolony", "robic loda", "robić loda", "ruchać", "skurwysyn", "wkurwiać", "zajebisty"],m:["cyc", "fiut", "pierdoła"],l:["burdel", "burdelmama", "ciota", "debil", "dupa", "dupek", "duperele", "dziwka", "gówno", "gówno prawda", "jajco", "jajko", "pierdzieć", "rzygać", "sraczka", "srać", "suka", "syf"]},
  "Portuguese":{h:["boceta", "cacete", "caralho", "chochota", "chupar", "coito", "colhoes", "cona", "dar o rabo", "esporra", "filho da puta", "foda", "foda-se", "foder", "gozar", "grelho", "porra", "puta", "puta que pariu", "puta que te pariu", "queca", "transar", "vai-te foder", "vai tomar no cu", "vibrador", "xana", "xochota"],m:["ânus", "bicha", "biscate", "bissexual", "boob", "bosta", "braulio de borracha", "cabrao", "cagar", "camisinha", "clitoris", "cocaína", "comer", "consolo", "corno", "fecal", "heroína", "lésbica", "merda", "passar um cheque", "pau", "peidar", "pênis", "pinto", "torneira", "vadia", "veado"],l:["aborto", "amador", "aranha", "ariano", "balalao", "bastardo", "bumbum", "burro", "cerveja", "dum raio", "frango assado", "heterosexual", "homem gay", "homoerótico", "homosexual", "inferno", "lolita", "paneleiro", "sacanagem", "saco"]},
  "Russian":{h:["chernozhopyi", "dolboy'eb", "ebalnik", "ebalo", "ebalom sch'elkat", "opizdenet", "osto'eblo", "otmudohat", "otpizdit", "otsosi", "pidar gnoinyj", "pizda", "pizdato", "pizdatyi", "piz'det", "pizdetc", "pizdoi nakryt'sja", "pizd'uk", "piz`dyulina", "poluchit pizdy", "pososi moyu konfetku", "prissat", "proebat", "promudobl'adsksya pizdopro'ebina", "propezdoloch", "prosrat", "raspeezdeyi", "raspizdatyi", "raz'yebuy", "trakhat'sya", "trimandoblydskiy pizdoproyob", "v pizdu", "vzdrochennyi", "yeb vas", "za'ebat", "zaebis", "zalupa", "zalupat", "zlo'ebuchy", "блядки", "блядовать", "блядство", "блядь", "во пизду", "встать раком", "выёбываться", "гандон", "дать пизды", "дрочить", "ёбарь", "ебать", "ебать-копать", "ебло", "ебнуть", "ёб твою мать", "жополиз", "измудохать", "малофья", "манда", "мандавошка", "муда", "мудило", "мудозвон", "наебать", "наебениться", "наебнуться", "на хуй", "на хую вертеть", "на хуя", "нахуячиться", "спиздить", "срать", "ссать", "траxать", "хуеплет", "хуило", "хуй", "хуйнуть", "хуй пинать"],m:["mudack", "ostokhuitel'no", "ot'ebis", "podi ku'evo", "poeben", "po'imat' na konchik", "po'iti posrat", "po khuy", "raz'yoba", "s'ebat'sya", "svodit posrat", "svoloch", "vafl'a", "vafli lovit", "vyperdysh", "zasranetc", "zassat", "жопа", "играть на кожаной флейте", "каждый дрочит как он хочет", "как два пальца обоссать", "курите мою трубку", "лысого в кулаке гонять", "опесдол", "половое сношение", "секс", "сиськи", "хуем груши околачивать"],l:["bychara", "byk", "gol", "padlo", "pedik", "perdet", "petuh", "shalava", "styervo", "sukin syn", "ubl'yudok", "uboy", "u'ebitsche", "бздёнок", "бугор", "говно", "говнюк", "голый", "дерьмо", "другой дразнится", "какая разница", "мент", "на фиг", "невебенный", "не ебет", "ни за хуй собачу", "ни хуя", "обнаженный", "обоссаться можно", "один ебётся", "офигеть", "охуеть", "охуительно", "ты мне ваньку не валяй", "фига", "хапать", "хер с ней", "хер с ним", "хохол", "хрен", "хуёво", "хуёвый", "хуиней страдать", "хуиня"]},
  "Spanish":{h:["Chupapollas", "Concha de tu madre", "Coprofagía", "Esperma", "Fiesta de salchichas", "Follador", "Follar", "Hacer una paja", "Haciendo el amor", "Hija de puta", "Hijaputa", "Hijo de puta", "Hijoputa", "Mamada", "Nazi", "Prostituta", "Puta", "Ramera", "Semen", "Sexo", "Sexo oral", "Soplapollas", "Verga", "Vulva"],m:["Bollera", "Cabrón", "Chupada", "Chupetón", "concha", "Coño", "Culo", "Lameculos", "Maciza", "Macizorra", "Marica", "Maricón", "Mariconazo", "Mierda", "Pendejo", "Pervertido", "Pezón", "Pinche", "Tetas grandes", "Tía buena", "Travesti", "Trio"],l:["Asesinato", "asno", "bastardo", "Drogas", "Gilipichis", "Gilipollas", "Heroína", "Idiota", "Imbécil", "infierno", "Jilipollas", "Kapullo", "maldito", "martillo", "Orina", "Pedo", "Pis", "Racista", "Sádico", "Soplagaitas", "vete a la mierda"]},
  "Swedish":{h:["fitta", "fittig", "knulla", "kuk", "kuksås", "nigger", "neger", "pippa", "runka", "rövknulla", "snedfitta", "snefitta", "sätta på"],m:["arsle", "brutta", "discofitta", "kötthuvud", "köttnacke", "moona", "moonade", "moonar", "moonat", "mutta", "olla", "pök", "röv", "rövhål", "skäggbiff", "stake", "subba", "sås"],l:["dra åt helvete", "för helvete", "helvete", "hård", "jävlar", "prutt", "satan", "skita", "skit ner dig", "tusan"]},
  "Thai":{h:["กระดอ", "กระเด้า", "กระหรี่", "ควย", "จิ๋ม", "จู๋", "ดอกทอง", "น้ําแตก", "เย็ด", "รูตูด", "หญิงชาติชั่ว", "หลั่ง", "หํา", "หี", "อมนกเขา"],m:["กะปิ", "เจ๊ก", "เจี๊ยว", "ตูด", "ส้นตีน"],l:["กู", "ขี้", "ตอแหล", "มึง", "แม่ง", "ล้างตู้เย็น", "สัด", "เสือก", "ห่า", "เหี้ย", "ไอ้ควาย"]},
  "Turkish":{h:["amcığa", "amcığı", "amcığın", "amcık", "amcıklar", "amcıklara", "amcıklarda", "amcıklardan", "amcıkları", "amcıkların", "amcıkta", "amcıktan", "amı", "amlar", "götveren", "götverende", "götverenden", "götverene", "götvereni", "götverenin", "götverenler", "götverenlerde", "götverenlerden", "götverenlere", "götverenleri", "götverenlerin", "kaltağa", "kaltağı", "kaltağın", "kaltak", "kaltaklar", "kaltaklara", "kaltaklarda", "kaltaklardan", "kaltakları", "kaltakların", "kaltakta", "kaltaktan", "orospu", "orospuda", "orospudan", "orospular", "orospulara", "orospularda", "orospulardan", "orospuları", "orospuların", "orospunun", "orospuya", "orospuyu", "saksocu", "saksocuda", "saksocudan", "saksocular", "saksoculara", "saksocularda", "saksoculardan", "saksocuları", "saksocuların", "saksocunun", "saksocuya", "saksocuyu", "siker sikmez", "siki", "sikilir sikilmez", "sikin", "sikler", "siklerde", "siklerden", "siklere", "sikleri", "siklerin", "sikmek", "sikmemek", "sikte", "sikten", "siktir", "siktirir siktirmez", "yarağa", "yarağı", "yarağın", "yarak", "yaraklar", "yaraklara", "yaraklarda", "yaraklardan", "yarakları", "yarakların", "yarakta", "yaraktan"],m:["göt", "göte", "götler", "götlerde", "götlerden", "götlere", "götleri", "götlerin", "götte", "götten", "götü", "götün", "taşağa", "taşağı", "taşağın", "taşak", "taşaklar", "taşaklara", "taşaklarda", "taşaklardan", "taşakları", "taşakların", "taşakta", "taşaktan"],l:["çingene", "Çingenede", "Çingeneden", "Çingeneler", "Çingenelerde", "Çingenelerden", "Çingenelere", "Çingeneleri", "Çingenelerin", "Çingenenin", "Çingeneye", "Çingeneyi", "otuz birci", "otuz bircide", "otuz birciden", "otuz birciler", "otuz bircilerde", "otuz bircilerden", "otuz bircilere", "otuz bircileri", "otuz bircilerin", "otuz bircinin", "otuz birciye", "otuz birciyi", "sıçmak", "TOTAL WORDS ACROSS ALL LANGUAGES: 2500+"]},
};
// 2580 words total
const WL_FLAGS = {
  Arabic:'🇸🇦',Chinese:'🇨🇳',Czech:'🇨🇿',Danish:'🇩🇰',Dutch:'🇳🇱',
  English:'🇬🇧',Filipino:'🇵🇭',Finnish:'🇫🇮',French:'🇫🇷',German:'🇩🇪',
  Hindi:'🇮🇳',Hungarian:'🇭🇺',Italian:'🇮🇹',Japanese:'🇯🇵',Korean:'🇰🇷',
  Norwegian:'🇳🇴',Persian:'🇮🇷',Polish:'🇵🇱',Portuguese:'🇵🇹',Russian:'🇷🇺',
  Spanish:'🇪🇸',Swedish:'🇸🇪',Thai:'🇹🇭',Turkish:'🇹🇷'
};

let wlInited = false;
let wlBuilt = false;
let wlAllOpen = false;

function escWL(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderWordList() {
  const acc    = document.getElementById('wlAccordion');
  const nores  = document.getElementById('wlNoResults');
  const badge  = document.getElementById('wlTotalBadge');
  if (!acc) return;

  const q     = (document.getElementById('wlSearch')?.value || '').toLowerCase().trim();
  const onH   = document.getElementById('wlFH')?.classList.contains('on');
  const onM   = document.getElementById('wlFM')?.classList.contains('on');
  const onL   = document.getElementById('wlFL')?.classList.contains('on');
  const noFilt = !onH && !onM && !onL;

  acc.innerHTML = '';
  let anyFound = false;
  let grandTotal = 0;

  for (const [lang, g] of Object.entries(WL)) {
    const dedup = arr => [...new Set((arr||[]).map(w => w.trim()).filter(Boolean))];
    const rawH = dedup(g.h), rawM = dedup(g.m), rawL = dedup(g.l);

    const filt = arr => q ? arr.filter(w => w.toLowerCase().includes(q)) : arr;
    const H = (noFilt || onH) ? filt(rawH) : [];
    const M = (noFilt || onM) ? filt(rawM) : [];
    const L = (noFilt || onL) ? filt(rawL) : [];

    if (!H.length && !M.length && !L.length) continue;
    anyFound = true;
    const tot = H.length + M.length + L.length;
    grandTotal += tot;

    const chips = (arr, cls) => arr.map(w =>
      `<span class="wchip ${cls}${q && w.toLowerCase().includes(q) ? ' hit' : ''}">${escWL(w)}</span>`
    ).join('');

    const badges = [
      H.length ? `<span class="lang-count lc-high">🔴 ${H.length}</span>` : '',
      M.length ? `<span class="lang-count lc-medium">🟡 ${M.length}</span>` : '',
      L.length ? `<span class="lang-count lc-low">🟢 ${L.length}</span>` : '',
    ].join('');

    const sec = document.createElement('div');
    sec.className = 'lang-section' + (q ? ' open' : '');
    sec.innerHTML =
      `<div class="lang-header">
        <div class="lang-header-left">
          <span style="font-size:20px">${WL_FLAGS[lang]||'🌐'}</span>
          <span class="lang-name">${escWL(lang)}</span>
          <div class="lang-counts">${badges}</div>
          <span class="lang-total">${tot} words</span>
        </div>
        <span class="lang-chevron">▼</span>
      </div>
      <div class="lang-body">
        ${H.length ? `<div class="sev-group"><div class="sev-label high">🔴 HIGH <span class="sc">${H.length} words</span></div><div class="word-chips">${chips(H,'high')}</div></div>` : ''}
        ${M.length ? `<div class="sev-group"><div class="sev-label medium">🟡 MEDIUM <span class="sc">${M.length} words</span></div><div class="word-chips">${chips(M,'medium')}</div></div>` : ''}
        ${L.length ? `<div class="sev-group"><div class="sev-label low">🟢 LOW <span class="sc">${L.length} words</span></div><div class="word-chips">${chips(L,'low')}</div></div>` : ''}
      </div>`;

    sec.querySelector('.lang-header').addEventListener('click', () => sec.classList.toggle('open'));
    acc.appendChild(sec);
  }

  if (badge && !wlBuilt) badge.textContent = grandTotal + ' words total';
  if (nores) nores.style.display = anyFound ? 'none' : 'block';
  wlBuilt = true;
}

function initWordListTab() {
  if (wlInited) { renderWordList(); return; }
  wlInited = true;
  // Search
  const search = document.getElementById('wlSearch');
  if (search) {
    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderWordList, 150); });
  }
  // Severity filters
  ['wlFH','wlFM','wlFL'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { this.classList.toggle('on'); renderWordList(); });
  });
  // Expand all
  const eall = document.getElementById('wlExpand');
  if (eall) {
    eall.addEventListener('click', function() {
      wlAllOpen = !wlAllOpen;
      document.querySelectorAll('#wlAccordion .lang-section').forEach(s => s.classList.toggle('open', wlAllOpen));
      this.textContent = wlAllOpen ? 'Collapse All ▲' : 'Expand All ▼';
    });
  }
  // First render
  renderWordList();
}
