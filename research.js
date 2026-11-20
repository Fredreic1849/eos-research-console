"use strict";

const training = [
  ["RAVEN conservative / dense", "383 conservative tracks. Matched comparison on 339 anchored tracks. Dense uses event- and class-balanced BCE.", "Shared checkpoint 28. 20 matched steps per arm. Continued to L38515 / H38514.", "339/339 on the old training tracks. Final L/H at fixed 0.5 on Base52: 16/52 and 18/52."],
  ["RAVEN learning curves", "2 heads × 4 sizes (50, 100, 200, 339) × 3 seeds. 15 of 26 calibration tracks have anchors.", "24 random starts. Best Base52 run at fixed 0.5: LATENT seed 17, n339, step 40.", "Mean calibration gain from scaling was under one hit."],
  ["Speaker LATENT", "Fine-tuned on 1,000 / 4,740 sources, then compared mean, hardneg and progress at 4,740 / 10,000.", "Early scales ran 512 / 1937 actual steps. Four later runs saved best and last after 2000 steps each.", "Historical test200 at 0.5: exact 2.5% → 18.5%, early 87% → 66%. Base64 uses a separate denominator and still sees frequent early stops."],
  ["Content / Strict", "Native BPE with trajectory BCE, matched-prefix pairs or coupled progress. Strict excludes post-k input.", "Three Strict arms, 2000 steps each, with frozen calibration.", "Strict held-out exact: 20, 9 and 4 out of 256. Both variants reduced hits."],
  ["Top-K", "Same Strict tracks. Reweighted negative BCE toward the two highest negative losses.", "1000 actual updates against same-initialization trajectory-only at step 1000.", "Exact 20 → 31/256. Early sources 8 → 10/128. Missed both preregistered gates."],
  ["RAVEN last layer", "Frozen L38515 with 257 trainable stop parameters. Hard negatives from two sources.", "Five CPU updates across A1 and B4.", "B4 fixed one early stop and lost another completion point. Short dev: 0/4."],
  ["H/L content probe", "Shared GRU+CTC topology on the same physical prefix. One train prefix and zero dev.", "One CPU update per arm. Save and independent reload passed. Full pilot: zero updates.", "DATA_INSUFFICIENT. Content readability and online usability remain unevaluated."]
];

