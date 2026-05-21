const http = require("http");
const https = require("https");

// ═══════════════════════════════════════════════════
// НАСТРОЙКИ — ЗАМЕНИТЕ ТОКЕН ПОСЛЕ /revoke !
// ═══════════════════════════════════════════════════
const BOT_TOKEN = "8410628068:AAGseZ3UI7elPdJi_p7BqAcwXtxQ_kILTSo";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjMiUFIndgH3RVwIQjuEyQqBrwBw0peuqCIr676SdYieBAzZqmhadUXRxwl4LxMDAW/exec";
const ALLOWED = [433916681, 325532225];

// ═══════════════════════════════════════════════════
// СПРАВОЧНИКИ
// ═══════════════════════════════════════════════════

// Все счета из Справочника (столбец E)
const ACCOUNTS = [
  "Тинькоф р/с","Ключи р/с","Карта ПМЖ","Клуб ппш",
  "Тинькоф ЛиА","Резерв","usdt",
  "налоги","дима клуб ппш"
];

// Статьи расходов (из Справочника, столбец B)
const EXP_ARTS = [
  "Реклама/продвижение мероприятия",
  "Реклама и продвижение бренда (Аркадий Белецкий)",
  "Технические (сервисы, приложения)",
  "Зарплата сотрудники","Выплата руководителю",
  "Выплата контрагентам","Налоги",
  "Комиссии банков, обслуживание счета",
  "Комиссия за переводы","Комиссия за экваиринг",
  "Дизайн","Кураторы","Методологи",
  "Отдел контента","Отдел продаж","Продукт",
  "Обучение","Прочие расходы",
  "Расходы на проведение встреч","Аренда помещения/базы",
  "Расходники на мероприятие","Создания сайта",
  "юридические услуги","бухгалтерское обслуживание",
  "Интернет, мобильная связь","Транспортные расходы",
  "Возврат займов","Займы выданные","Возврат клиентам"
];

// Статьи поступлений
const INC_ARTS = [
  "Поступления от клиентов",
  "Поступления от контрагентов",
  "Займы полученные"
];

// Проекты (из Справочника, столбец G)
const PROJECTS = [
  "Клуб Перепрошитых",'Клуб "Моя жинь"',"Ключи изобилия 2026",
  "Проект Моя Жизнь","Клуб х2х10","проект Аркадий Белецкий",
  "Клуб гениальных экспертов","лена финансист",
  "Курс ключи изобилия",
  "Курс Академия Гениальных Экслертов 1 поток",
  "Курс эмоциональный мастер"
];

const MONTHS_RU = ["","Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

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

// ═══════════════════════════════════════════════════
// APPS SCRIPT
// ═══════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════
// ОБРАБОТКА ОБНОВЛЕНИЙ
// ═══════════════════════════════════════════════════
async function handleUpdate(update) {
  try {
    if (update.callback_query) {
      const c = update.callback_query.message.chat.id;
      answer(update.callback_query.id);
      if (!ALLOWED.includes(c)) return;
      await handleBtn(c, update.callback_query.data);
    } else if (update.message) {
      const c = update.message.chat.id;
      const t = (update.message.text || "").trim();
      if (!ALLOWED.includes(c)) { await send(c, "⛔ ID: " + c); return; }
      await handleText(c, t);
    }
  } catch (e) { console.log("Error:", e.message); }
}

// ═══════════════════════════════════════════════════
// ТЕКСТОВЫЕ СООБЩЕНИЯ
// ═══════════════════════════════════════════════════
async function handleText(c, t) {
  if (t === "/start" || t === "/menu") { delete states[c]; await mainMenu(c); return; }
  if (t === "/cancel") { delete states[c]; await send(c, "❌ Отменено."); await mainMenu(c); return; }

  const st = states[c];
  if (!st) { await mainMenu(c); return; }

  // Ввод даты
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
    await send(c, "❌ Формат: ДД.ММ.ГГГГ\nНапример: 15.04.2026");
    return;
  }

  // Комментарий
  if (st.waitComment) {
    st.comment = t === "/skip" ? "" : t;
    st.waitComment = false;
    await finishEntry(c, st);
    return;
  }

  // Сумма
  if (st.waitAmount) {
    const n = parseFloat(t.replace(",",".").replace(/\s/g,""));
    if (isNaN(n) || n <= 0) { await send(c, "❌ Число больше 0"); return; }
    st.amount = n;
    st.waitAmount = false;
    states[c] = st;
    await dateMenu(c);
    return;
  }

  // Дата/месяц для отчёта
  if (st.waitReportInput) {
    st.waitReportInput = false;
    const parts = t.split(".");
    if (parts.length === 3) {
      await showReport(c, { date: parts[2]+"-"+parts[1].padStart(2,"0")+"-"+parts[0].padStart(2,"0") });
    } else if (parts.length === 2) {
      await showReport(c, { month: parts[1]+"-"+parts[0].padStart(2,"0") });
    } else {
      await send(c, "❌ Формат: ДД.ММ.ГГГГ или ММ.ГГГГ");
    }
    return;
  }

  await mainMenu(c);
}

