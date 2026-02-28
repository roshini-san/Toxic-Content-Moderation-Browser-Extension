/**
 * content.js — Toxic Content Filter (all-in-one)
 * =================================================
 * 1. Word-list  — instant blur on 300+ known terms
 * 2. AI batch   — HateBERT + IronyBERT via backend (debounced)
 * 4. Composer   — warns AS you type in any textarea/contenteditable
 */

'use strict';

const BACKEND           = 'http://127.0.0.1:5050';
const AI_BATCH_SIZE     = 12;
const AI_DEBOUNCE_MS    = 900;
const MIN_AI_LEN        = 20;
const COMPOSER_DELAY_MS = 1000;     // wait N ms after last keystroke
const COMPOSER_MIN_LEN  = 20;       // don't warn on very short text

// ── Word list (300+ terms, sorted longest-first) ──────────────────────────────
const RAW_WORDS = [
  "2g1c","2 girls 1 cup","acrotomophilia","alabama hot pocket","alaskan pipeline",
  "anal","anilingus","anus","apeshit","arsehole",
  "asshole","assmunch","auto erotic","autoerotic","babeland",
  "baby batter","baby juice","ball gag","ball gravy","ball kicking",
  "ball licking","ball sack","ball sucking","bangbros","bangbus",
  "bareback","barely legal","barenaked","bastard","bastardo",
  "bastinado","bbw","bdsm","beaner","beaners",
  "beaver cleaver","beaver lips","beastiality","bestiality","big black",
  "big breasts","big knockers","big tits","bimbos","birdlock",
  "bitch","bitches","black cock","blonde action","blonde on blonde action",
  "blowjob","blow job","blow your load","blue waffle","blumpkin",
  "bollocks","bondage","boner","boobs","booty call",
  "brown showers","brunette action","bukkake","bulldyke","bullet vibe",
  "bullshit","bung hole","bunghole","busty","buttcheeks",
  "butthole","camel toe","camgirl","camslut","camwhore",
  "carpet muncher","carpetmuncher","chocolate rosebuds","cialis","circlejerk",
  "cleveland steamer","clit","clitoris","clover clamps","clusterfuck",
  "cock","cocks","coprolagnia","coprophilia","cornhole",
  "coon","coons","creampie","cumming","cumshot",
  "cumshots","cunnilingus","cunt","darkie","date rape",
  "daterape","deep throat","deepthroat","dendrophilia","dick",
  "dildo","dingleberry","dingleberries","dirty pillows","dirty sanchez",
  "doggie style","doggiestyle","doggy style","doggystyle","dog style",
  "dolcett","domination","dominatrix","dommes","donkey punch",
  "double dong","double penetration","dp action","dry hump","dvda",
  "eat my ass","ecchi","ejaculation","escort","eunuch",
  "fag","faggot","fecal","felch","fellatio",
  "feltch","female squirting","femdom","figging","fingerbang",
  "fingering","fisting","foot fetish","footjob","frotting",
  "fuck","fuck buttons","fuckin","fucking","fucktards",
  "fudge packer","fudgepacker","futanari","gangbang","gang bang",
  "gay sex","genitals","giant cock","girl on","girl on top",
  "girls gone wild","goatcx","goatse","god damn","gokkun",
  "golden shower","goodpoop","goo girl","goregasm","grope",
  "group sex","g-spot","guro","hand job","handjob",
  "hard core","hardcore","hentai","homoerotic","honkey",
  "hooker","hot carl","hot chick","how to kill","how to murder",
  "huge fat","humping","incest","intercourse","jack off",
  "jail bait","jailbait","jelly donut","jerk off","jigaboo",
  "jiggaboo","jiggerboo","jizz","juggs","kike",
  "kinbaku","kinkster","kinky","knobbing","leather restraint",
  "leather straight jacket","lemon party","livesex","lolita","lovemaking",
  "make me come","male squirting","masturbate","masturbating","masturbation",
  "menage a trois","milf","missionary position","mong","motherfucker",
  "mound of venus","mr hands","muff diver","muffdiving","nambla",
  "nawashi","negro","neonazi","nigga","nigger",
  "nig nog","nimphomania","nipple","nipples","nutten",
  "nympho","nymphomania","octopussy","omorashi","one cup two girls",
  "one guy one jar","orgasm","orgy","paedophile","paki",
  "panties","panty","pedobear","pedophile","pegging",
  "penis","phone sex","piece of shit","pikey","pissing",
  "piss pig","pisspig","playboy","pleasure chest","pole smoker",
  "ponyplay","poof","poon","poontang","punany",
  "poop chute","poopchute","porn","porno","pornography",
  "prince albert piercing","pthc","pubes","pussy","queaf",
  "queef","quim","raghead","raging boner","rape",
  "raping","rapist","rectum","reverse cowgirl","rimjob",
  "rimming","rosy palm","rosy palm and her 5 sisters","rusty trombone","sadism",
  "santorum","scat","schlong","scissoring","semen",
  "sexcam","sexo","shaved beaver","shaved pussy","shemale",
  "shibari","shit","shitblimp","shitty","shota",
  "shrimping","skeet","slanteye","slut","s&m",
  "smut","snatch","snowballing","sodomize","sodomy",
  "spastic","spic","splooge","splooge moose","spooge",
  "spread legs","spunk","strap on","strapon","strappado",
  "strip club","style doggy","suicide girls","sultry women","swastika",
  "swinger","tainted love","taste my","tea bagging","threesome",
  "throating","thumbzilla","tied up","tight white","tits",
  "titties","titty","tongue in a","topless","tosser",
  "towelhead","tranny","tribadism","tub girl","tubgirl",
  "tushy","twat","twink","twinkie","two girls one cup",
  "undressing","upskirt","urethra play","urophilia","vagina",
  "venus mound","viagra","vibrator","violet wand","vorarephilia",
  "voyeur","voyeurweb","voyuer","vulva","wank",
  "wetback","wet dream","white power","whore","worldsex",
  "wrapping men","wrinkled starfish","xxx","yaoi","yellow showers",
  "yiffy","zoophilia"
];

