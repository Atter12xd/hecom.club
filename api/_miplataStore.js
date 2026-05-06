/**
 * Almacén en memoria (globalThis) para MiPlata en /finanzas-personales.
 * Los datos sobreviven mientras la instancia serverless siga caliente; no reemplaza una DB.
 */
var crypto = require("crypto");

function getStore() {
  var g = globalThis;
  if (!g.__MIPLATA_STORE_V1__) {
    g.__MIPLATA_STORE_V1__ = {
      debts: [],
      loans: [],
      expenses: [],
      incomes: [],
      budgets: [],
    };
  }
  return g.__MIPLATA_STORE_V1__;
}

function parseNum(x) {
  var n = Number(x);
  return isFinite(n) ? n : 0;
}

function monthKey(dateStr) {
  return String(dateStr || "").slice(0, 7);
}

function inRange(dateStr, from, to) {
  if (!from || !to) return true;
  var d = String(dateStr || "");
  return d >= String(from) && d <= String(to);
}

/** Próximos pagos (tarjeta del dashboard): préstamos activos con fecha. */
function buildNextPayments(st) {
  var out = [];
  (st.loans || []).forEach(function (row) {
    if (String(row.status) !== "activo") return;
    var d = String(row.nextPaymentDate || "").trim();
    if (!d) return;
    out.push({
      id: row.id,
      lenderName: row.lenderName || "Préstamo",
      nextPaymentDate: d,
      monthlyPayment: parseNum(row.monthlyPayment),
    });
  });
  out.sort(function (a, b) {
    return String(a.nextPaymentDate).localeCompare(String(b.nextPaymentDate));
  });
  return out.slice(0, 30);
}

function buildSummary(from, to) {
  var st = getStore();
  var monthlyIncome = {};
  var monthlyExpenses = {};
  var expensesByCategory = {};
  var totalIncome = 0;
  var totalExpenses = 0;

  (st.incomes || []).forEach(function (row) {
    if (!inRange(row.date, from, to)) return;
    var a = parseNum(row.amount);
    totalIncome += a;
    var mk = monthKey(row.date);
    monthlyIncome[mk] = (monthlyIncome[mk] || 0) + a;
  });

  (st.expenses || []).forEach(function (row) {
    if (!inRange(row.date, from, to)) return;
    var a = parseNum(row.amount);
    totalExpenses += a;
    var mk = monthKey(row.date);
    monthlyExpenses[mk] = (monthlyExpenses[mk] || 0) + a;
    var cat = row.category || "Otros";
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + a;
  });

  var totalDebtsPending = 0;
  var pendingDebtsCount = 0;
  (st.debts || []).forEach(function (row) {
    if (String(row.status) === "pagado") return;
    totalDebtsPending += parseNum(row.amount);
    pendingDebtsCount += 1;
  });

  var totalLoansRemaining = 0;
  var activeLoansCount = 0;
  (st.loans || []).forEach(function (row) {
    if (String(row.status) !== "activo") return;
    totalLoansRemaining += parseNum(row.remainingAmount);
    activeLoansCount += 1;
  });

  return {
    expensesByCategory: expensesByCategory,
    monthlyExpenses: monthlyExpenses,
    monthlyIncome: monthlyIncome,
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    totalDebtsPending: totalDebtsPending,
    pendingDebtsCount: pendingDebtsCount,
    totalLoansRemaining: totalLoansRemaining,
    activeLoansCount: activeLoansCount,
    balance: totalIncome - totalExpenses,
    nextPayments: buildNextPayments(st),
  };
}

function newId() {
  return crypto.randomUUID();
}

module.exports = {
  getStore: getStore,
  buildSummary: buildSummary,
  newId: newId,
};