// ═══════════════════════════════════════════════════
// КНОПКИ
// ═══════════════════════════════════════════════════
async function handleBtn(c, d) {
  const st = states[c] || {};

  // Главное меню
  if (d === "EXP") { states[c] = { type: "expense" }; await accMenu(c, "💸 <b>Расход</b>\nВыберите счёт:"); return; }
  if (d === "INC") { states[c] = { type: "income" }; await accMenu(c, "💰 <b>Поступление</b>\nВыберите счёт:"); return; }
  if (d === "TRN") { states[c] = { type: "transfer" }; await accMenu(c, "🔄 <b>Перевод</b>\nОткуда:"); return; }
  if (d === "BAL") { await showBalance(c); return; }
  if (d === "REP") { await reportMenu(c); return; }
  if (d === "MENU") { delete states[c]; await mainMenu(c); return; }

  // Счёт
  if (d.startsWith("A.")) {
    const idx = parseInt(d.split(".")[1]);
    const acc = ACCOUNTS[idx];

    if (st.type === "transfer" && !st.fromAcc) {
      st.fromAcc = acc;
      states[c] = st;
      await accMenu(c, "🔄 Из: <b>" + acc + "</b>\nКуда:");
      return;
    }
    if (st.type === "transfer" && st.fromAcc) {
      if (acc === st.fromAcc) { await send(c, "❌ Тот же счёт!"); return; }
      st.toAcc = acc;
      st.waitAmount = true;
      states[c] = st;
      await send(c, "🔄 " + st.fromAcc + " → " + st.toAcc + "\n\n💵 Введите сумму:");
      return;
    }

    st.account = acc;
    st.waitAmount = true;
    states[c] = st;
    await send(c, "💳 <b>" + acc + "</b>\n\n💵 Введите сумму:");
    return;
  }

  // Дата
  if (d === "D.today") { st.date = fmtD(new Date()); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.yest") { const y = new Date(); y.setDate(y.getDate()-1); st.date = fmtD(y); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.2") { const y = new Date(); y.setDate(y.getDate()-2); st.date = fmtD(y); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.3") { const y = new Date(); y.setDate(y.getDate()-3); st.date = fmtD(y); states[c] = st; await afterDate(c, st); return; }
  if (d === "D.other") { st.waitDate = true; states[c] = st; await send(c, "📅 Введите дату:\nФормат: ДД.ММ.ГГГГ"); return; }

  // Статья
  if (d.startsWith("R.")) {
    const arts = st.type === "expense" ? EXP_ARTS : INC_ARTS;
    st.article = arts[parseInt(d.split(".")[1])];
    states[c] = st;
    await projectMenu(c);
    return;
  }

  // Проект
  if (d.startsWith("P.")) {
    st.project = d === "P._" ? "" : PROJECTS[parseInt(d.split(".")[1])];
    st.waitComment = true;
    states[c] = st;
    await send(c, "💬 Комментарий?\n\nНапишите текст или /skip");
    return;
  }

  // Отчёт: месяц
  if (d.startsWith("RM.")) {
    if (d === "RM.custom") {
      states[c] = { waitReportInput: true };
      await send(c, "📅 Введите:\n\nДата: ДД.ММ.ГГГГ\nМесяц: ММ.ГГГГ");
      return;
    }
    const m = parseInt(d.split(".")[1]);
    const year = new Date().getFullYear();
    await showReport(c, { month: year + "-" + String(m).padStart(2,"0") });
    return;
  }
}

// ═══════════════════════════════════════════════════
// ПОСЛЕ ДАТЫ → статьи или комментарий
// ═══════════════════════════════════════════════════
async function afterDate(c, st) {
  if (st.type === "transfer") {
    st.waitComment = true;
    states[c] = st;
    await send(c, "💬 Комментарий? (/skip)");
  } else {
    await articleMenu(c, st.type);
  }
}

// ═══════════════════════════════════════════════════
// ЗАПИСЬ В ТАБЛИЦУ
// ═══════════════════════════════════════════════════
async function finishEntry(c, st) {
  await send(c, "⏳ Записываю...");
  try {
    if (st.type === "transfer") {
      await callAPI({
        action: "transfer", from: st.fromAcc, to: st.toAcc,
        amount: st.amount, date: st.date, comment: st.comment || ""
      });
      await send(c, "✅ <b>Перевод записан!</b>\n\n🔄 " + st.fromAcc + " → " + st.toAcc +
        "\n💵 " + st.amount + "₽\n📅 " + fmtDRu(st.date) +
        (st.comment ? "\n💬 " + st.comment : ""));
    } else {
      await callAPI({
        action: "entry", account: st.account, amount: st.amount,
        article: st.article, project: st.project || "",
        date: st.date, comment: st.comment || ""
      });
      const emoji = st.type === "expense" ? "💸" : "💰";
      await send(c, "✅ <b>Записано!</b>\n\n" + emoji + " " + st.amount + "₽" +
        "\n📋 " + st.article +
        "\n📁 " + (st.project || "—") +
        "\n💳 " + st.account +
        "\n📅 " + fmtDRu(st.date) +
        (st.comment ? "\n💬 " + st.comment : ""));
    }
  } catch (e) { await send(c, "❌ Ошибка: " + e.message); }
  delete states[c];
  await mainMenu(c);
}

// ═══════════════════════════════════════════════════
// БАЛАНС
// ═══════════════════════════════════════════════════
async function showBalance(c) {
  await send(c, "⏳ Загружаю...");
  try {
    const raw = await callAPI({ action: "balance" });
    const groups = JSON.parse(raw);

    let text = "💰 <b>Остатки по счетам</b>\n";

    for (const group of groups) {
      text += "\n";
      for (const item of group) {
        const v = item.value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (item.isTotal) {
          text += "━━━━━━━━━━━━━━━━━━\n";
          text += "<b>" + item.name + ": " + v + " ₽</b>\n";
        } else {
          text += item.name + ": " + v + " ₽\n";
        }
      }
    }

    await send(c, text, { inline_keyboard: [[{ text: "◀️ Меню", callback_data: "MENU" }]] });
  } catch (e) { await send(c, "❌ Ошибка: " + e.message); }
}

// ═══════════════════════════════════════════════════
// ОТЧЁТ
// ═══════════════════════════════════════════════════
async function showReport(c, params) {
  await send(c, "⏳ Считаю...");
  try {
    const raw = await callAPI({ action: "report", ...params });
    const data = JSON.parse(raw);
    const period = params.date
      ? fmtDRu(params.date)
      : MONTHS_RU[parseInt(params.month.split("-")[1])] + " " + params.month.split("-")[0];

    let text = "📊 <b>Отчёт: " + period + "</b>\n\n";
    text += "💰 Доходы: <b>" + fmt(data.income) + " ₽</b>\n";
    text += "💸 Расходы: <b>" + fmt(data.expense) + " ₽</b>\n";
    text += "━━━━━━━━━━━━━━━━━━\n";
    text += "📈 Прибыль: <b>" + fmt(data.profit) + " ₽</b>\n";

    if (data.detailsIncome && Object.keys(data.detailsIncome).length > 0) {
      text += "\n💰 <b>Доходы по статьям:</b>\n";
      for (const [art, sum] of Object.entries(data.detailsIncome).sort((a,b) => b[1]-a[1])) {
        text += "  " + art.substring(0,30) + ": " + fmt(sum) + "\n";
      }
    }

    if (data.detailsExpense && Object.keys(data.detailsExpense).length > 0) {
      text += "\n💸 <b>Расходы по статьям:</b>\n";
      for (const [art, sum] of Object.entries(data.detailsExpense).sort((a,b) => b[1]-a[1]).slice(0,15)) {
        text += "  " + art.substring(0,30) + ": " + fmt(sum) + "\n";
      }
    }

    await send(c, text, { inline_keyboard: [[{ text: "◀️ Меню", callback_data: "MENU" }]] });
  } catch (e) { await send(c, "❌ Ошибка: " + e.message); }
}

// ═══════════════════════════════════════════════════
// МЕНЮ
// ═══════════════════════════════════════════════════
async function mainMenu(c) {
  await send(c, "📊 <b>Что сделать?</b>", { inline_keyboard: [
    [{ text: "💸 Расход", callback_data: "EXP" }, { text: "💰 Поступление", callback_data: "INC" }],
    [{ text: "🔄 Перевод", callback_data: "TRN" }],
    [{ text: "💰 Баланс", callback_data: "BAL" }, { text: "📊 Отчёт", callback_data: "REP" }]
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
  await send(c, "📅 <b>Дата операции:</b>", { inline_keyboard: [
    [{ text: "Сегодня " + fmtDRu(fmtD(today)), callback_data: "D.today" }],
    [{ text: "Вчера " + fmtDRu(fmtD(d1)), callback_data: "D.yest" }],
    [{ text: fmtDRu(fmtD(d2)), callback_data: "D.2" }, { text: fmtDRu(fmtD(d3)), callback_data: "D.3" }],
    [{ text: "📅 Другая дата...", callback_data: "D.other" }]
  ]});
}

async function articleMenu(c, type) {
  const a = type === "expense" ? EXP_ARTS : INC_ARTS;
  const btns = [];
  for (let i = 0; i < a.length; i++) {
    const nm = a[i].length > 28 ? a[i].substring(0,26)+".." : a[i];
    btns.push([{ text: nm, callback_data: "R."+i }]);
  }
  await send(c, "📋 <b>Статья:</b>", { inline_keyboard: btns });
}

async function projectMenu(c) {
  const btns = [];
  for (let i = 0; i < PROJECTS.length; i += 2) {
    const row = [{ text: PROJECTS[i].substring(0,22), callback_data: "P."+i }];
    if (i+1 < PROJECTS.length) row.push({ text: PROJECTS[i+1].substring(0,22), callback_data: "P."+(i+1) });
    btns.push(row);
  }
  btns.push([{ text: "— Без проекта —", callback_data: "P._" }]);
  await send(c, "📁 <b>Проект:</b>", { inline_keyboard: btns });
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
  btns.push([{ text: "📅 Другая дата/месяц...", callback_data: "RM.custom" }]);
  btns.push([{ text: "◀️ Меню", callback_data: "MENU" }]);
  await send(c, "📊 <b>За какой период?</b>", { inline_keyboard: btns });
}

// ═══════════════════════════════════════════════════
// УТИЛИТЫ
// ═══════════════════════════════════════════════════
function fmtD(d) { return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function fmtDRu(s) { if(!s) return "—"; const p=s.split("-"); return p[2]+"."+p[1]+"."+p[0]; }
function fmt(n) { return (typeof n === "number" ? n : 0).toLocaleString("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ═══════════════════════════════════════════════════
// HTTP СЕРВЕР
// ═══════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
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
