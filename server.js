const http = require("http");
const https = require("https");
const cron = require('node-cron');
const { importOperations, fetchReport, morningReport } = require('./tbank');

const USER_IDS = [433916681, 325532225]; // Елена, Аркадий

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐ¡Ð¢Ð ÐÐÐÐ â ÐÐÐÐÐÐÐ¢Ð Ð¢ÐÐÐÐ ÐÐÐ¡ÐÐ /revoke !
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
const BOT_TOKEN = "8410628068:AAGseZ3UI7elPdJi_p7BqAcwXtxQ_kILTSo";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjMiUFIndgH3RVwIQjuEyQqBrwBw0peuqCIr676SdYieBAzZqmhadUXRxwl4LxMDAW/exec";
const ALLOWED = [433916681, 325532225];

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// Ð¡ÐÐ ÐÐÐÐ§ÐÐÐÐ
// âââââââââââââââââââââââââââââââââââââââââââââââââââ

// ÐÑÐµ ÑÑÐµÑÐ° Ð¸Ð· Ð¡Ð¿ÑÐ°Ð²Ð¾ÑÐ½Ð¸ÐºÐ° (ÑÑÐ¾Ð»Ð±ÐµÑ E)
const ACCOUNTS = [
  "Ð¢Ð¸Ð½ÑÐºÐ¾Ñ Ñ/Ñ","ÐÐ»ÑÑÐ¸ Ñ/Ñ","ÐÐ°ÑÑÐ° ÐÐÐ","ÐÐ»ÑÐ± Ð¿Ð¿Ñ",
  "Ð¢Ð¸Ð½ÑÐºÐ¾Ñ ÐÐ¸Ð","Ð ÐµÐ·ÐµÑÐ²","usdt",
  "Ð½Ð°Ð»Ð¾Ð³Ð¸","Ð´Ð¸Ð¼Ð° ÐºÐ»ÑÐ± Ð¿Ð¿Ñ"
];