const logs = [
  ["02","定义任务与因果时钟","冻结 RAVEN-H3 的发言完成规范。","两轮 CPU 集成测试共通过 65 项。","独立阈值与生成质量。","分别记录特征就绪、音频发布和首次触发时刻。"],
  ["03","首版 EOS Head 与闭环","生成 28 条轨迹，得到 768 个端点。两个 Head 共更新 58 次，保存逻辑检查点 27。","24 次尝试生成 21 套完整产物。LATENT 和 HIDDEN 在已见样本上通过闭环冒烟测试。","保留 3 次历史失败。待验证语义完成与留出集表现。","在生成轨迹的端点上训练两种 Head，并分别检查停止控制。"],
  ["04","第二次发言事件","切换到聆听后接收第二次发言事件并再次触发。收集 8 个扩展样本。","生成及 ASR 共得到 28/256 个监督候选。无额外优化更新。","两次发言的词级完成与媒体质量。","在同一会话内检查第二次发言的状态重置和完成触发。"],
  ["05","自动生成与标注","把 24 个样本送入生成与 ASR 流程。","首条实际生成含 32 块、5 次 ASR 导出、1 个首次 DONE 银标候选及 31 块未知。","训练准入及 Head 是否改善。","用物理生成音频和自动转写提取首次完成候选。"],
  ["06","扩展到 2,048 条文本候选","保留原 256 条，追加 1,792 条。","新增中英文各 896 条，CPU 输入包就绪。","生成和监督数量以后续回执为准。","扩展句长、数字、否定、重复和停顿等条件。"],
  ["07","分阶段生成","第 15 阶段恢复到 63 条 ASR 导出，第 16 阶段完成 64 条，第 17 阶段仍在运行。","18:49 已生成 972 条。","第 15 阶段保留 1 条永久失败。训练准入待定。","按阶段恢复与计数，保留失败记录。"],
  ["08","STOP1034 与首次完成","将 949 条导出分为 699/26/224；其中 383 条训练轨迹有监督。在 339 条轨迹上对齐口径。","阈值 0.95 时，LATENT 早停从 6/33 降到 1/33，已完成轨迹的漏停从 3/117 升到 50/117。","早停和漏停之间的取舍。","在相同轨迹上对照保守与稠密标签。"],
  ["09","稠密拟合与留出回放","在 26 条校准轨迹上锁定 LATENT 稠密第 20 步，并完成 24 组学习曲线实验。","训练集 339/339。阈值 0.7418575882911682 下，117 条有锚点的轨迹中精确命中 52 条、±1 块命中 64 条。","历史银标留出集仍缺独立金标边界。","锁定校准阈值后再检查留出轨迹。"],
  ["10","续训权重与 Speaker 预检","RAVEN 在 18:21 更新，重新加载 L36111/H36110。Speaker 完成单步预检。","后续 Speaker 训练覆盖 1,000 和 4,740 个来源。","从生成音频迁移到真实录音的表现。","先验证保存与重新加载，再扩展真实录音训练。"],
  ["11","扩展 Speaker 与 Strict 对照","比较 4,740 和 10,000 个来源，重跑配对、进度耦合和纯轨迹方案。","旧 Content 中，两条配对都判对的比例从 5.47% 到 14.06%，精确命中从 8.98% 到 9.38%。Strict 三组分别命中 20、9、4 条，分母 256。","Strict 配对未改善首次停止，仍待人工复核边界。","对照同前缀配对、耦合进度和轨迹损失。"],
  ["12","分数排序与阈值","比较完成块与较早分数峰值，核查解码边界并运行 Top-K。","精确命中 20/256 → 31/256，早停来源 8/128 → 10/128。","精确命中增加 4.30 个百分点，低于预定的 5 个百分点。早停风险也未过门槛。","用 Top-K 强调高分负例，并检查首停风险。"],
  ["13","独立证据计划","提出双人标注 24 个新来源组。可学习槽位方案运行 28 次更新。","预检以固定 0.5 在一条留出来源的停顿处提前停止。","金标和实际生成收益。","独立来源组用于人工边界标注，另做槽位方案小规模预检。"],
  ["14","重复次数与等待","比较受控词、连续朗读以及 RAVEN 生成前缀。","受控词有一条反序证据和一条未知。连续朗读得到一对匹配证据。","两个 RAVEN ASR 对第二次发言是否完成有分歧。","用配对前缀检查重复次序和所需次数。"],
  ["15","相邻前缀与局部遮挡","用两套 ASR 复核相邻块，仅将固定音频窗口置零。","两套 ASR 均支持较晚块含两次发言。较早块仍为未知。","决策时刻与已发布 PCM 的绑定及线上效果。","以物理裁切和局部遮挡检查完成证据。"],
  ["16","V2 回放与困难负例","回放 64/72 条轨迹。同时间、同长度且满足锁定条件的配对为 0。","L 为 15/48（3 早停、30 漏停），H 为 15/49（0 早停、34 漏停）。A1+B4 修复一条，同时失去一条完成触发。","216 个 HIDDEN 块晚于发布。短开发集 0/4，独立在线首停核验 0 条。","使用 V2 区间回放，并在固定条件下检查困难负例改动。"],
  ["17","137 项检查点矩阵","冻结 Whisper Base、Small 和人工修正边界三种视图，登记 118 个检查点位置与 114 个摘要。","有限 CPU 回放补齐一条缺块轨迹，并核查 45/52 条目中的表征不一致。","固定与事后结果分别报告；15 + 15 + 2 个 BPE 诊断仍待兼容回放。","按历史检查点保存分数与阈值回放，区分表征口径。"],
  ["18","逐块诊断与探针","对全部 137 项回放固定阈值，核查 Speaker 的 17 个早停。H、L 各更新一次。","Speaker 标签 63,363 条。14:38:20 快照记录 208 项 RAVEN 导出。H/L 有 1 对训练样本，开发集为 0。","人工审核 RAVEN、补充 36,637 条 Speaker 标签到目标值、编码特征并比较 H/L。","逐块回放与错误分解，探针仅做一次计算通路验证。"],
  ["20","ASR 发言完成判断与 EOS Head 错例","解码 RAVEN 和 Speaker 的全部 2,264 个物理音频前缀，在同一批 128 条轨迹上配对比较，并单独做整轨词时间回放。","ASR 精确命中为 RAVEN 33/51、Speaker 12/17，安全首停代理为 13/27、12/17。至少一方未命中的样本中，双方都未命中为 2/25、1/14。","47 条 Speaker 轨迹缺因果目标激活标记；128 条均无性别标注；实时停止延迟待测。","Whisper Base 无目标提示，解码后做有序词匹配，主规则确认一次。对照 EOS_LATENT large_mean/best.pt 使用各自冻结阈值。"]
];

const openItems = [
  ["Online first stop", "Align published PCM, feature-ready time and the next block’s first NFE. Check stop effect and speech completeness."],
  ["H/L content", "Need at least nine paired train prefixes from five sources, six dev prefixes from three, and witnesses for script-copy and timing shortcuts."],
  ["Data readiness", "Speaker is below 100,000 labels and has zero new encodes. RAVEN short-line has zero human quality passes."],
  ["Cross-domain boundaries", "Replay 32 entries with native BPE. Use matched content and physical prefixes to compare recorded AudioVAE and generated latents, then calibrate independently."]
];
