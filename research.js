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
  ["02","Scope and causal clocks","Froze the RAVEN-H3 speech-completion spec and defined feature, publication and first-trigger timestamps.","65 CPU integration checks passed across two runs.","Independent thresholds and quality."],
  ["03","First head and closed loop","28 generated tracks, 768 endpoints and 58 physical updates across two heads. Saved logical checkpoint 27.","21 complete artifacts from 24 attempts. Closed-loop smoke passed on seen LATENT and HIDDEN cases.","Three historical failures retained. Semantic success and held-out performance."],
  ["04","Second speaking event","Switched to listening, accepted a second SPEAKING event and triggered again. Collected eight expansion items.","Generation and ASR produced 28/256 supervised candidates in total. Zero additional optimizer updates.","Word-level completion and media quality across both events."],
  ["05","Auto generation and labels","Sent 24 items through the generation and ASR workflow.","First real generation: 32 blocks, five ASR exports, one first-DONE silver candidate and 31 unknowns.","Training admission and head improvement."],
  ["06","2,048 text candidates","Retained the original 256 and added 1,792 with varied length, numbers, negation, repeats and pauses.","896 new English and 896 Chinese candidates. CPU input package ready.","Generation and supervision counted in later receipts."],
  ["07","Staged generation","Stage 15 recovered to 63 ASR exports. Stage 16 reached 64. Stage 17 remained active.","972 generated items at 18:49.","One permanent failure in stage 15. Training admission."],
  ["08","STOP1034 and first-hit","Split 949 exports into 699/26/224. 383 train tracks had supervision. Matched conservative and dense on 339.","At 0.95 early LATENT stops fell 6/33 → 1/33. Misses on complete tracks rose 3/117 → 50/117.","Trade-off between early and missed stops."],
  ["09","Dense fit and held-out replay","Dense matched 339/339 training tracks. Locked LATENT dense step 20 on 26 calibration tracks.","At 0.7418575882911682, 52 exact and 64 within one block among 117 anchored tracks. Finished 24 learning-curve runs.","Independent gold boundaries for the historical silver holdout."],
  ["10","Continued weights and Speaker preflight","RAVEN updated at 18:21 and reloaded L36111/H36110. Speaker completed a one-step preflight.","Later Speaker runs covered 1,000 and 4,740 sources.","Transfer from generated to recorded audio."],
  ["11","Speaker scale and Strict","Compared 4,740 / 10,000 sources and reran paired, coupled and trajectory-only arms.","Old Content both-correct 5.47% → 14.06%; exact 8.98% → 9.38%. Strict exact 20/9/4 out of 256.","Strict pairs failed to improve first stop. Manual boundary review."],
  ["12","Ranking and thresholds","Compared completed-block scores against earlier peaks, checked codec frontier and ran Top-K.","Exact 20/256 → 31/256. Early sources 8/128 → 10/128.","4.30-point exact gain missed the 5-point gate. Early risk gate also missed."],
  ["13","Independent evidence plan","Proposed double annotation for 24 new source families. Learned slots ran 28 updates.","The pilot stopped at a pause on one held-out source at fixed 0.5.","Gold labels and generation gains."],
  ["14","Repetition counts and waits","Compared controlled words, continuous reading and generated RAVEN prefixes.","Controlled words gave one reversed-order witness and one unknown. Continuous reading gave one matched witness pair.","Two RAVEN ASRs disagreed about completion of the second utterance."],
  ["15","Adjacent prefixes and occlusion","Rechecked neighboring blocks with two ASRs and zeroed only the fixed audio window.","Both ASRs supported two utterances on the later block. The earlier block remained unknown.","Binding decision time to published PCM and online effect."],
  ["16","V2 replay and hard negatives","Replayed 64/72 tracks. Found zero eligible same-time, same-length locked pairs.","L 15/48 (3 early, 30 missed). H 15/49 (0 early, 34 missed). A1+B4 fixed one and lost one completion.","216 HIDDEN blocks late to publication. Short dev 0/4. Zero independent online first-stop checks."],
  ["17","137-entry matrix","Froze the catalog with Base, Small and human-corrected boundary views. Registered 118 checkpoint locations and 114 digests.","Bounded CPU replay repaired one missing-block track. Audited the 45/52 representation mismatch.","Separate fixed and post-hoc results. 15 + 15 + 2 BPE diagnostics need compatible replay."],
  ["18","Block diagnostics and probe","Replayed fixed thresholds for all 137 entries, audited 17 early Speaker stops, and ran one H/L update each.","63,363 Speaker labels. 208 RAVEN exports in the 14:38:20 snapshot. H/L had one train pair and zero dev.","Human RAVEN review, 36,637 Speaker labels to target, feature encoding and H/L comparison."]
];

const openItems = [
  ["Online first stop", "Align published PCM, feature-ready time and the next block’s first NFE. Check stop effect and speech completeness."],
  ["H/L content", "Need at least nine paired train prefixes from five sources, six dev prefixes from three, and witnesses for script-copy and timing shortcuts."],
  ["Data readiness", "Speaker is below 100,000 labels and has zero new encodes. RAVEN short-line has zero human quality passes."],
  ["Cross-domain boundaries", "Replay 32 entries with native BPE. Use matched content and physical prefixes to compare recorded AudioVAE and generated latents, then calibrate independently."]
];
