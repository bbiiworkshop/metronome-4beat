let bpm = 120, playing = false, timer = null, beat = 0, audio = null, style = "click", beatsPerBar = 4, accentPattern = "1";
const $ = id => document.getElementById(id);

function announce(t) { $("status").textContent = t; }

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
  if (accentPattern === "1,3") return beatIdx === 0 || beatIdx === 2;
  if (accentPattern === "2,4") return beatIdx === 1 || beatIdx === 3;
  return beatIdx === 0;
}

function hit(accent) {
  if (style === "bell") {
    osc(accent ? 880 : 620, "sine", 0.42, accent ? 0.55 : 0.38);
    osc(accent ? 1320 : 930, "sine", 0.28, accent ? 0.18 : 0.12);
  } else if (style === "digital") {
    osc(accent ? 1200 : 800, "square", 0.07, accent ? 0.32 : 0.22);
    osc(accent ? 1600 : 1000, "square", 0.035, accent ? 0.12 : 0.08);
  } else if (style === "drum") {
    if (accent) {
      osc(145, "sine", 0.20, 0.85);
      osc(65, "sine", 0.28, 0.55);
    } else {
      osc(190, "triangle", 0.08, 0.35);
      noise(0.10, 0.18);
    }
  } else {
    osc(accent ? 1250 : 900, "square", 0.06, accent ? 0.34 : 0.25);
  }
}

function renderBeats() {
  const container = $("beatsContainer");
  const labels = { 2: "1|2", 3: "1|2|3", 4: "1|2|3|4", 5: "1|2|3|4|5", 6: "1|2|3|4|5|6" };
  const parts = (labels[beatsPerBar] || "1|2|3|4").split("|");
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    const cls = "beat" + (i === 0 ? " active" : "");
    html += '<div id="b' + i + '" class="' + cls + '">' + parts[i] + '</div>';
  }
  container.innerHTML = html;

  const meterNames = { 2: "2/4", 3: "3/4", 4: "4/4", 5: "5/8", 6: "6/8" };
  $("beatStatus").textContent = meterNames[beatsPerBar] + " 拍。尚未開始。";
}

function flash(i) {
  const btns = document.querySelectorAll(".beat");
  btns.forEach(function(b) { b.classList.remove("active"); b.classList.remove("accent"); });
  const b = document.getElementById("b" + i);
  if (b) {
    b.classList.add("active");
    if (isAccent(i)) b.classList.add("accent");
  }

  const labels2 = { 2: "強|弱", 3: "強|弱|弱", 4: "強|弱|強|弱", 5: "強|弱|弱|弱|弱", 6: "強|弱|弱|強|弱|弱" };
  const m = labels2[beatsPerBar] || labels2[4];
  const mparts = m.split("|");
  const beatLabel = mparts[i] ? "(" + mparts[i] + "拍)" : "";
  $("beatStatus").textContent = "目前第 " + (i + 1) + " 拍 " + beatLabel + "。" + (isAccent(i) ? "這是特殊音。" : "這是一般拍。");
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
  btn.textContent = "■ 停止播放";
  btn.setAttribute("aria-label", "停止播放");
  btn.classList.add("playing");
  const accentDesc = (beatsPerBar === 4) ? ("，特殊音在" + (accentPattern === "1" ? "第一拍" : accentPattern === "1,3" ? "第1.3拍" : "第2.4拍")) : "";
  announce("節拍器已開始，" + bpm + " BPM，" + beatsPerBar + "拍" + accentDesc + "。");
  tick();
  timer = setInterval(tick, 60000 / bpm);
}

function stop() {
  playing = false;
  clearInterval(timer);
  timer = null;
  const btn = $("playBtn");
  btn.textContent = "▶ 開始播放";
  btn.setAttribute("aria-label", "開始節拍器");
  btn.classList.remove("playing");
  const accentDesc2 = (beatsPerBar === 4) ? ("，特殊音在" + (accentPattern === "1" ? "第一拍" : accentPattern === "1,3" ? "第1.3拍" : "第2.4拍")) : "";
  announce("節拍器已停止，目前 " + bpm + " BPM，" + beatsPerBar + "拍" + accentDesc2 + "。");
}

// 播放按鈕
$("playBtn").onclick = function() {
  if (playing) { stop(); } else { start(); }
};

