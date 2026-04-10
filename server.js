const http = require("http");
const https = require("https");

// ═══════════════════════════════════════════════════
// НАСТРОЙКИ
// ═══════════════════════════════════════════════════
const BOT_TOKEN = "8410628068:AAGseZ3UI7elPdJi_p7BqAcwXtxQ_kILTSo";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjMiUFIndgH3RVwIQjuEyQqBrwBw0peuqCIr676SdYieBAzZqmhadUXRxwl4LxMDAW/exec";
const ALLOWED = [433916681, 325532225];

const ACCOUNTS = ["Тинькоф ЛиА", "usdt", "Резерв", "Клуб ппш"];
const ALL_ACCOUNTS = ["Тинькоф ЛиА","usdt","Резерв","Клуб ппш","Тинькоф р/с","Карта ПМЖ","дима клуб ппш"];
const EXP_ARTS = ["Реклама/продвижение мероприятия","Реклама и продвижение бренда","Технические (сервисы, приложения)","Зарплата сотрудники","Выплата руководителю","Выплата контрагентам","Налоги","Комиссии банков","Комиссия за переводы","Дизайн","Кураторы","Продукт","Обучение","Прочие расходы"];
const INC_ARTS = ["Поступления от клиентов","Поступления от контрагентов","Займы полученные"];
const PROJECTS = ["Клуб Перепрошитых",'Клуб "Моя жинь"',"Ключи изобилия 2026","Проект Моя Жизнь","Клуб х2х10","проект Аркадий Белецкий","Клуб гениальных экспертов","лена финансист"];

// ═══════════════════════════════════════════════════
// СОСТОЯНИЕ (в памяти — мгновенный доступ)
// ═══════════════════════════════════════════════════
const states = {};

// ═══════════════════════════════════════════════════
// TELEGRAM API
// ═══════════════════════════════════════════════════
function tg(method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve(d));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function send(chatId, text, kb) {
  const d = { chat_id: chatId, text };
  if (kb) d.reply_markup = kb;
  return tg("sendMessage", d);
}

function answer(cbId) {
  return tg("answerCallbackQuery", { callback_query_id: cbId });
}

// ═══════════════════════════════════════════════════
// ЗАПИСЬ В ТАБЛИЦУ (через Apps Script)
// ═══════════════════════════════════════════════════
function writeToSheet(data) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams(data).toString();
    const url = APPS_SCRIPT_URL + "?" + params;

    function followRedirects(targetUrl) {
      https.get(targetUrl, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          followRedirects(res.headers.location);
        } else {
          let d = "";
          res.on("data", c => d += c);
          res.on("end", () => resolve(d));
        }
      }).on("error", reject);
    }

    followRedirects(url);
  });
}

