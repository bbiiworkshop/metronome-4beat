let bpm = 120, playing = false, timer = null, beat = 0, audio = null, style = "click", beatsPerBar = 4;
const $ = id => document.getElementById(id);

function ctx() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function osc(freq, type, dur, vol, delay) {
  if (delay === undefined) delay = 0;
  const c = ctx(), n = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, n);
  g.gain.setValueAtTime(vol, n);
  g.gain.exponentialRampToValueAtTime(0.001, n + dur);
  o.connect(g).connect(c.destination);
  o.start(n);
  o.stop(n + dur);
}

function noise(dur, vol, delay) {
  if (delay === undefined) delay = 0;
  const c = ctx(), n = c.currentTime + delay;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const a = b.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b;
  f.type = "highpass";
  f.frequency.value = 1800;
  g.gain.setValueAtTime(vol, n);
  g.gain.exponentialRampToValueAtTime(0.001, n + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(n);
}

function isAccent(beatIdx) {
  return beatIdx === 0;
}

function hit(accent) {
  if (style === "bell") {
    osc(accent ? 880 : 620, "sine", 0.42, accent ? 1.0 : 0.75);
    osc(accent ? 1320 : 930, "sine", 0.28, accent ? 0.35 : 0.25);
  } else if (style === "drum") {
    if (accent) {
      osc(145, "sine", 0.20, 1.0);
      osc(65, "sine", 0.28, 1.0);
    } else {
      osc(190, "triangle", 0.08, 0.7);
      noise(0.10, 0.35);
    }
  } else {
    osc(accent ? 1250 : 900, "square", 0.06, accent ? 0.65 : 0.5);
  }
}

function renderBeats() {
  const container = $("beatsContainer");
  const labels = { 2: "1|2", 3: "1|2|3", 4: "1|2|3|4", 6: "1|2|3|4|5|6" };
  const parts = (labels[beatsPerBar] || "1|2|3|4").split("|");
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    const cls = "beat" + (i === 0 ? " active" : "");
    html += '<div id="b' + i + '" class="' + cls + '">' + parts[i] + '</div>';
  }
  container.innerHTML = html;
}

function flash(i) {
  const btns = document.querySelectorAll(".beat");
  btns.forEach(function(b) { b.classList.remove("active"); b.classList.remove("accent"); });
  const b = document.getElementById("b" + i);
  if (b) {
    b.classList.add("active");
    if (isAccent(i)) b.classList.add("accent");
  }
}

function tick() {
  hit(isAccent(beat));
  flash(beat);
  beat = (beat + 1) % beatsPerBar;
}

function start() {
  if (playing) return;
  ctx();
  playing = true;
  beat = 0;
  const btn = $("playBtn");
  btn.textContent = "停止播放";
  btn.classList.add("playing");
  tick();
  timer = setInterval(tick, 60000 / bpm);
}

function stop() {
  playing = false;
  clearInterval(timer);
  timer = null;
  const btn = $("playBtn");
  btn.textContent = "開始播放";
  btn.classList.remove("playing");
}

$("playBtn").onclick = function() {
  if (playing) { stop(); } else { start(); }
};

// 下拉選單：音色
function setupDropdown(btnId, menuId, onSelect) {
  const btn = $(btnId), menu = $(menuId);
  btn.onclick = function(e) {
    e.stopPropagation();
    const expanded = btn.getAttribute("aria-expanded") === "true";
    // 關閉所有下拉
    document.querySelectorAll(".dropMenu").forEach(m => m.style.display = "none");
    document.querySelectorAll(".dropBtn").forEach(b => b.setAttribute("aria-expanded", "false"));
    if (!expanded) {
      menu.style.display = "flex";
      btn.setAttribute("aria-expanded", "true");
    }
  };
  menu.querySelectorAll(".dropOpt").forEach(function(opt) {
    opt.onclick = function(e) {
      e.stopPropagation();
      const val = opt.getAttribute("data-value");
      // 更新選項狀態
      menu.querySelectorAll(".dropOpt").forEach(function(o) {
        o.classList.remove("selected");
        o.setAttribute("aria-checked", "false");
      });
      opt.classList.add("selected");
      opt.setAttribute("aria-checked", "true");
      btn.textContent = opt.textContent;
      menu.style.display = "none";
      btn.setAttribute("aria-expanded", "false");
      onSelect(val);
    };
  });
}

setupDropdown("soundBtn", "soundMenu", function(val) {
  style = val;
  if (!playing) { hit(true); }
  const labels = { click: "音色一", bell: "音色二", drum: "音色三" };
  const opt = document.querySelector('#soundMenu .dropOpt[data-value="' + val + '"]');
  if (opt) $("soundBtn").textContent = "音色選擇：" + (labels[val] || opt.textContent);
});

setupDropdown("meterBtn", "meterMenu", function(val) {
  beatsPerBar = parseInt(val);
  renderBeats();
  if (playing) { stop(); start(); }
  const opt = document.querySelector('#meterMenu .dropOpt[data-value="' + val + '"]');
  if (opt) $("meterBtn").textContent = "拍號選擇：" + opt.textContent;
});

// 點外面關閉下拉
document.addEventListener("click", function() {
  document.querySelectorAll(".dropMenu").forEach(m => m.style.display = "none");
  document.querySelectorAll(".dropBtn").forEach(b => b.setAttribute("aria-expanded", "false"));
});



// 語音輸入
$("voice").onclick = function() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    $("bpm").textContent = "此瀏覽器不支援語音輸入";
    return;
  }
  const r = new SR();
  r.lang = "zh-TW";
  r.interimResults = false;
  r.maxAlternatives = 3;
  r.onresult = function(e) {
    const text = e.results[0][0].transcript;
    const n = parseNumber(text);
    if (n) {
      bpm = Math.max(30, Math.min(240, Math.round(n)));
      $("bpm").textContent = bpm + " BPM";
      if (playing) { stop(); start(); }
    }
  };
  r.onerror = function() {};
  r.start();
};

// BPM 增減按鈕（語音輸入不可用時的替代）
function changeBpm(delta) {
  bpm = Math.max(30, Math.min(240, bpm + delta));
  $("bpm").textContent = bpm + " BPM";
  if (playing) { stop(); start(); }
}
$("bpmDown").onclick = function() { changeBpm(-5); };
$("bpmUp").onclick = function() { changeBpm(5); };

function parseNumber(s) {
  const m = s.match(/\d{2,3}/);
  if (m) return Number(m[0]);
  const d = { "零": 0, "〇": 0, "一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  let total = 0, num = 0, found = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (d[c] !== undefined) { num = d[c]; found = true; }
    else if (c === "十") { total += (num || 1) * 10; num = 0; }
    else if (c === "百") { total += (num || 1) * 100; num = 0; }
  }
  total += num;
  return found ? total : null;
}

renderBeats();
