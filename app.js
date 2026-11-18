"use strict";

const el = (id) => document.getElementById(id);
const make = (tag, value, className) => {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  if (className) element.className = className;
  return element;
};

for (const values of training) {
  const row = make("tr");
  row.append(...values.map((value) => make("td", value)));
  el("training-body").append(row);
}
for (const [title, note] of openItems) {
  const card = make("article");
  card.append(make("h3", title), make("p", note));
  el("open-grid").append(card);
}

const dayLinks = new Map();
for (const [day] of [...logs].reverse()) {
  const anchor = make("a", `11-${day}`);
  anchor.href = `#day-2026-11-${day}`;
  anchor.setAttribute("aria-label", `2026 年 11 月 ${day} 日`);
  el("days").append(anchor);
  dayLinks.set(day, anchor);
}
function showDay(day) {
  const entry = logs.find(([date]) => date === day) || logs.at(-1);
  const [date, title, work, result, open] = entry;
  const timestamp = make("time", `2026-11-${date}`);
  timestamp.dateTime = timestamp.textContent;
  const facts = make("dl");
  for (const [label, text] of [["工作", work], ["产出与结果", result], ["未核验", open]]) {
    facts.append(make("dt", label), make("dd", text));
  }
  el("day").replaceChildren(timestamp, make("h3", title), facts);
  dayLinks.forEach((link, key) => {
    if (key === date) link.setAttribute("aria-current", "date");
    else link.removeAttribute("aria-current");
  });
}
function updateRoute() {
  const hash = location.hash || "#overview";
  const date = hash.match(/^#day-2026-11-(\d{2})$/);
  if (date && dayLinks.has(date[1])) {
    showDay(date[1]);
    el("log").scrollIntoView();
  }
  const active = date || hash === "#log" ? "#log" : ["#evaluation", "#thresholds"].includes(hash) ? "#evaluation"
    : ["#model", "#supervision", "#families", "#model-sources", "#training"].includes(hash) ? "#model" : "#overview";
  document.querySelectorAll(".site-nav a[data-section]").forEach((link) => {
    if (link.hash === active) link.setAttribute("aria-current", active === "#overview" ? "page" : "location");
    else link.removeAttribute("aria-current");
  });
}
showDay(logs.at(-1)[0]);
addEventListener("hashchange", updateRoute);
updateRoute();

const modes = [
  ["fixed", "统一 0.5"],
  ["reference", "参考 0.07"],
  ["ravenFixed", "同阈值 0.01494821608"],
  ["historical", "各自历史阈值"],
  ["best", "事后最高"],
  ["safe", "事后零提前最高"]
];
const domains = {raven: "RAVEN · Base52", speaker: "Speaker · Base64"};
const domain = el("domain"), mode = el("mode"), family = el("family");
const search = el("search"), matched = el("matched");
let models = [], page = 0;
let selection = null, points = [];
const pageSize = 12;
const cache = new Map();

function format(value) {
  if (value === null || value === undefined) return "NA";
  if (value !== 0 && Math.abs(value) < 0.0001) return value.toExponential(7);
  return Number.isInteger(value) ? String(value) : Number(value.toPrecision(11)).toString();
}
function setModes() {
  const selected = mode.value;
  mode.replaceChildren(...modes
    .filter(([key]) => domain.value === "raven" || key !== "ravenFixed")
    .map(([key, title]) => new Option(title, key)));
  if (Array.from(mode.options).some((item) => item.value === selected)) mode.value = selected;
}
async function requestJSON(file) {
  const response = await fetch(file);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function render() {
  const query = search.value.toLowerCase().trim();
  const candidates = models.filter((model) =>
    (!matched.checked || model.matched) &&
    (!family.value || family.value === model.family) &&
    (!query || [model.id, model.family, model.head, model.step, model.checkpoint].some(
      (value) => String(value).toLowerCase().includes(query))));
  const scored = candidates.map((model) => [model, model[domain.value][mode.value]]);
  const rate = (m) => m[2] ? m[3] / m[2] : -1;
  scored.sort((a, b) => rate(b[1]) - rate(a[1]) || a[1][4] - b[1][4] || a[0].id.localeCompare(b[0].id));
  const pageCount = Math.max(1, Math.ceil(scored.length / pageSize));
  page = Math.min(page, pageCount - 1);
  const rows = scored.slice(page * pageSize, (page + 1) * pageSize).map(([model, m]) => {
    const row = make("tr");
    const label = make("td");
    const button = make("button", model.id, "name");
    button.type = "button";
    button.setAttribute("aria-label", `查看 ${model.id} 的逐阈值回放`);
    button.addEventListener("click", () => selectCurve(model, true));
    label.append(button, make("small", `${model.head} · ${model.checkpoint || "checkpoint 未记录"} · 连续 ${model.consecutive || 1} 块`, "weight"));
    const tag = make("td");
    tag.append(make("span", model.matched ? "一致" : "跨表示诊断", model.matched ? "flag" : "flag diag"));
    if (m[7]) tag.append(make("small", `UNKNOWN ${m[7]}`, "weight"));
    const outcome = m[2] ? `${m[3]} / ${m[2]} · ${(100 * rate(m)).toFixed(1)}%` : "NA";
    const values = [format(model.step), format(m[0]), outcome, ...m.slice(4, 7).map(format)];
    row.append(label, ...values.map((value) => make("td", value, "num")), tag);
    return row;
  });
  if (!rows.length) {
    const empty = make("td", "没有匹配的模型。");
    empty.colSpan = 8;
    const row = make("tr");
    row.append(empty);
    rows.push(row);
  }
  el("results").replaceChildren(...rows);
  el("count").textContent = `${scored.length} 条 · 可评分 ${scored.filter(([, m]) => m[2]).length} 条`;
  el("page").textContent = `${page + 1} / ${pageCount} 页`;
  el("previous").disabled = page === 0;
  el("next").disabled = page >= pageCount - 1;
}

for (const input of [mode, family, matched, search]) {
  input.addEventListener(input === search ? "input" : "change", () => {
    page = 0;
    render();
  });
}
el("previous").onclick = () => { page -= 1; render(); };
el("next").onclick = () => { page += 1; render(); };
domain.onchange = () => {
  page = 0;
  setModes();
  render();
  el("curve-data").href = `curves-${domain.value}.json`;
  if (selection) selectCurve(selection);
};

function renderThreshold() {
  const [prob, logit, n, hit, early, late, miss, unknown] = points[Number(el("threshold").value)];
  const stats = [["命中", hit, "hit"], ["提前", early, "early"], ["迟停", late, "late"], ["未触发", miss, "miss"]];
  el("tau").textContent = `τ ${format(prob)} · logit ${format(logit)}`;
  const bar = el("curve-bar");
  bar.replaceChildren(...stats.filter(([, value]) => value > 0).map(([, value, color]) => {
    const segment = make("i", undefined, color);
    segment.style.flex = String(value);
    return segment;
  }));
  bar.setAttribute("aria-label", `可判 ${n} 条，${stats.map(([label, value]) => `${label} ${format(value)}`).join("，")}`);
  el("curve-legend").replaceChildren(...stats.map(([label, value, color]) => {
    const item = make("span");
    item.append(make("i", undefined, color), `${label} ${format(value)} / ${n}`);
    return item;
  }));
  if (unknown) el("curve-legend").append(make("span", `另有 UNKNOWN ${unknown} 条`));
}
el("threshold").addEventListener("input", renderThreshold);

let curveRequest = 0;
async function selectCurve(model, scroll = false) {
  const request = ++curveRequest;
  const group = domain.value;
  selection = model;
  el("curve").hidden = true;
  el("curve-state").textContent = "正在读取逐阈值数据…";
  if (scroll) el("thresholds").scrollIntoView();
  try {
    if (!cache.has(group)) cache.set(group, requestJSON(`curves-${group}.json`));
    const data = await cache.get(group);
    if (request !== curveRequest) return;
    points = data[model.id] || [];
    if (!points.length) {
      el("curve-state").textContent = `${domains[group]} 暂无该权重的兼容阈值回放。`;
      return;
    }
    const [probability, storedLogit] = model[group][mode.value];
    const target = storedLogit ?? (probability === null ? 0 : Math.log(probability / (1 - probability)));
    const nearest = points.reduce((best, point, index) =>
      Math.abs(point[1] - target) < Math.abs(points[best][1] - target) ? index : best, 0);
    el("threshold").max = String(points.length - 1);
    el("threshold").value = String(nearest);
    el("curve-model").textContent = `${model.id} · ${domains[group]}${model.matched ? "" : " · 跨表示诊断"}`;
    el("curve").hidden = false;
    el("curve-state").textContent = `共 ${points.length} 个已保存阈值点。滑杆按 logit 点位排序。`;
    renderThreshold();
  } catch {
    cache.delete(group);
    if (request === curveRequest) el("curve-state").textContent = "逐阈值数据未能载入，可再次选择版本重试。";
  }
}

setModes();
requestJSON("models.json").then((data) => {
  models = data;
  const families = [...new Set(models.map((model) => model.family))].sort();
  family.append(...families.map((name) => new Option(name, name)));
  render();
}).catch(() => { el("load-error").hidden = false; });