// 拍號下拉選單
var meterMenuVisible = false;
$("meterBtn").onclick = function() {
  meterMenuVisible = !meterMenuVisible;
  var menu = $("meterMenu");
  if (meterMenuVisible) {
    menu.style.display = "block";
    this.setAttribute("aria-expanded", "true");
  } else {
    menu.style.display = "none";
    this.setAttribute("aria-expanded", "false");
  }
};
document.querySelectorAll(".meterOpt").forEach(function(btn) {
  btn.onclick = function() {
    var wasPlaying = playing;
    if (playing) { clearInterval(timer); timer = null; playing = false; }
    document.querySelectorAll(".meterOpt").forEach(function(x) { x.classList.remove("selected"); });
    btn.classList.add("selected");
    beatsPerBar = parseInt(btn.dataset.beats);
    renderBeats();
    var names2 = { 2: "2/4", 3: "3/4", 4: "4/4", 5: "5/8", 6: "6/8" };
    $("meterBtn").textContent = names2[beatsPerBar] + " 拍 ▾";
    $("meterBtn").setAttribute("aria-label", names2[beatsPerBar] + " 拍");
    meterMenuVisible = false;
    $("meterMenu").style.display = "none";
    $("meterBtn").setAttribute("aria-expanded", "false");

    // 4/4 顯示特殊音選項，其他隱藏
    var accentSection = $("accentSection");
    if (beatsPerBar === 4) {
      accentSection.style.display = "block";
    } else {
      accentSection.style.display = "none";
      accentPattern = "1";
    }
    var accentDesc = (beatsPerBar === 4) ? ("，特殊音在" + (accentPattern === "1" ? "第一拍" : accentPattern === "1,3" ? "第1.3拍" : "第2.4拍")) : "";
    announce("已選擇" + names2[beatsPerBar] + "拍" + accentDesc + "。");

    // 如果原本在播放，重新啟動
    if (wasPlaying) {
      beat = 0;
      playing = true;
      var btn2 = $("playBtn");
      btn2.textContent = "■ 停止播放";
      btn2.setAttribute("aria-label", "停止播放");
      btn2.classList.add("playing");
      tick();
      timer = setInterval(tick, 60000 / bpm);
    }
  };
});

// 特殊音位置選項
document.querySelectorAll(".accentOpt").forEach(function(btn) {
  btn.onclick = function() {
    document.querySelectorAll(".accentOpt").forEach(function(x) {
      x.setAttribute("aria-checked", "false");
      x.classList.remove("selected");
    });
    btn.setAttribute("aria-checked", "true");
    btn.classList.add("selected");
    accentPattern = btn.dataset.accent;
    var accentDesc = "特殊音在" + (accentPattern === "1" ? "第一拍" : accentPattern === "1,3" ? "第1.3拍" : "第2.4拍");
    announce(accentDesc + "。");
    if (playing) {
      hit(isAccent(beat));
      flash(beat);
    }
  };
});

// 音色選擇
document.querySelectorAll(".style").forEach(function(btn) {
  btn.onclick = function() {
    document.querySelectorAll(".style").forEach(function(x) {
      x.setAttribute("aria-checked", "false");
      x.classList.remove("selected");
    });
    btn.setAttribute("aria-checked", "true");
    btn.classList.add("selected");
    style = btn.dataset.style;
    const names = { click: "一般節拍器", digital: "電子", drum: "真鼓", bell: "鈴鐺" };
    $('styleStatus').textContent = "目前音色：" + names[style] + "。特殊音使用特殊提示聲。";
    announce("已選擇" + names[style] + "節拍音色。特殊音使用特殊提示聲。");
    if (playing) {
      hit(isAccent(beat));
    } else {
      hit(true);
    }
  };
});

// 語音輸入
$("voice").onclick = function() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    announce("此瀏覽器不支援語音辨識，請使用 Android Chrome。");
    return;
  }
  const r = new SR();
  r.lang = "zh-TW";
  r.interimResults = false;
  r.maxAlternatives = 3;
  announce("正在聆聽。請說出 BPM，例如一百二十 BPM。");
  r.onresult = function(e) {
    const text = e.results[0][0].transcript;
    const n = parseNumber(text);
    if (n) {
      bpm = Math.max(30, Math.min(240, Math.round(n)));
      $("bpm").textContent = bpm + " BPM";
      announce("已辨識：" + text + "。目前速度 " + bpm + " BPM。");
      if (playing) { stop(); start(); }
    } else {
      announce("聽到：" + text + "。沒有辨識出有效的 BPM，請再說一次。");
    }
  };
  r.onerror = function() {
    announce("語音辨識失敗，請再試一次。");
  };
  r.start();
};

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

// 初始化
renderBeats();
$("accentSection").style.display = "block";
