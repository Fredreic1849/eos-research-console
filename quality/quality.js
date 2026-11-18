"use strict";

const byId = (id) => document.getElementById(id);
const tag = (kind, text, cls) => {
  const node = document.createElement(kind);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const states = {silver:"Auto silver", proxy:"Replay proxy", reviewed:"Human upper bound", unknown:"UNKNOWN", pending:"Pending", error:"Error"};
const durationBins = ["0–<1 s", "1–<2 s", "2–<3 s", "3–<5 s", "5–<8 s", "≥8 s"];
const timeBins = ["0–<1 s", "1–<2 s", "2–<4 s", "4–<6 s", "6–<10 s", "10–<15 s", "≥15 s"];
const formatCount = (n) => n.toLocaleString("en-US");
const percentage = (n, total) => total ? `${(100*n/total).toFixed(total >= 10000 ? 2 : 1)}%` : "—";
const totalCells = (cells, test=()=>true) => cells.reduce((n,c)=>n+(test(c)?c.at(-1):0),0);
const dvalue = (span) => span?.length===2 && span[1]>span[0] ? [1,2,3,5,8].filter((edge)=>span[1]-span[0]>=edge).length : -1;
const filterIds = ["q-domain","q-batch","q-duration","q-status"];
const batchCopy = {
  "raven-production": ["Short-line production", "Generated · 18 Nov", "Target span from ASR on the first confirmed physical prefix. DONE uses the native block end."],
  "speaker-new": ["New alignments", "Recorded · 18 Nov", "CTC span and final-word ±100 ms from the original file clock."],
  "speaker-historical": ["Historical training labels", "Recorded · historical", "Existing silver labels and source-time alignment intervals."],
  "raven-eval": ["Base52 replay", "Generated · frozen eval", "64 media items from 72 slots, including one human upper bound. Block times use replay proxies."],
  "speaker-eval": ["Base64 replay", "Recorded · frozen eval", "64 source videos from test200. Whisper Base span and proxy block end."]
};
const batchTitle = (batch) => batchCopy[batch.id]?.[0] ?? batch.title;

function initFilters(batches, change) {
  byId("q-duration").replaceChildren(new Option("All",""), ...durationBins.map((x,i)=>new Option(x,i)), new Option("No verified span",-1));
  byId("q-status").replaceChildren(new Option("All",""), ...Object.entries(states).map(([k,v])=>new Option(v,k)));
  const updateBatches = () => {
    const domain = byId("q-domain").value;
    const options = batches.filter((b)=>!domain || b.domain===domain);
    const selected = byId("q-batch").value;
    byId("q-batch").replaceChildren(new Option("All",""),...options.map((b)=>new Option(batchTitle(b),b.id)));
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
  byId(id).replaceChildren(n ? chart : tag("p","No records match the filters."));
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
    byId("q-scope").textContent=groups.length === 1 ? batchTitle(groups[0]) : domain ? `${domain} · all batches` : "All batches";
    byId("q-n").textContent=formatCount(n);
    byId("q-known").textContent=`${formatCount(value)} / ${formatCount(n)}`;
    byId("q-missing").textContent=percentage(n-value,n);
    byId("q-state").textContent=`${formatCount(uncertain)} / ${formatCount(n)}`;
    byId("q-playable").textContent=`${formatCount(totalCells(samples))} / ${formatCount(n)}`;
    byId("label-note").textContent=`${formatCount(flagged)} / ${formatCount(n)} flagged at the boundary. Flags can coexist with silver labels.`;
    byId("done-note").textContent=`Native block time for ${formatCount(done)} / ${formatCount(n)}.`;
    byId("interval-note").textContent=`Source-time silver interval for ${formatCount(interval)} / ${formatCount(n)}.`;
    showChart("speech-chart",[...durationBins.map((x,i)=>[x,totalCells(cells,c=>c[2]===i)]),["No duration",n-value,true]],n);
    showChart("status-chart",Object.entries(states).map(([k,v])=>[v,totalCells(cells,c=>c[1]===k),["unknown","error","pending"].includes(k)]),n);
    for (const [id,group,title] of [["done-chart",native,"Production DONE"],["proxy-chart",proxy,"Replay target"]]){
      const size=totalCells(group), node=byId(id);
      node.hidden=!size;
      if(!size) continue;
      showChart(id,[...timeBins.map((x,i)=>[x,totalCells(group,c=>c[3]===i)]),["No block time",totalCells(group,c=>c[3]<0),true]],size);
      node.prepend(tag("p",`${title} · ${formatCount(size)} records`));
    }
    showChart("interval-chart",timeBins.map((x,i)=>[x,totalCells(cells,c=>c[4]===i)]),interval);
    if(!interval) byId("interval-chart").replaceChildren(tag("p","No training alignment intervals in this selection."));
    const grid=byId("batch-grid");
    grid.replaceChildren(...groups.map((b)=>{
      const card=tag("article"), info=tag("div"), dl=tag("dl");
      const [, source, note]=batchCopy[b.id] ?? ["",b.source,b.note];
      info.append(tag("h3",batchTitle(b)),tag("small",source),tag("p",note));
      for(const [k,v] of [["Records",totalCells(b.cells,match)],["Batch sources",b.sources],["Local coverage",totalCells(b.sample_cells,match)]]){
        const node=tag("div");node.append(tag("dt",k),tag("dd",formatCount(v)));dl.append(node);
      }
      const pick=tag("button","Select batch","button secondary");pick.type="button";
      pick.addEventListener("click",()=>{byId("q-domain").value=b.domain; updateBatches();byId("q-batch").value=b.id;draw();byId("q-batch").focus();});
      card.append(info,dl,pick);
      return card;
    }));
  };
  const updateBatches=initFilters(data.batches,draw);
  byId("snapshot").textContent=`Snapshot ${data.at.slice(0,19).replace("T"," ")} · Beijing time`;
  const status=data.raven_status;
  byId("quality-notes").textContent=`RAVEN production receipt: ${status.complete_exports} exports, ${status.quarantined} quarantined, ${status.postprocess_failed} postprocess failures and ${status.human_quality_accepted} human quality passes. The manifest is a frozen file scan. RAVEN replay has media for 64 of 72 slots. Speaker covers ${formatCount(data.speaker_sources)} unique sources. Its manifest counts selected labels only. Combined charts show coverage across different timing protocols.`;
  draw();
  byId("loading").hidden=true;
  byId("dashboard").hidden=false;
}
if(byId("dashboard")){
  fetch("data.json").then((response)=>{
    if(!response.ok) throw new Error("HTTP "+response.status);
    return response.json();
  }).then(renderData).catch(()=>{byId("loading").textContent="Could not load data. Refresh to retry.";});
}