// Ð¡ÑÐ°ÑÑÐ¸ ÑÐ°ÑÑÐ¾Ð´Ð¾Ð² (Ð¸Ð· Ð¡Ð¿ÑÐ°Ð²Ð¾ÑÐ½Ð¸ÐºÐ°, ÑÑÐ¾Ð»Ð±ÐµÑ B)
const EXP_ARTS = [
  "Ð ÐµÐºÐ»Ð°Ð¼Ð°/Ð¿ÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Ð¼ÐµÑÐ¾Ð¿ÑÐ¸ÑÑÐ¸Ñ",
  "Ð ÐµÐºÐ»Ð°Ð¼Ð° Ð¸ Ð¿ÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Ð±ÑÐµÐ½Ð´Ð° (ÐÑÐºÐ°Ð´Ð¸Ð¹ ÐÐµÐ»ÐµÑÐºÐ¸Ð¹)",
  "Ð¢ÐµÑÐ½Ð¸ÑÐµÑÐºÐ¸Ðµ (ÑÐµÑÐ²Ð¸ÑÑ, Ð¿ÑÐ¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ñ)",
  "ÐÐ°ÑÐ¿Ð»Ð°ÑÐ° ÑÐ¾ÑÑÑÐ´Ð½Ð¸ÐºÐ¸","ÐÑÐ¿Ð»Ð°ÑÐ° ÑÑÐºÐ¾Ð²Ð¾Ð´Ð¸ÑÐµÐ»Ñ",
  "ÐÑÐ¿Ð»Ð°ÑÐ° ÐºÐ¾Ð½ÑÑÐ°Ð³ÐµÐ½ÑÐ°Ð¼","ÐÐ°Ð»Ð¾Ð³Ð¸",
  "ÐÐ¾Ð¼Ð¸ÑÑÐ¸Ð¸ Ð±Ð°Ð½ÐºÐ¾Ð², Ð¾Ð±ÑÐ»ÑÐ¶Ð¸Ð²Ð°Ð½Ð¸Ðµ ÑÑÐµÑÐ°",
  "ÐÐ¾Ð¼Ð¸ÑÑÐ¸Ñ Ð·Ð° Ð¿ÐµÑÐµÐ²Ð¾Ð´Ñ","ÐÐ¾Ð¼Ð¸ÑÑÐ¸Ñ Ð·Ð° ÑÐºÐ²Ð°Ð¸ÑÐ¸Ð½Ð³",
  "ÐÐ¸Ð·Ð°Ð¹Ð½","ÐÑÑÐ°ÑÐ¾ÑÑ","ÐÐµÑÐ¾Ð´Ð¾Ð»Ð¾Ð³Ð¸",
  "ÐÑÐ´ÐµÐ» ÐºÐ¾Ð½ÑÐµÐ½ÑÐ°","ÐÑÐ´ÐµÐ» Ð¿ÑÐ¾Ð´Ð°Ð¶","ÐÑÐ¾Ð´ÑÐºÑ",
  "ÐÐ±ÑÑÐµÐ½Ð¸Ðµ","ÐÑÐ¾ÑÐ¸Ðµ ÑÐ°ÑÑÐ¾Ð´Ñ",
  "Ð Ð°ÑÑÐ¾Ð´Ñ Ð½Ð° Ð¿ÑÐ¾Ð²ÐµÐ´ÐµÐ½Ð¸Ðµ Ð²ÑÑÑÐµÑ","ÐÑÐµÐ½Ð´Ð° Ð¿Ð¾Ð¼ÐµÑÐµÐ½Ð¸Ñ/Ð±Ð°Ð·Ñ",
  "Ð Ð°ÑÑÐ¾Ð´Ð½Ð¸ÐºÐ¸ Ð½Ð° Ð¼ÐµÑÐ¾Ð¿ÑÐ¸ÑÑÐ¸Ðµ","Ð¡Ð¾Ð·Ð´Ð°Ð½Ð¸Ñ ÑÐ°Ð¹ÑÐ°",
  "ÑÑÐ¸Ð´Ð¸ÑÐµÑÐºÐ¸Ðµ ÑÑÐ»ÑÐ³Ð¸","Ð±ÑÑÐ³Ð°Ð»ÑÐµÑÑÐºÐ¾Ðµ Ð¾Ð±ÑÐ»ÑÐ¶Ð¸Ð²Ð°Ð½Ð¸Ðµ",
  "ÐÐ½ÑÐµÑÐ½ÐµÑ, Ð¼Ð¾Ð±Ð¸Ð»ÑÐ½Ð°Ñ ÑÐ²ÑÐ·Ñ","Ð¢ÑÐ°Ð½ÑÐ¿Ð¾ÑÑÐ½ÑÐµ ÑÐ°ÑÑÐ¾Ð´Ñ",
  "ÐÐ¾Ð·Ð²ÑÐ°Ñ Ð·Ð°Ð¹Ð¼Ð¾Ð²","ÐÐ°Ð¹Ð¼Ñ Ð²ÑÐ´Ð°Ð½Ð½ÑÐµ","ÐÐ¾Ð·Ð²ÑÐ°Ñ ÐºÐ»Ð¸ÐµÐ½ÑÐ°Ð¼"
];

// Ð¡ÑÐ°ÑÑÐ¸ Ð¿Ð¾ÑÑÑÐ¿Ð»ÐµÐ½Ð¸Ð¹
const INC_ARTS = [
  "ÐÐ¾ÑÑÑÐ¿Ð»ÐµÐ½Ð¸Ñ Ð¾Ñ ÐºÐ»Ð¸ÐµÐ½ÑÐ¾Ð²",
  "ÐÐ¾ÑÑÑÐ¿Ð»ÐµÐ½Ð¸Ñ Ð¾Ñ ÐºÐ¾Ð½ÑÑÐ°Ð³ÐµÐ½ÑÐ¾Ð²",
  "ÐÐ°Ð¹Ð¼Ñ Ð¿Ð¾Ð»ÑÑÐµÐ½Ð½ÑÐµ"
];

