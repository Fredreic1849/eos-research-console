"use strict";

const byId = (id) => document.getElementById(id);
const tag = (kind, text, cls) => {
  const node = document.createElement(kind);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const states = {silver:"自动银标", proxy:"评测代理", reviewed:"人工完成上界", unknown:"UNKNOWN", pending:"待标注", error:"记录异常"};
const durationBins = ["0–<1 秒", "1–<2 秒", "2–<3 秒", "3–<5 秒", "5–<8 秒", "≥8 秒"];
const timeBins = ["0–<1 秒", "1–<2 秒", "2–<4 秒", "4–<6 秒", "6–<10 秒", "10–<15 秒", "≥15 秒"];
const formatCount = (n) => n.toLocaleString("zh-CN");
const percentage = (n, total) => total ? `${(100*n/total).toFixed(total >= 10000 ? 2 : 1)}%` : "—";
const totalCells = (cells, test=()=>true) => cells.reduce((n,c)=>n+(test(c)?c.at(-1):0),0);
const dvalue = (span) => span?.length===2 && span[1]>span[0] ? [1,2,3,5,8].filter((edge)=>span[1]-span[0]>=edge).length : -1;
const filterIds = ["q-domain","q-batch","q-duration","q-status"];

function initFilters(batches, change) {
  byId("q-duration").replaceChildren(new Option("全部",""), ...durationBins.map((x,i)=>new Option(x,i)), new Option("无可核验跨度",-1));
  byId("q-status").replaceChildren(new Option("全部",""), ...Object.entries(states).map(([k,v])=>new Option(v,k)));
  const updateBatches = () => {
    const domain = byId("q-domain").value;
    const options = batches.filter((b)=>!domain || b.domain===domain);
    const selected = byId("q-batch").value;
    byId("q-batch").replaceChildren(new Option("全部",""),...options.map((b)=>new Option(b.title,b.id)));
    if (options.some((b)=>b.id===selected)) byId("q-batch").value=selected;
  };
  updateBatches();
  filterIds.forEach((id)=>byId(id).addEventListener("change",()=>{
    if(id==="q-domain") updateBatches();
    change();
  }));
  return updateBatches;
}
function activeFilters() { return filterIds.map((id)=>byId(id).value); }
function showChart(id, rows, n) {
  const chart=tag("div",undefined,"hist");
  for(const [label,count,missing] of rows){
    const row=tag("div",undefined,missing?"hist-row missing":"hist-row");
    const track=tag("span",undefined,"track");
    const fill=tag("i");
    fill.style.width=percentage(count,n);
    track.setAttribute("aria-hidden","true");
    track.append(fill);
    row.append(tag("span",label),track,tag("strong",formatCount(count)));
    chart.append(row);
  }
  byId(id).replaceChildren(n ? chart : tag("p","当前分组没有记录。"));
}
function renderData(data) {
  const draw=()=>{
    const [domain,batch,duration,status]=activeFilters();
    const match=(c)=>(duration==="" || c[2]===Number(duration)) && (!status || c[1]===status);
    const groups=data.batches.filter((b)=>(!domain || b.domain===domain) && (!batch || batch===b.id));
    const cells=groups.flatMap((b)=>b.cells.filter(match));
    const samples=groups.flatMap((b)=>b.sample_cells.filter(match));
    const n=totalCells(cells);
    const value=totalCells(cells,c=>c[2]>=0);
    const native=cells.filter(c=>c[0]==="raven-production");
    const proxy=cells.filter(c=>c[0]==="raven-eval" || c[0]==="speaker-eval");
    const done=totalCells(cells,c=>c[3]>=0);
    const interval=totalCells(cells,c=>c[4]>=0);
    const uncertain=totalCells(cells,c=>c[1]==="unknown" || c[1]==="error" || c[1]==="pending");
    const flagged=totalCells(cells,c=>c[5]);
    byId("q-scope").textContent=batch ? groups[0]?.title || "当前筛选" : domain ? `${domain} 全部批次` : "全部批次";
    byId("q-n").textContent=formatCount(n)+" 条";
    byId("q-known").textContent=`${formatCount(value)} / ${formatCount(n)}`;
    byId("q-missing").textContent=percentage(n-value,n);
    byId("q-state").textContent=`${formatCount(uncertain)} / ${formatCount(n)}`;
    byId("q-playable").textContent=`${formatCount(totalCells(samples))} / ${formatCount(n)}`;
    byId("label-note").textContent=`含边界标记的记录 ${formatCount(flagged)} / ${formatCount(n)}。标记可与银标并存。`;
    byId("done-note").textContent=`${formatCount(done)} / ${formatCount(n)} 条有原生块时间。`;
    byId("interval-note").textContent=`${formatCount(interval)} / ${formatCount(n)} 条有银标区间，按原片时间计。`;
    showChart("speech-chart",[...durationBins.map((x,i)=>[x,totalCells(cells,c=>c[2]===i)]),["缺时长",n-value,true]],n);
    showChart("status-chart",Object.entries(states).map(([k,v])=>[v,totalCells(cells,c=>c[1]===k),["unknown","error","pending"].includes(k)]),n);
    for (const [id,group,title] of [["done-chart",native,"生产首次确认"],["proxy-chart",proxy,"离线代理应停"]]){
      const size=totalCells(group), node=byId(id);
      node.hidden=!size;
      if(!size) continue;
      showChart(id,[...timeBins.map((x,i)=>[x,totalCells(group,c=>c[3]===i)]),["无块时间",totalCells(group,c=>c[3]<0),true]],size);
      node.prepend(tag("p",`${title} · ${formatCount(size)} 条`));
    }
    showChart("interval-chart",timeBins.map((x,i)=>[x,totalCells(cells,c=>c[4]===i)]),interval);
    if(!interval) byId("interval-chart").replaceChildren(tag("p","当前范围没有训练对齐区间。"));
    const grid=byId("batch-grid");
    grid.replaceChildren(...groups.map((b)=>{
      const card=tag("article"), info=tag("div"), dl=tag("dl");
      info.append(tag("h3",b.title),tag("small",b.source),tag("p",b.note));
      for(const [k,v] of [["当前记录",totalCells(b.cells,match)],["原批次来源",b.sources],["私有覆盖",totalCells(b.sample_cells,match)]]){
        const node=tag("div");node.append(tag("dt",k),tag("dd",formatCount(v)));dl.append(node);
      }
      const pick=tag("button","筛选此批次","button secondary");pick.type="button";
      pick.addEventListener("click",()=>{byId("q-domain").value=b.domain; updateBatches();byId("q-batch").value=b.id;draw();byId("q-batch").focus();});
      card.append(info,dl,pick);
      return card;
    }));
  };
  const updateBatches=initFilters(data.batches,draw);
  byId("snapshot").textContent=`生产快照 ${data.at.slice(0,19).replace("T"," ")}（北京时间）`;
  const status=data.raven_status;
  byId("quality-notes").textContent=`RAVEN 生产状态回执记录 ${status.complete_exports} 份完整导出、${status.quarantined} 隔离、${status.postprocess_failed} 后处理失败、人工通过 ${status.human_quality_accepted}；清单快照按冻结读取的文件集合统计。RAVEN 评测计划 72 槽，64 条有媒体，缺失 8/72。Speaker 合并清单覆盖 ${formatCount(data.speaker_sources)} 个去重来源；新旧来源可重叠。合并清单只含入选训练标签，拒收和未尝试记录没有同口径分母。各批次时长轴不同，合并只用于清点覆盖。`;
  draw();
  byId("loading").hidden=true;
  byId("dashboard").hidden=false;
}
if(byId("dashboard")){
  fetch("data.json").then((response)=>{
    if(!response.ok) throw new Error("HTTP "+response.status);
    return response.json();
  }).then(renderData).catch(()=>{byId("loading").textContent="聚合数据加载失败，请刷新重试。";});
}
