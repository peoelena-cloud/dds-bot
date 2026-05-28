// tbank.js — импорт из Т-Банк Business API + утренний отчёт
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const TBANK_TOKEN     = process.env.TBANK_TOKEN;
const FIXIE_URL       = process.env.FIXIE_URL;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL
  || "https://script.google.com/macros/s/AKfycbzLFoUYvY6qDpF9QYj3zrPMIFq6KDpYw39BvuMPp2KKrqhx6F8qs3hVKYwKYt5b8w/exec";

// Правильный базовый URL T-Bank Business API
const TBANK_BASE = "https://business.tinkoff.ru/openapi";

const ACCOUNTS = [
  { number: '40802810300001801095', name: 'Тинькоф р/с'   },
  { number: '40802810800002568206', name: 'Карта ПМЖ'     },
  { number: '40802810500001791264', name: 'дима клуб ппш' },
];

// ─── Запрос через Fixie ───────────────────────────────────────────────────────
async function tbankFetch(url) {
  const options = {
    headers: {
      'Authorization': `Bearer ${TBANK_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (FIXIE_URL) {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    options.agent = new HttpsProxyAgent(FIXIE_URL);
  }
  console.log(`[TBank] GET ${url}`);
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`T-Bank API ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

// ─── Диапазон дат ─────────────────────────────────────────────────────────────
function getDateRange(daysAgo = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const from = new Date(d); from.setHours(0, 0, 0, 0);
  const to   = new Date(d); to.setHours(23, 59, 59, 999);
  // T-Bank ожидает формат ISO без миллисекунд
  const fmt = (dt) => dt.toISOString().slice(0, 19) + '+03:00';
  return { from: fmt(from), to: fmt(to), date: d };
}

// ─── Маппинг операции ─────────────────────────────────────────────────────────
function mapOperation(op, accountName) {
  // typeOfOperation: "Debit" = расход, "Credit" = поступление
  const typeOfOp = op.typeOfOperation || '';
  const category = op.category || '';
  const signIncome = typeOfOp === 'Credit';

  const rawAmount = op.operationAmount ?? op.amount ?? op.sum ?? 0;
  const amount    = Math.abs(parseFloat(rawAmount));
  const desc      = (op.description || op.paymentPurpose || op.purpose || op.merchantName || '').trim();
  const opDate    = (op.operationDate || op.date || op.executionDate || '').slice(0, 10);
  const opId      = op.operationId || op.id || op.externalOperationId || '';

  // Пропускаем нулевые операции
  if (amount === 0) return null;

  // selfTransfer — перемещение между своими счетами
  if (/selfTransfer/i.test(category)) {
    return { opId, date: opDate, account: accountName,
             amount, type: typeOfOp === 'Credit' ? 'Поступление' : 'Расход',
             dds: 'Перемещение средств', project: '', comment: desc };
  }

  // Карта ПМЖ: пропускаем Продамус
  if (accountName === 'Карта ПМЖ') {
    if (/prodamus|продамус/i.test(desc)) return null;
  }

  // Определяем проект
  let project = '';
  if (accountName === 'Тинькоф р/с') {
    if (/система|getcourse|геткурс/i.test(desc)) project = 'Ключи изобилия 2026';
  }
  if (accountName === 'дима клуб ппш') project = 'Клуб Перепрошитых';

  // Статья ДДС по category из T-Bank
  let ddsStat;
  if (signIncome) {
    // Поступления
    if (category === 'incomePeople')    ddsStat = 'Поступления от клиентов';
    else if (category === 'contragentPeople') ddsStat = 'Поступления от контрагентов';
    else                                ddsStat = 'Прочие поступления';
  } else {
    // Расходы
    if (category === 'fee')                   ddsStat = 'Комиссия за переводы';
    else if (category === 'contragentPeople') ddsStat = 'Выплата контрагентам';
    else if (/налог|fns|ифнс/i.test(desc))   ddsStat = 'Налоги';
    else if (category === 'taxPeople' || category === 'tax') ddsStat = 'Налоги';
    else                                      ddsStat = 'Прочие расходы';
  }

  return { opId, date: opDate, account: accountName,
           amount, type: signIncome ? 'Поступление' : 'Расход',
           dds: ddsStat, project, comment: desc };
}

// ─── Отправка строки в Apps Script ───────────────────────────────────────────
async function sendToSheet(row) {
  const params = new URLSearchParams({
    action: 'entry', date: row.date, account: row.account,
    amount: row.amount, article: row.dds, project: row.project,
    comment: `[API] ${row.comment}`, opId: row.opId,
  });
  const res = await fetch(`${APPS_SCRIPT_URL}?${params}`);
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed !== 'OK' && trimmed !== 'duplicate') {
    console.log(`[TBank] Apps Script ответил: ${trimmed.slice(0, 100)}`);
  }
  return trimmed;
}

// ─── Получить список счетов из API ───────────────────────────────────────────
async function getAccountList() {
  const data = await tbankFetch(`${TBANK_BASE}/api/v1/company/accounts`);
  return Array.isArray(data) ? data : (data.accounts || data.payload || []);
}

// ─── Получить выписку по счёту ────────────────────────────────────────────────
async function getStatement(accountNumber, from, to) {
  // Новый эндпоинт T-Bank Business API (openapi/api/v1/statement)
  const url = `${TBANK_BASE}/api/v1/statement?accountNumber=${accountNumber}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const data = await tbankFetch(url);
  // Новый API: { payload: { operation: [...] } }
  // Старый API: { payload: { operation: [...] } } или массив напрямую
  const payload = data.payload || data;
  if (Array.isArray(payload)) return payload;
  const ops = payload.operation || payload.operations || payload.items || [];
  // Пагинация: если есть nextCursor — логируем (пока не реализуем)
  if (payload.nextCursor) {
    console.log(`[TBank] Внимание: есть ещё операции (nextCursor), загружена только первая порция`);
  }
  return ops;
}

// ─── Импорт операций ─────────────────────────────────────────────────────────
async function importOperations(daysAgo = 1) {
  const { from, to, date } = getDateRange(daysAgo);
  const dateStr = date.toLocaleDateString('ru-RU');
  let totalAdded = 0, errors = [], added = [];

  for (const acc of ACCOUNTS) {
    try {
      const ops = await getStatement(acc.number, from, to);
      console.log(`[TBank] ${acc.name}: ${ops.length} операций`);


      for (const op of ops) {
        const row = mapOperation(op, acc.name);
        if (!row) continue;
        try {
          const result = await sendToSheet(row);
          if (result.trim() === 'duplicate') {
            // пропускаем дубль
          } else {
            totalAdded++;
            added.push({
              date: row.date,
              account: row.account,
              amount: row.amount,
              type: row.type,
              comment: row.comment.slice(0, 40),
            });
          }
        } catch (e) { errors.push(`Запись: ${e.message}`); }
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      errors.push(`${acc.name}: ${e.message}`);
      console.error(`[TBank] ${acc.name}:`, e.message);
    }
  }
  return { date: dateStr, added: totalAdded, rows: added, errors };
}

// ─── Получить отчёт из Apps Script ───────────────────────────────────────────
async function fetchReport(params) {
  const qs  = new URLSearchParams({ action: 'report', ...params });
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`);
  return res.text();
}

// ─── Утренний авто-отчёт ─────────────────────────────────────────────────────
async function morningReport(bot, userIds) {
  try {
    const imp = await importOperations(1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const raw  = await fetchReport({ date: dateStr });
    const data = JSON.parse(raw);

    const msg =
      `🌅 <b>Доброе утро! Итоги ${imp.date}</b>\n\n` +
      `💰 Доходы: <b>${fmtMoney(data.income)} ₽</b>\n` +
      `💸 Расходы: <b>${fmtMoney(data.expense)} ₽</b>\n` +
      `──────────────────\n` +
      `📈 Прибыль: <b>${fmtMoney(data.profit)} ₽</b>\n\n` +
      `📥 Загружено из банка: ${imp.added} операций` +
      (imp.errors.length ? `\n⚠️ Ошибок: ${imp.errors.length}` : '');

    for (const uid of userIds) {
      await bot.sendMessage(uid, msg);
    }
  } catch (e) {
    console.error('[morningReport] Ошибка:', e.message);
  }
}

function fmtMoney(n) {
  return (typeof n === 'number' ? n : 0)
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { importOperations, fetchReport, morningReport };