const SORTED_WORDS  = [...RAW_WORDS].sort((a, b) => b.length - a.length);
const TOXIC_PATTERN = new RegExp(
  '\\b(' + SORTED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
  'gi'
);

const HIGH_WORDS = new Set([
  'nigger','nigga','kike','rape','rapist','raping','pedophile','paedophile',
  'neonazi','white power','swastika','pthc','nambla','how to kill','how to murder',
  'jigaboo','jiggaboo','jiggerboo','towelhead','raghead','wetback','spic','paki',
  'slanteye','darkie','beaner','beaners','coon','coons','negro','honkey'
]);
const MEDIUM_WORDS = new Set([
  'fuck','fuckin','fucking','fucktards','shit','shitty','bitch','bitches','cunt',
  'cock','cocks','pussy','dick','bastard','bastardo','motherfucker','asshole',
  'arsehole','bullshit','clusterfuck','fag','faggot','slut','whore','twat','wank',
  'bollocks','tosser','mong','spastic','poof','tranny','jizz','cum','cumshot',
  'cumshots','blowjob','blow job','gangbang','gang bang','anal','anus','handjob',
  'hand job','rimjob','fingering','fisting','incest','orgasm','ejaculation',
  'masturbate','masturbating','masturbation','sex','sexy','sexual','sexuality',
  'sexually','porn','porno','pornography','nude','nudity','penis','vagina',
  'vulva','semen','creampie','sodomize','sodomy'
]);