// ÐÑÐ¾ÐµÐºÑÑ (Ð¸Ð· Ð¡Ð¿ÑÐ°Ð²Ð¾ÑÐ½Ð¸ÐºÐ°, ÑÑÐ¾Ð»Ð±ÐµÑ G)
const PROJECTS = [
  "ÐÐ»ÑÐ± ÐÐµÑÐµÐ¿ÑÐ¾ÑÐ¸ÑÑÑ",'ÐÐ»ÑÐ± "ÐÐ¾Ñ Ð¶Ð¸Ð½Ñ"',"ÐÐ»ÑÑÐ¸ Ð¸Ð·Ð¾Ð±Ð¸Ð»Ð¸Ñ 2026",
  "ÐÑÐ¾ÐµÐºÑ ÐÐ¾Ñ ÐÐ¸Ð·Ð½Ñ","ÐÐ»ÑÐ± Ñ2Ñ10","Ð¿ÑÐ¾ÐµÐºÑ ÐÑÐºÐ°Ð´Ð¸Ð¹ ÐÐµÐ»ÐµÑÐºÐ¸Ð¹",
  "ÐÐ»ÑÐ± Ð³ÐµÐ½Ð¸Ð°Ð»ÑÐ½ÑÑ ÑÐºÑÐ¿ÐµÑÑÐ¾Ð²","Ð»ÐµÐ½Ð° ÑÐ¸Ð½Ð°Ð½ÑÐ¸ÑÑ",
  "ÐÑÑÑ ÐºÐ»ÑÑÐ¸ Ð¸Ð·Ð¾Ð±Ð¸Ð»Ð¸Ñ",
  "ÐÑÑÑ ÐÐºÐ°Ð´ÐµÐ¼Ð¸Ñ ÐÐµÐ½Ð¸Ð°Ð»ÑÐ½ÑÑ Ð­ÐºÑÐ»ÐµÑÑÐ¾Ð² 1 Ð¿Ð¾ÑÐ¾Ðº",
  "ÐÑÑÑ ÑÐ¼Ð¾ÑÐ¸Ð¾Ð½Ð°Ð»ÑÐ½ÑÐ¹ Ð¼Ð°ÑÑÐµÑ"
];