// ═══════════════════════════════════════════════════
// ОБРАБОТКА ОБНОВЛЕНИЙ
// ═══════════════════════════════════════════════════
async function handleUpdate(update) {
  try {
    if (update.callback_query) {
      const c = update.callback_query.message.chat.id;
      const d = update.callback_query.data;
      answer(update.callback_query.id);
      if (!ALLOWED.includes(c)) return;
      await handleBtn(c, d);
    } else if (update.message) {
      const c = update.message.chat.id;
      const t = (update.message.text || "").trim();
      if (!ALLOWED.includes(c)) { await send(c, "⛔ ID: " + c); return; }
      await handleText(c, t);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

async function handleText(c, t) {
  if (t === "/start" || t === "/menu") {
    delete states[c];
    await mainMenu(c);
    return;
  }
  if (t === "/cancel") {
    delete states[c];
    await send(c, "❌ Отменено.");
    await mainMenu(c);
    return;
  }

  const st = states[c];

  // Ожидаем комментарий
  if (st && st.waitComment) {
    st.waitComment = false;
    const comment = t === "/skip" ? "" : t;
    await finishEntry(c, st, comment);
    return;
  }

  // Ожидаем сумму
  if (st && st.waitAmount) {
    const n = parseFloat(t.replace(",", ".").replace(/\s/g, ""));
    if (isNaN(n) || n <= 0) {
      await send(c, "❌ Введите число больше 0");
      return;
    }
    st.waitAmount = false;

    if (st.type === "transfer") {
      st.amount = n;
      st.waitComment = true;
      states[c] = st;
      await send(c, "💬 Комментарий? (/skip)");
    } else {
      st.amount = n;
      const arts = st.type === "expense" ? EXP_ARTS : INC_ARTS;
      const btns = arts.map((a, i) => [{
        text: a.length > 30 ? a.substring(0, 28) + ".." : a,
        callback_data: "R." + i
      }]);
      await send(c, "📋 Статья:", { inline_keyboard: btns });
    }
    return;
  }

  await mainMenu(c);
}

async function handleBtn(c, d) {
  // Главное меню
  if (d === "EXP") { states[c] = { type: "expense" }; await accMenu(c, "💸 Расход.\nСчёт:"); return; }
  if (d === "INC") { states[c] = { type: "income" }; await accMenu(c, "💰 Поступление.\nСчёт:"); return; }
  if (d === "TRN") { states[c] = { type: "transfer" }; await allAccMenu(c, "🔄 Откуда?", "TF"); return; }

  const st = states[c] || {};

  // Счёт (расход/поступление)
  if (d.startsWith("A.")) {
    st.accIdx = parseInt(d.split(".")[1]);
    st.waitAmount = true;
    states[c] = st;
    await send(c, "💳 " + ACCOUNTS[st.accIdx] + "\n💵 Введите сумму:");
    return;
  }

  // Статья
  if (d.startsWith("R.")) {
    const arts = st.type === "expense" ? EXP_ARTS : INC_ARTS;
    st.artIdx = parseInt(d.split(".")[1]);
    states[c] = st;
    const btns = PROJECTS.map((p, i) => [{ text: p, callback_data: "P." + i }]);
    btns.push([{ text: "— Без проекта —", callback_data: "P._" }]);
    await send(c, "📁 Проект:", { inline_keyboard: btns });
    return;
  }

  // Проект → комментарий
  if (d.startsWith("P.")) {
    const projPart = d.split(".")[1];
    st.projIdx = projPart === "_" ? -1 : parseInt(projPart);
    st.waitComment = true;
    states[c] = st;
    await send(c, "💬 Комментарий? (/skip)");
    return;
  }

  // Перевод: откуда
  if (d.startsWith("TF.")) {
    st.fromIdx = parseInt(d.split(".")[1]);
    states[c] = st;
    await allAccMenu(c, "📤 " + ALL_ACCOUNTS[st.fromIdx] + "\nКуда?", "TT");
    return;
  }

  // Перевод: куда
  if (d.startsWith("TT.")) {
    const toIdx = parseInt(d.split(".")[1]);
    if (toIdx === st.fromIdx) { await send(c, "❌ Тот же счёт!"); return; }
    st.toIdx = toIdx;
    st.waitAmount = true;
    states[c] = st;
    await send(c, "🔄 " + ALL_ACCOUNTS[st.fromIdx] + " → " + ALL_ACCOUNTS[st.toIdx] + "\n💵 Введите сумму:");
    return;
  }
}

async function finishEntry(c, st, comment) {
  if (st.type === "transfer") {
    await send(c, "⏳ Записываю...");
    try {
      await writeToSheet({
        action: "transfer",
        from: ALL_ACCOUNTS[st.fromIdx],
        to: ALL_ACCOUNTS[st.toIdx],
        amount: st.amount,
        comment: comment
      });
      await send(c, "✅ Перевод записан!\n🔄 " + ALL_ACCOUNTS[st.fromIdx] + " → " + ALL_ACCOUNTS[st.toIdx] + "\n💵 " + st.amount + "₽" + (comment ? "\n💬 " + comment : ""));
    } catch (e) {
      await send(c, "❌ Ошибка: " + e.message);
    }
  } else {
    const acc = ACCOUNTS[st.accIdx];
    const arts = st.type === "expense" ? EXP_ARTS : INC_ARTS;
    const article = arts[st.artIdx];
    const project = st.projIdx >= 0 ? PROJECTS[st.projIdx] : "";
    const emoji = st.type === "expense" ? "💸 Расход" : "💰 Поступление";

    await send(c, "⏳ Записываю...");
    try {
      await writeToSheet({
        action: "entry",
        account: acc,
        amount: st.amount,
        article: article,
        project: project,
        comment: comment
      });
      await send(c, "✅ Записано!\n" + emoji + "\n💵 " + st.amount + "₽\n📋 " + article + "\n📁 " + (project || "—") + "\n💳 " + acc + (comment ? "\n💬 " + comment : ""));
    } catch (e) {
      await send(c, "❌ Ошибка: " + e.message);
    }
  }
  delete states[c];
  await mainMenu(c);
}

async function mainMenu(c) {
  await send(c, "📊 Что записать?", { inline_keyboard: [
    [{ text: "💸 Расход", callback_data: "EXP" }],
    [{ text: "💰 Поступление", callback_data: "INC" }],
    [{ text: "🔄 Перевод", callback_data: "TRN" }]
  ]});
}

async function accMenu(c, text) {
  const btns = ACCOUNTS.map((a, i) => [{ text: a, callback_data: "A." + i }]);
  await send(c, text, { inline_keyboard: btns });
}

async function allAccMenu(c, text, prefix) {
  const btns = ALL_ACCOUNTS.map((a, i) => [{ text: a, callback_data: prefix + "." + i }]);
  await send(c, text, { inline_keyboard: btns });
}

// ═══════════════════════════════════════════════════
// HTTP СЕРВЕР
// ═══════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const update = JSON.parse(body);
        await handleUpdate(update);
      } catch (e) {
        console.log("Error:", e.message);
      }
      res.writeHead(200);
      res.end("OK");
    });
  } else {
    res.writeHead(200);
    res.end("Bot is running! " + new Date().toISOString());
  }
});

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