function wordSev(w) {
  const l = w.toLowerCase();
  if (HIGH_WORDS.has(l))   return 'high';
  if (MEDIUM_WORDS.has(l)) return 'medium';
  return 'low';
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(data) {
  chrome.storage.local.get(['toxicLog'], r => {
    const arr = r.toxicLog || [];
    arr.push({ timestamp: Date.now(), date: new Date().toISOString(), ...data });
    if (arr.length > 2000) arr.shift();
    chrome.storage.local.set({ toxicLog: arr });
  });
}

// ── AI batch queue ────────────────────────────────────────────────────────────
let _queue = [], _timer = null;

function queueAI(text, existingSpans, rawNode, parentEl) {
  if (text.length < MIN_AI_LEN) return;
  _queue.push({ text, existingSpans, rawNode, parentEl });
  clearTimeout(_timer);
  _timer = setTimeout(flushAI, AI_DEBOUNCE_MS);
}

async function flushAI() {
  if (!_queue.length) return;
  const batch = _queue.splice(0, AI_BATCH_SIZE);
  let data;
  try {
    const r = await fetch(`${BACKEND}/analyze/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: batch.map(b => b.text) }),
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) return;
    data = await r.json();
  } catch {
    return; // backend offline — word-list still worked
  }

  (data.results || []).forEach((result, i) => {
    if (!result.should_blur) return;
    const item = batch[i];
    const sev  = result.combined_severity;

    // Upgrade existing word-list spans with AI severity colour
    if (item.existingSpans?.length) {
      item.existingSpans.forEach(span => {
        span.className = span.className.replace(/severity-\w+/, `severity-${sev}`);
        if (sarc) span.setAttribute('data-sarcastic', 'true');
      });
    } else if (item.rawNode) {
      // AI caught implicit hate with no word-list hit — blur the whole node
      wrapNodeWithAI(item.rawNode, sev, result.detoxify?.score || 0);
    }

    log({
      source:          item.existingSpans?.length ? 'ai-upgrade' : 'ai-only',
      text:            item.text.slice(0, 200),
      severity:        sev,
      hateScore:       result.detoxify?.score,
      detoxifyScores:  result.detoxify?.scores || {},
      domain:          location.hostname
    });
  });
}

function wrapNodeWithAI(node, sev, score) {
  if (!node?.parentNode) return;
  const pct  = Math.round((score || 0) * 100);
  const wrap = document.createElement('span');
  wrap.className = `ai-blur-wrap severity-${sev}`;
  wrap.innerHTML  = `<span class="ai-badge">🤖 AI ${pct}%</span>
    <span class="ai-blurred" title="Click to reveal">${esc(node.textContent)}</span>`;
  wrap.querySelector('.ai-blurred').addEventListener('click', function() {
    this.classList.remove('ai-blurred');
    wrap.querySelector('.ai-badge')?.remove();
  }, { once: true });
  node.parentNode.replaceChild(wrap, node);
}

// ── Word-list scan ────────────────────────────────────────────────────────────
const _scanned = new WeakSet();

function wrapText(node) {
  if (node.nodeType !== Node.TEXT_NODE) return;
  if (_scanned.has(node)) return;
  _scanned.add(node);

  const txt = node.textContent;
  if (!txt.trim()) return;

  const par = node.parentElement;
  if (!par) return;
  if (['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT'].includes(par.tagName)) return;
  if (par.closest('.toxic-word-blur,.ai-blur-wrap,.ai-blurred')) return;

  // Reset global regex state
  TOXIC_PATTERN.lastIndex = 0;
  const hits = [];
  let m;
  while ((m = TOXIC_PATTERN.exec(txt)) !== null)
    hits.push({ word: m[0], index: m.index, len: m[0].length });

  if (!hits.length) {
    // No word hit — still send to AI for implicit hate
    if (txt.length >= MIN_AI_LEN) queueAI(txt, [], node, par);
    return;
  }

  // Build replacement HTML
  let html = '', last = 0;
  hits.forEach(({ word, index, len }) => {
    const sev = wordSev(word);
    html += esc(txt.slice(last, index));
    html += `<span class="toxic-word-blur severity-${sev}" data-word="${esc(word)}" title="Click to reveal">${esc(word)}</span>`;
    last = index + len;
  });
  html += esc(txt.slice(last));

  const wrap = document.createElement('span');
  wrap.innerHTML = html;
  node.parentNode.replaceChild(wrap, node);

  const spans = [...wrap.querySelectorAll('.toxic-word-blur')];
  spans.forEach(s => s.addEventListener('click', function() {
    this.className = '';
    this.removeAttribute('data-sarcastic');
    this.title = '';
    this.style.cursor = '';
  }, { once: true }));

  // Log each hit
  hits.forEach(({ word }) => log({
    source: 'word-list', word: word.toLowerCase(),
    severity: wordSev(word), text: txt.slice(0, 200), domain: location.hostname
  }));

  // Queue surrounding context for AI analysis too
  queueAI(txt, spans, null, par);
}

// ── DOM scanner ───────────────────────────────────────────────────────────────
function scanText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes  = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(wrapText);
}

// ── Composer guard ────────────────────────────────────────────────────────────
/**
 * The old realtime-input-filter.js inserted a position:absolute div which 
 * disappeared because parent was position:static and overflow:hidden.
 * Fix: insert the warning as a normal block element AFTER the input in DOM flow.
 * Also: log as source:'composer-guard' so dashboard counts it correctly.
 */
const _guarded = new WeakSet();

function attachComposer(el) {
  if (_guarded.has(el)) return;
  _guarded.add(el);

  let timer   = null;
  let warning = null;

  function getText() {
    return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT'
      ? el.value : (el.innerText || el.textContent || '');
  }

  function removeWarning() {
    if (warning) { warning.remove(); warning = null; }
  }

  function showWarning(sev, label, detail) {
    const colours = { high:'#7f1d1d', medium:'#78350f', low:'#14532d', none:'#1e1e38' };
    const textCol = { high:'#fca5a5', medium:'#fde68a', low:'#86efac', none:'#9ca3af' };

    if (!warning) {
      warning = document.createElement('div');
      // Insert immediately after the input in normal document flow
      if (el.nextSibling) el.parentElement?.insertBefore(warning, el.nextSibling);
      else el.parentElement?.appendChild(warning);
    }

    Object.assign(warning.style, {
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
      gap:          '8px',
      padding:      '6px 10px',
      margin:       '4px 0',
      borderRadius: '6px',
      fontSize:     '12px',
      fontWeight:   '600',
      fontFamily:   'system-ui, sans-serif',
      background:   colours[sev] || colours.none,
      color:        textCol[sev]  || textCol.none,
      border:       `1px solid ${textCol[sev] || textCol.none}44`,
      zIndex:       '2147483647',
      boxSizing:    'border-box',
      width:        '100%',
      lineHeight:   '1.4'
    });

    const dismiss = document.createElement('button');
    dismiss.textContent = '✕';
    Object.assign(dismiss.style, {
      background: 'none', border: 'none', color: 'inherit',
      cursor: 'pointer', padding: '0 4px', fontSize: '14px', flexShrink: '0'
    });
    dismiss.addEventListener('click', removeWarning);

    const msg = document.createElement('span');
    msg.textContent = `${label} — ${detail}`;

    warning.innerHTML = '';
    warning.appendChild(msg);
    warning.appendChild(dismiss);
  }

  el.addEventListener('input', () => {
    clearTimeout(timer);
    const text = getText().trim();

    if (text.length < COMPOSER_MIN_LEN) { removeWarning(); return; }

    // Instant word-list check
    TOXIC_PATTERN.lastIndex = 0;
    const hasWord = TOXIC_PATTERN.test(text);
    TOXIC_PATTERN.lastIndex = 0;

    if (hasWord) showWarning('medium', '⚠️ Toxic language detected', 'contains flagged words');

    // AI check after delay
    timer = setTimeout(async () => {
      const currentText = getText().trim();
      if (currentText.length < COMPOSER_MIN_LEN) { removeWarning(); return; }

      try {
        const r = await fetch(`${BACKEND}/analyze/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: currentText.slice(0, 500) }),
          signal: AbortSignal.timeout(8000)
        });
        if (!r.ok) return;
        const result = await r.json();

        // Re-check word list in case text changed
        TOXIC_PATTERN.lastIndex = 0;
        const stillHasWord = TOXIC_PATTERN.test(currentText);
        TOXIC_PATTERN.lastIndex = 0;

        if (!result.should_blur && !stillHasWord) { removeWarning(); return; }

        const sev    = result.combined_severity || 'low';
        const tox    = result.detoxify?.score   || 0;
        const pct    = Math.round(tox * 100);

        const label  = tox > 0.30
          ? `🤖 AI: ${sev} severity (${pct}% toxic)`
          : '⚠️ Toxic language detected';
        const detail = pct > 0 ? `${pct}% toxicity` : 'contains flagged words';

        showWarning(sev, label, detail);

        if (result.should_blur || stillHasWord) {
          log({
            source:          'composer-guard',
            text:            currentText.slice(0, 200),
            severity:        sev,
            hateScore:       tox,
            detoxifyScores:  result.detoxify?.scores || {},
            domain:          location.hostname
          });
        }
      } catch {
        // Backend offline — word-list warning already visible
      }
    }, COMPOSER_DELAY_MS);
  });

  el.addEventListener('blur', () => clearTimeout(timer));
}

// ── Scan helpers ──────────────────────────────────────────────────────────────
function scanInputs(root) {
  const sel = 'textarea, input[type="text"], input[type="search"], [contenteditable="true"]';
  (root.querySelectorAll ? root : document)
    .querySelectorAll(sel)
    .forEach(attachComposer);
}

// ── Init ──────────────────────────────────────────────────────────────────────
if (document.body) {
  scanText(document.body);
  scanInputs(document.body);
}

new MutationObserver(mutations => {
  mutations.forEach(({ addedNodes }) => {
    addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        scanText(node);        scanInputs(node);
      } else if (node.nodeType === Node.TEXT_NODE) {
        wrapText(node);
      }
    });
  });
}).observe(document.body, { childList: true, subtree: true });

// Quick health check
fetch(`${BACKEND}/health`)
  .then(r => r.json())
  .then(d => console.log(`[ToxicFilter] Backend OK — GPU:${d.gpu} models:${d.models}`))
  .catch(() => console.warn('[ToxicFilter] Backend offline — word-list only'));

console.log(`[ToxicFilter] Active (${RAW_WORDS.length} words | Detoxify | Composer)`);