const MONTHS_RU = ["","Ð¯Ð½Ð²Ð°ÑÑ","Ð¤ÐµÐ²ÑÐ°Ð»Ñ","ÐÐ°ÑÑ","ÐÐ¿ÑÐµÐ»Ñ","ÐÐ°Ð¹","ÐÑÐ½Ñ",
  "ÐÑÐ»Ñ","ÐÐ²Ð³ÑÑÑ","Ð¡ÐµÐ½ÑÑÐ±ÑÑ","ÐÐºÑÑÐ±ÑÑ","ÐÐ¾ÑÐ±ÑÑ","ÐÐµÐºÐ°Ð±ÑÑ"];

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
const states = {};

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// TELEGRAM API
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
function tg(method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(d)); });
    req.on("error", reject); req.write(body); req.end();
  });
}
function send(c, t, kb) {
  const d = { chat_id: c, text: t, parse_mode: "HTML" };
  if (kb) d.reply_markup = kb;
  return tg("sendMessage", d);
}
function answer(id) { return tg("answerCallbackQuery", { callback_query_id: id }); }

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// APPS SCRIPT
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
function callAPI(params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    function follow(u) {
      https.get(u, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location);
        } else {
          let d = ""; res.on("data", c => d += c);
          res.on("end", () => resolve(d));
        }
      }).on("error", reject);
    }
    follow(APPS_SCRIPT_URL + "?" + qs);
  });
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐ ÐÐÐÐ¢ÐÐ ÐÐÐÐÐÐÐÐÐÐ
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function handleUpdate(update) {
  try {
    if (update.callback_query) {
      const c = update.callback_query.message.chat.id;
      answer(update.callback_query.id);
      if (!ALLOWED.includes(c)) return;
    // ── Обработчик выбора года ──
    const _yd = update.callback_query.data;
    if (_yd && _yd.startsWith('year_')) {
      const _year = _yd.replace('year_', '');
      await send(c, `⏳ Загружаю отчёт за ${_year}...`);
      try {
        const _report = await fetchReport({ year: _year });
        await send(c, `📊 Отчёт за ${_year} год\n\n${_report}`);
      } catch (e) {
        await send(c, `❌ Ошибка: ${e.message}`);
      }
      return;
    }
      await handleBtn(c, update.callback_query.data);
    } else if (update.message) {
      const c = update.message.chat.id;
      const t = (update.message.text || "").trim();
      if (!ALLOWED.includes(c)) { await send(c, "â ID: " + c); return; }
      await handleText(c, t);
    }
  } catch (e) { console.log("Error:", e.message); }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// Ð¢ÐÐÐ¡Ð¢ÐÐÐ«Ð Ð¡ÐÐÐÐ©ÐÐÐÐ¯
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function handleText(c, t) {
  if (t === "/start" || t === "/menu") { delete states[c]; await mainMenu(c); return; }
  if (t === "/cancel") { delete states[c]; await send(c, "â ÐÑÐ¼ÐµÐ½ÐµÐ½Ð¾."); await mainMenu(c); return; }

  const st = states[c];
  if (!st) { await mainMenu(c); return; }

  // ÐÐ²Ð¾Ð´ Ð´Ð°ÑÑ
  if (st.waitDate) {
    const parts = t.split(".");
    if (parts.length >= 2) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parts.length >= 3 ? parseInt(parts[2]) : new Date().getFullYear();
      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 2020) {
        st.date = year + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0");
        st.waitDate = false;
        states[c] = st;
        await afterDate(c, st);
        return;
      }
    }
    await send(c, "â Ð¤Ð¾ÑÐ¼Ð°Ñ: ÐÐ.ÐÐ.ÐÐÐÐ\nÐÐ°Ð¿ÑÐ¸Ð¼ÐµÑ: 15.04.2026");
    return;
  }

  // ÐÐ¾Ð¼Ð¼ÐµÐ½ÑÐ°ÑÐ¸Ð¹
  if (st.waitComment) {
    st.comment = t === "/skip" ? "" : t;
    st.waitComment = false;
    await finishEntry(c, st);
    return;
  }

  // Ð¡ÑÐ¼Ð¼Ð°
  if (st.waitAmount) {
    const n = parseFloat(t.replace(",",".").replace(/\s/g,""));
    if (isNaN(n) || n <= 0) { await send(c, "â Ð§Ð¸ÑÐ»Ð¾ Ð±Ð¾Ð»ÑÑÐµ 0"); return; }
    st.amount = n;
    st.waitAmount = false;
    states[c] = st;
    await dateMenu(c);
    return;
  }

  // ÐÐ°ÑÐ°/Ð¼ÐµÑÑÑ Ð´Ð»Ñ Ð¾ÑÑÑÑÐ°
  if (st.waitReportInput) {
    st.waitReportInput = false;
    const parts = t.split(".");
    if (parts.length === 3) {
      await showReport(c, { date: parts[2]+"-"+parts[1].padStart(2,"0")+"-"+parts[0].padStart(2,"0") });
    } else if (parts.length === 2) {
      await showReport(c, { month: parts[1]+"-"+parts[0].padStart(2,"0") });
    } else {
      await send(c, "â Ð¤Ð¾ÑÐ¼Ð°Ñ: ÐÐ.ÐÐ.ÐÐÐÐ Ð¸Ð»Ð¸ ÐÐ.ÐÐÐÐ");
    }
    return;
  }

  await mainMenu(c);
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐÐÐÐ
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function handleBtn(c, d) {
  const st = states[c] || {};

  // ÐÐ»Ð°Ð²Ð½Ð¾Ðµ Ð¼ÐµÐ½Ñ
  if (d === "EXP") { states[c] = { type: "expense" }; await accMenu(c, "ð¸ <b>Ð Ð°ÑÑÐ¾Ð´</b>\nÐÑÐ±ÐµÑÐ¸ÑÐµ ÑÑÑÑ:"); return; }
  if (d === "INC") { states[c] = { type: "income" }; await accMenu(c, "ð° <b>ÐÐ¾ÑÑÑÐ¿Ð»ÐµÐ½Ð¸Ðµ</b>\nÐÑÐ±ÐµÑÐ¸ÑÐµ ÑÑÑÑ:"); return; }
  if (d === "TRN") { states[c] = { type: "transfer" }; await accMenu(c, "ð <b>ÐÐµÑÐµÐ²Ð¾Ð´</b>\nÐÑÐºÑÐ´Ð°:"); return; }
  if (d === "BAL") { await showBalance(c); return; }
  if (d === "REP") { await reportMenu(c); return; }

  // ── Кнопка «📥 Импорт из банка» ──
  if (d === "IMP") {
    await send(c, "⏳ Загружаю операции из Т-Банка...");
    try {
      const result = await importOperations(1);
      let msg = `✅ Импорт завершён!\n\nДата: ${result.date}\nЗагружено: ${result.added} операций`;
      if (result.errors.length) msg += `\n⚠️ Ошибки (${result.errors.length}):\n${result.errors.slice(0,3).join('\n')}`;
      await send(c, msg);
    } catch (e) {
      await send(c, `❌ Ошибка импорта: ${e.message}`);
    }
  }

  // ── Кнопка «📊 Отчёт за год» ──
  if (d === "YEAR") {
    const cy = new Date().getFullYear();
    await send(c, "📅 Выбери год:", {inline_keyboard: [
      [{text: String(cy),   callback_data: `year_${cy}`},
       {text: String(cy-1), callback_data: `year_${cy-1}`},
       {text: String(cy-2), callback_data: `year_${cy-2}`}]
    ]});
  }
  if (d === "MENU") { delete states[c]; await mainMenu(c); return; }

  // Ð¡ÑÑÑ
  if (d.startsWith("A.")) {
    const idx = parseInt(d.split(".")[1]);
    const acc = ACCOUNTS[idx];

    if (st.type === "transfer" && !st.fromAcc) {
      st.fromAcc = acc;
      states[c] = st;
      await accMenu(c, "ð ÐÐ·: <b>" + acc + "</b>\nÐÑÐ´Ð°:");
      return;
    }
    if (st.type === "transfer" && st.fromAcc) {
      if (acc === st.fromAcc) { await send(c, "â Ð¢Ð¾Ñ Ð¶Ðµ ÑÑÑÑ!"); return; }
      st.toAcc = acc;
      st.waitAmount = true;
      states[c] = st;
      await send(c, "ð " + st.fromAcc + " â " + st.toAcc + "\n\nðµ ÐÐ²ÐµÐ´Ð¸ÑÐµ ÑÑÐ¼Ð¼Ñ:");
      return;
    }

    st.account = acc;
    st.waitAmount = true;
    states[c] = st;
    await send(c, "ð³ <b>" + acc + "</b>\n\nðµ ÐÐ²ÐµÐ´Ð¸ÑÐµ ÑÑÐ¼Ð¼Ñ:");
    return;
  }

  // ÐÐ°ÑÐ°
  if (d === "D.today") { st.date = fmtD(new Date()); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.yest") { const y = new Date(); y.setDate(y.getDate()-1); st.date = fmtD(y); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.2") { const y = new Date(); y.setDate(y.getDate()-2); st.date = fmtD(y); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.3") { const y = new Date(); y.setDate(y.getDate()-3); st.date = fmtD(y); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.other") { st.waitDate = true; states[c] = st; await send(c, "ð ÐÐ²ÐµÐ´Ð¸ÑÐµ Ð´Ð°ÑÑ:\nÐ¤Ð¾ÑÐ¼Ð°Ñ: ÐÐ.ÐÐ.ÐÐÐÐ"); return; }

  // Ð¡ÑÐ°ÑÑÑ
  if (d.startsWith("R.")) {
    const arts = st.type === "expense" ? EXP_ARTS : INC_ARTS;
    st.article = arts[parseInt(d.split(".")[1])];
    states[c] = st;
    await projectMenu(c);
    return;
  }

  // ÐÑÐ¾ÐµÐºÑ
  if (d.startsWith("P.")) {
    st.project = d === "P._" ? "" : PROJECTS[parseInt(d.split(".")[1])];
    st.waitComment = true;
    states[c] = st;
    await send(c, "ð¬ ÐÐ¾Ð¼Ð¼ÐµÐ½ÑÐ°ÑÐ¸Ð¹?\n\nÐÐ°Ð¿Ð¸ÑÐ¸ÑÐµ ÑÐµÐºÑÑ Ð¸Ð»Ð¸ /skip");
    return;
  }

  // ÐÑÑÑÑ: Ð¼ÐµÑÑÑ
  if (d.startsWith("RM.")) {
    if (d === "RM.custom") {
      states[c] = { waitReportInput: true };
      await send(c, "ð ÐÐ²ÐµÐ´Ð¸ÑÐµ:\n\nÐÐ°ÑÐ°: ÐÐ.ÐÐ.ÐÐÐÐ\nÐÐµÑÑÑ: ÐÐ.ÐÐÐÐ");
      return;
    }
    const m = parseInt(d.split(".")[1]);
    const year = new Date().getFullYear();
    await showReport(c, { month: year + "-" + String(m).padStart(2,"0") });
    return;
  }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐ¡ÐÐ ÐÐÐ¢Ð« â ÑÑÐ°ÑÑÐ¸ Ð¸Ð»Ð¸ ÐºÐ¾Ð¼Ð¼ÐµÐ½ÑÐ°ÑÐ¸Ð¹
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function afterDate(c, st) {
  if (st.type === "transfer") {
    st.waitComment = true;
    states[c] = st;
    await send(c, "ð¬ ÐÐ¾Ð¼Ð¼ÐµÐ½ÑÐ°ÑÐ¸Ð¹? (/skip)");
  } else {
    await articleMenu(c, st.type);
  }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐÐÐ¡Ð¬ Ð Ð¢ÐÐÐÐÐ¦Ð£
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function finishEntry(c, st) {
  await send(c, "â³ ÐÐ°Ð¿Ð¸ÑÑÐ²Ð°Ñ...");
  try {
    if (st.type === "transfer") {
      await callAPI({
        action: "transfer", from: st.fromAcc, to: st.toAcc,
        amount: st.amount, date: st.date, comment: st.comment || ""
      });
      await send(c, "â <b>ÐÐµÑÐµÐ²Ð¾Ð´ Ð·Ð°Ð¿Ð¸ÑÐ°Ð½!</b>\n\nð " + st.fromAcc + " â " + st.toAcc +
        "\nðµ " + st.amount + "â½\nð " + fmtDRu(st.date) +
        (st.comment ? "\nð¬ " + st.comment : ""));
    } else {
      await callAPI({
        action: "entry", account: st.account, amount: st.amount,
        article: st.article, project: st.project || "",
        date: st.date, comment: st.comment || ""
      });
      const emoji = st.type === "expense" ? "ð¸" : "ð°";
      await send(c, "â <b>ÐÐ°Ð¿Ð¸ÑÐ°Ð½Ð¾!</b>\n\n" + emoji + " " + st.amount + "â½" +
        "\nð " + st.article +
        "\nð " + (st.project || "â") +
        "\nð³ " + st.account +
        "\nð " + fmtDRu(st.date) +
        (st.comment ? "\nð¬ " + st.comment : ""));
    }
  } catch (e) { await send(c, "â ÐÑÐ¸Ð±ÐºÐ°: " + e.message); }
  delete states[c];
  await mainMenu(c);
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐÐÐÐ¡
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function showBalance(c) {
  await send(c, "â³ ÐÐ°Ð³ÑÑÐ¶Ð°Ñ...");
  try {
    const raw = await callAPI({ action: "balance" });
    const groups = JSON.parse(raw);

    let text = "ð° <b>ÐÑÑÐ°ÑÐºÐ¸ Ð¿Ð¾ ÑÑÐµÑÐ°Ð¼</b>\n";

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      text += "\n";
      
      for (const item of group) {
        const v = item.value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (item.isTotal) {
          text += "\n<b>" + item.name + ": " + v + " â½</b>\n";
        } else {
          text += item.name + ": " + v + " â½\n";
        }
      }
      
      if (gi < groups.length - 1) {
        text += "ââââââââââââââââââ\n";
      }
    }

    await send(c, text, { inline_keyboard: [[{ text: "âï¸ ÐÐµÐ½Ñ", callback_data: "MENU" }]] });
  } catch (e) { await send(c, "â ÐÑÐ¸Ð±ÐºÐ°: " + e.message); }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐ¢Ð§ÐÐ¢
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function showReport(c, params) {
  await send(c, "â³ Ð¡ÑÐ¸ÑÐ°Ñ...");
  try {
    const raw = await callAPI({ action: "report", ...params });
    const data = JSON.parse(raw);
    const period = params.date
      ? fmtDRu(params.date)
      : MONTHS_RU[parseInt(params.month.split("-")[1])] + " " + params.month.split("-")[0];

    let text = "ð <b>ÐÑÑÑÑ: " + period + "</b>\n\n";
    text += "ð° ÐÐ¾ÑÐ¾Ð´Ñ: <b>" + fmt(data.income) + " â½</b>\n";
    text += "ð¸ Ð Ð°ÑÑÐ¾Ð´Ñ: <b>" + fmt(data.expense) + " â½</b>\n";
    text += "ââââââââââââââââââ\n";
    text += "ð ÐÑÐ¸Ð±ÑÐ»Ñ: <b>" + fmt(data.profit) + " â½</b>\n";

    if (data.detailsIncome && Object.keys(data.detailsIncome).length > 0) {
      text += "\nð° <b>ÐÐ¾ÑÐ¾Ð´Ñ Ð¿Ð¾ ÑÑÐ°ÑÑÑÐ¼:</b>\n";
      for (const [art, sum] of Object.entries(data.detailsIncome).sort((a,b) => b[1]-a[1])) {
        text += "  " + art.substring(0,30) + ": " + fmt(sum) + "\n";
      }
    }

    if (data.detailsExpense && Object.keys(data.detailsExpense).length > 0) {
      text += "\nð¸ <b>Ð Ð°ÑÑÐ¾Ð´Ñ Ð¿Ð¾ ÑÑÐ°ÑÑÑÐ¼:</b>\n";
      for (const [art, sum] of Object.entries(data.detailsExpense).sort((a,b) => b[1]-a[1]).slice(0,15)) {
        text += "  " + art.substring(0,30) + ": " + fmt(sum) + "\n";
      }
    }

    await send(c, text, { inline_keyboard: [[{ text: "âï¸ ÐÐµÐ½Ñ", callback_data: "MENU" }]] });
  } catch (e) { await send(c, "â ÐÑÐ¸Ð±ÐºÐ°: " + e.message); }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// ÐÐÐÐ®
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
async function mainMenu(c) {
  await send(c, "ð <b>Ð§ÑÐ¾ ÑÐ´ÐµÐ»Ð°ÑÑ?</b>", { inline_keyboard: [
    [{ text: "ð¸ Ð Ð°ÑÑÐ¾Ð´", callback_data: "EXP" }, { text: "ð° ÐÐ¾ÑÑÑÐ¿Ð»ÐµÐ½Ð¸Ðµ", callback_data: "INC" }],
    [{ text: "ð ÐÐµÑÐµÐ²Ð¾Ð´", callback_data: "TRN" }],
    [{ text: "ð° ÐÐ°Ð»Ð°Ð½Ñ", callback_data: "BAL" }, { text: "ð ÐÑÑÑÑ", callback_data: "REP" }],
    [{text: "📊 Отчёт за год", callback_data: "YEAR"}, {text: "📥 Импорт из банка", callback_data: "IMP"}]
  ]});
}

async function accMenu(c, text) {
  const btns = [];
  for (let i = 0; i < ACCOUNTS.length; i += 2) {
    const row = [{ text: ACCOUNTS[i], callback_data: "A." + i }];
    if (i+1 < ACCOUNTS.length) row.push({ text: ACCOUNTS[i+1], callback_data: "A."+(i+1) });
    btns.push(row);
  }
  await send(c, text, { inline_keyboard: btns });
}

async function dateMenu(c) {
  const today = new Date();
  const d1 = new Date(); d1.setDate(d1.getDate()-1);
  const d2 = new Date(); d2.setDate(d2.getDate()-2);
  const d3 = new Date(); d3.setDate(d3.getDate()-3);
  await send(c, "ð <b>ÐÐ°ÑÐ° Ð¾Ð¿ÐµÑÐ°ÑÐ¸Ð¸:</b>", { inline_keyboard: [
    [{ text: "Ð¡ÐµÐ³Ð¾Ð´Ð½Ñ " + fmtDRu(fmtD(today)), callback_data: "D.today" }],
    [{ text: "ÐÑÐµÑÐ° " + fmtDRu(fmtD(d1)), callback_data: "D.yest" }],
    [{ text: fmtDRu(fmtD(d2)), callback_data: "D.2" }, { text: fmtDRu(fmtD(d3)), callback_data: "D.3" }],
    [{ text: "ð ÐÑÑÐ³Ð°Ñ Ð´Ð°ÑÐ°...", callback_data: "D.other" }]
  ]});
}

async function articleMenu(c, type) {
  const a = type === "expense" ? EXP_ARTS : INC_ARTS;
  const btns = [];
  for (let i = 0; i < a.length; i++) {
    const nm = a[i].length > 28 ? a[i].substring(0,26)+".." : a[i];
    btns.push([{ text: nm, callback_data: "R."+i }]);
  }
  await send(c, "ð <b>Ð¡ÑÐ°ÑÑÑ:</b>", { inline_keyboard: btns });
}

async function projectMenu(c) {
  const btns = [];
  for (let i = 0; i < PROJECTS.length; i += 2) {
    const row = [{ text: PROJECTS[i].substring(0,22), callback_data: "P."+i }];
    if (i+1 < PROJECTS.length) row.push({ text: PROJECTS[i+1].substring(0,22), callback_data: "P."+(i+1) });
    btns.push(row);
  }
  btns.push([{ text: "â ÐÐµÐ· Ð¿ÑÐ¾ÐµÐºÑÐ° â", callback_data: "P._" }]);
  await send(c, "ð <b>ÐÑÐ¾ÐµÐºÑ:</b>", { inline_keyboard: btns });
}

async function reportMenu(c) {
  const now = new Date();
  const m = now.getMonth() + 1;
  const btns = [];
  for (let i = 0; i < 4; i++) {
    let month = m - i;
    if (month <= 0) month += 12;
    btns.push([{ text: MONTHS_RU[month], callback_data: "RM." + month }]);
  }
  btns.push([{ text: "ð ÐÑÑÐ³Ð°Ñ Ð´Ð°ÑÐ°/Ð¼ÐµÑÑÑ...", callback_data: "RM.custom" }]);
  btns.push([{ text: "âï¸ ÐÐµÐ½Ñ", callback_data: "MENU" }]);
  await send(c, "ð <b>ÐÐ° ÐºÐ°ÐºÐ¾Ð¹ Ð¿ÐµÑÐ¸Ð¾Ð´?</b>", { inline_keyboard: btns });
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// Ð£Ð¢ÐÐÐÐ¢Ð«
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
function fmtD(d) { return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function fmtDRu(s) { if(!s) return "â"; const p=s.split("-"); return p[2]+"."+p[1]+"."+p[0]; }
function fmt(n) { return (typeof n === "number" ? n : 0).toLocaleString("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2}); }

// âââââââââââââââââââââââââââââââââââââââââââââââââââ
// HTTP Ð¡ÐÐ ÐÐÐ 
// âââââââââââââââââââââââââââââââââââââââââââââââââââ
const PORT = process.env.PORT || 3000;
// ═══════════════════════════════════════════════════
// CRON-ЗАДАЧИ
// ═══════════════════════════════════════════════════

// Импорт из банка каждую ночь в 03:00 мск
cron.schedule('0 0 3 * * *', async () => {
  console.log('[CRON] Ночной импорт из Т-Банка...');
  const result = await importOperations(1);
  console.log(`[CRON] Готово: ${result.added} строк добавлено`);
}, { timezone: 'Europe/Moscow' });

// Утренний отчёт каждый день в 09:00 мск
cron.schedule('0 0 9 * * *', async () => {
  console.log('[CRON] Утренний отчёт...');
  await morningReport({ sendMessage: (uid, msg) => send(uid, msg) }, USER_IDS);
}, { timezone: 'Europe/Moscow' });

http.createServer(async (req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try { await handleUpdate(JSON.parse(body)); }
      catch (e) { console.log("Error:", e.message); }
      res.writeHead(200); res.end("OK");
    });
  } else { res.writeHead(200); res.end("Bot v3 running! " + new Date().toISOString()); }
}).listen(PORT, () => console.log("Port " + PORT));
