// tbank.js — модуль импорта операций + утренний отчёт
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const TBANK_TOKEN     = process.env.TBANK_TOKEN;
const FIXIE_URL       = process.env.FIXIE_URL;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

const ACCOUNTS = [
  { number: '40802810300001801095', name: 'Тинькоф р/с'   },
  { number: '40802810800002568206', name: 'Карта ПМЖ'     },
  { number: '40802810500001791264', name: 'дима клуб ппш' },
];

// ─── Прокси-запрос через Fixie ───────────────────────────────────────────────
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
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`T-Bank API ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Диапазон дат ──────────────────────────────────────────────────────────
function getDateRange(daysAgo = 1) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const from = new Date(d); from.setHours(0, 0, 0, 0);
  const to   = new Date(d); to.setHours(23, 59, 59, 999);
  const fmt  = (dt) => dt.toISOString().replace('Z', '+03:00');
  return { from: fmt(from), to: fmt(to), date: d };
}

// ─── Маппинг операции ──────────────────────────────────────────────────────
function mapOperation(op, accountName) {
  const rawAmount = op.operationAmount ?? op.amount ?? 0;
  const amount    = parseFloat(rawAmount);
  const isIncome  = amount > 0;
  const desc      = (op.description || op.merchantName || '').trim();
  const opDate    = (op.operationDate || op.date || '').slice(0, 10);
  const opId      = op.operationId || op.id || '';

  if (accountName === 'Карта ПМЖ') {
    if (/prodamus|продамус/i.test(desc)) return null;
  }

  let project = '';
  if (accountName === 'Тинькоф р/с') {
    if (/система|getcourse|геткурс/i.test(desc)) project = 'Ключи изобилия 2026';
  }
  if (accountName === 'дима клуб ппш') project = 'Клуб Перепрошитых';

  let ddsStat = isIncome ? 'Прочие поступления' : 'Прочие расходы';
  if (!isIncome && /налог|fns|ифнс/i.test(desc)) ddsStat = 'Налоги';

  return { opId, date: opDate, account: accountName,
           amount: Math.abs(amount), type: isIncome ? 'Поступление' : 'Расход',
           dds: ddsStat, project, comment: desc };
}

// ─── Отправка строки в Apps Script ───────────────────────────────────────────
async function sendToSheet(row) {
  const params = new URLSearchParams({
    action: 'entry', date: row.date, account: row.account,
    amount: row.amount, type: row.type, dds: row.dds,
    project: row.project, comment: `[API] ${row.comment}`, opId: row.opId,
  });
  const res = await fetch(`${APPS_SCRIPT_URL}?${params}`);
  return res.text();
}

// ─── Импорт операций за N дней назад ─────────────────────────────────────────
async function importOperations(daysAgo = 1) {
  const { from, to, date } = getDateRange(daysAgo);
  const dateStr = date.toLocaleDateString('ru-RU');
  let totalFetched = 0, totalAdded = 0, errors = [];

  for (const acc of ACCOUNTS) {
    try {
      const url  = `https://business.tinkoff.ru/openapi/api/v1/statement/${acc.number}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const data = await tbankFetch(url);
      const ops  = Array.isArray(data) ? data : (data.payload || data.operations || []);
      totalFetched += ops.length;

      for (const op of ops) {
        const row = mapOperation(op, acc.name);
        if (!row) continue;
        try { await sendToSheet(row); totalAdded++; } catch (e) { errors.push(e.message); }
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (e) {
      errors.push(`${acc.name}: ${e.message}`);
    }
  }
  return { date: dateStr, fetched: totalFetched, added: totalAdded, errors };
}

// ─── Получить отчёт из Apps Script ───────────────────────────────────────────
async function fetchReport(params) {
  const qs  = new URLSearchParams({ action: 'report', ...params });
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`);
  return res.text();
}

// ─── Утренний авто-отчёт (вызывается из cron в server.js) ────────────────────
async function morningReport(bot, userIds) {
  try {
    // 1. Сначала импортируем вчерашние операции
    const imp = await importOperations(1);

    // 2. Запрашиваем отчёт за вчера
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD
    const report  = await fetchReport({ date: dateStr });

    const msg =
      `🌅 Доброе утро! Итоги ${imp.date}\n\n` +
      `${report}\n\n` +
      `📥 Загружено из банка: ${imp.added} операций` +
      (imp.errors.length ? `\n⚠️ Ошибок: ${imp.errors.length}` : '');

    for (const uid of userIds) {
      await bot.sendMessage(uid, msg, { parse_mode: 'Markdown' });
    }
  } catch (e) {
    console.error('[morningReport] Ошибка:', e.message);
  }
}

module.exports = { importOperations, fetchReport, morningReport };
