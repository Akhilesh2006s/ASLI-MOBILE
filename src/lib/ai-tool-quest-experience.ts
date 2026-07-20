/**
 * Unexpected "Study Portal" experience for AI tool WebView output —
 * holographic quest nodes, orbit rail, aurora field, interactive unlocks.
 */

export const AI_TOOL_QUEST_STYLES = `
@keyframes quest-aurora{
  0%{transform:translate3d(-6%,-4%,0) scale(1);opacity:.55}
  50%{transform:translate3d(8%,6%,0) scale(1.18);opacity:.85}
  100%{transform:translate3d(-6%,-4%,0) scale(1);opacity:.55}
}
@keyframes quest-shimmer{
  0%{background-position:0% 50%}
  100%{background-position:200% 50%}
}
@keyframes quest-pulse{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.04)}
}
@keyframes quest-float{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-4px)}
}
@keyframes quest-stamp{
  0%{transform:scale(1.4) rotate(-12deg);opacity:0}
  60%{transform:scale(.92) rotate(-8deg);opacity:1}
  100%{transform:scale(1) rotate(-8deg);opacity:1}
}
.quest-field{position:relative;isolation:isolate;padding:4px 2px 18px}
.quest-field::before,.quest-field::after{
  content:"";position:absolute;inset:-20% -10% auto;height:220px;border-radius:999px;filter:blur(42px);z-index:0;pointer-events:none;animation:quest-aurora 9s ease-in-out infinite
}
.quest-field::before{background:radial-gradient(circle,rgba(139,92,246,.45),transparent 68%)}
.quest-field::after{left:35%;background:radial-gradient(circle,rgba(14,165,233,.38),transparent 70%);animation-delay:-4s}
.quest-orbit{
  position:sticky;top:0;z-index:30;display:flex;gap:8px;overflow-x:auto;padding:8px 4px 12px;margin:0 0 10px;
  -webkit-overflow-scrolling:touch;scrollbar-width:none
}
.quest-orbit::-webkit-scrollbar{display:none}
.quest-orbit-btn{
  flex:0 0 auto;border:1px solid rgba(255,255,255,.7);
  background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(255,255,255,.55));
  color:#0f172a;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:.02em;
  box-shadow:0 8px 24px rgba(15,23,42,.08);white-space:nowrap
}
.quest-orbit-btn.is-active{color:#fff;border-color:transparent;background:linear-gradient(135deg,var(--c,#8b5cf6),#312e81)}
.quest-stamp{
  position:absolute;right:10px;top:10px;z-index:5;width:74px;height:74px;border-radius:999px;
  border:3px dashed var(--quest,#8b5cf6);color:var(--quest,#8b5cf6);
  display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:900;
  letter-spacing:.08em;text-transform:uppercase;line-height:1.15;transform:rotate(-8deg);
  background:rgba(255,255,255,.55);animation:quest-stamp .7s cubic-bezier(.2,1.4,.4,1) both;
  pointer-events:none
}
.quest-node{
  --quest:#8b5cf6;--quest-deep:#6d28d9;
  position:relative;z-index:1;margin:0 0 14px;border-radius:22px;overflow:hidden;
  border:1px solid rgba(255,255,255,.72);
  background:
    linear-gradient(135deg,rgba(255,255,255,.08),transparent 42%),
    linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.42));
  box-shadow:0 18px 40px rgba(15,23,42,.1), inset 0 1px 0 rgba(255,255,255,.75);
  transition:transform .22s ease,box-shadow .22s ease
}
.quest-node[open]{transform:translateY(-1px);box-shadow:0 22px 48px rgba(15,23,42,.14)}
.quest-node::before{
  content:"";position:absolute;inset:0 auto 0 0;width:7px;
  background:linear-gradient(180deg,var(--quest),var(--quest-deep));
}
.quest-node::after{
  content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;
  background:linear-gradient(110deg,transparent 20%,rgba(255,255,255,.55) 48%,transparent 72%);
  background-size:220% 100%;animation:quest-shimmer 4.8s linear infinite
}
.quest-summary{
  list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;
  padding:14px 16px 14px 18px;user-select:none;-webkit-user-select:none
}
.quest-summary::-webkit-details-marker{display:none}
.quest-orb{
  width:48px;height:48px;border-radius:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:900;font-size:15px;letter-spacing:-.02em;
  background:linear-gradient(145deg,var(--quest),var(--quest-deep));
  box-shadow:0 10px 22px rgba(15,23,42,.18);animation:quest-pulse 2.8s ease-in-out infinite
}
.quest-copy{min-width:0;flex:1}
.quest-kicker{
  display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--quest-deep)
}
.quest-kicker span.dot{width:6px;height:6px;border-radius:99px;background:var(--quest);animation:quest-float 2.2s ease-in-out infinite}
.quest-title{margin-top:2px;font-size:15px;line-height:1.3;font-weight:800;color:#0f172a}
.quest-hint{font-size:11px;font-weight:700;color:#64748b;white-space:nowrap}
.quest-node[open] .quest-hint{color:var(--quest-deep)}
.quest-body{
  padding:0 14px 14px 18px;color:#334155;position:relative;z-index:1;
  border-top:1px solid rgba(255,255,255,.55);
  background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.55))
}
.quest-body>*:first-child{margin-top:12px}
.ai-tool-q-card{
  position:relative;overflow:hidden;border-radius:18px!important;
  background:
    radial-gradient(120px 80px at 0% 0%,rgba(139,92,246,.18),transparent 70%),
    linear-gradient(160deg,rgba(255,255,255,.82),rgba(255,255,255,.42))!important;
  box-shadow:0 12px 28px rgba(15,23,42,.08)!important
}
.ai-tool-q-card::before{
  content:"";position:absolute;right:-18px;top:-18px;width:70px;height:70px;border-radius:24px;transform:rotate(18deg);
  background:linear-gradient(135deg,rgba(255,255,255,.7),transparent);opacity:.8
}
.ai-tool-hero-card{
  border-radius:26px!important;overflow:hidden!important;
  border:1px solid rgba(255,255,255,.7)!important;
  background:
    radial-gradient(circle at 12% 18%,rgba(139,92,246,.22),transparent 42%),
    radial-gradient(circle at 88% 0%,rgba(14,165,233,.18),transparent 40%),
    linear-gradient(145deg,rgba(255,255,255,.86),rgba(255,255,255,.42))!important;
  box-shadow:0 24px 50px rgba(15,23,42,.12)!important
}

/* —— Inner quest content (opened bodies) —— */
.quest-body{font-size:15px;line-height:1.55}
.quest-body p{margin:.45rem 0;color:#334155}
.quest-body .prose p{margin:.5rem 0}
.quest-bullets,.quest-checks,.quest-steps,.quest-materials{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.quest-bullet{
  display:flex;gap:10px;align-items:flex-start;
  padding:10px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(255,255,255,.42));
  border:1px solid rgba(255,255,255,.75);box-shadow:0 6px 16px rgba(15,23,42,.04)
}
.quest-bullet-orb{
  width:10px;height:10px;margin-top:6px;border-radius:99px;flex-shrink:0;
  background:var(--quest,#8b5cf6);box-shadow:0 0 0 4px rgba(139,92,246,.12)
}
.quest-bullet-text{flex:1;min-width:0;color:#1e293b;font-weight:500;white-space:pre-wrap}
.quest-check{
  display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(255,255,255,.45));
  border:1px solid rgba(255,255,255,.8);border-left:4px solid var(--quest,#8b5cf6)
}
.quest-check-mark{
  width:22px;height:22px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#8b5cf6),var(--quest-deep,#6d28d9));color:#fff;font-size:12px;font-weight:900
}
.quest-step{display:flex;gap:12px;align-items:flex-start;position:relative;padding:4px 0 10px 2px}
.quest-step:not(:last-child)::before{
  content:"";position:absolute;left:15px;top:34px;bottom:0;width:2px;
  background:linear-gradient(180deg,var(--quest,#8b5cf6),rgba(148,163,184,.25))
}
.quest-step-num{
  width:30px;height:30px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#8b5cf6),var(--quest-deep,#6d28d9));
  color:#fff;font-size:12px;font-weight:900;z-index:1;box-shadow:0 8px 16px rgba(15,23,42,.12)
}
.quest-step-text{flex:1;padding-top:5px;color:#334155;font-weight:500}
.quest-material{
  display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;
  background:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.8);border-left:4px solid var(--quest,#f59e0b)
}
.quest-material-num{
  width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#f59e0b),var(--quest-deep,#b45309));color:#fff;font-size:11px;font-weight:900
}
.quest-term-grid{display:grid;gap:10px}
.quest-term{
  border-radius:16px;padding:12px 14px;position:relative;overflow:hidden;
  background:linear-gradient(160deg,rgba(255,255,255,.88),rgba(255,255,255,.48));
  border:1px solid rgba(255,255,255,.8);box-shadow:0 10px 22px rgba(15,23,42,.06)
}
.quest-term::before{
  content:"";position:absolute;left:0;top:0;bottom:0;width:5px;
  background:linear-gradient(180deg,var(--quest,#8b5cf6),var(--quest-deep,#6d28d9))
}
.quest-term-title{margin:0;padding-left:8px;font-size:14px;font-weight:800;color:#0f172a}
.quest-term-body{margin:6px 0 0;padding-left:8px;font-size:13px;line-height:1.5;color:#475569}
.quest-q{
  --quest:#8b5cf6;--quest-deep:#6d28d9;
  position:relative;overflow:hidden;border-radius:18px;margin:0 0 12px;padding:14px;
  background:
    radial-gradient(120px 70px at 0% 0%,rgba(139,92,246,.16),transparent 70%),
    linear-gradient(160deg,rgba(255,255,255,.9),rgba(255,255,255,.5));
  border:1px solid rgba(255,255,255,.85);border-left:5px solid var(--quest);
  box-shadow:0 12px 28px rgba(15,23,42,.07)
}
.quest-q-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px}
.quest-q-badge{
  display:inline-flex;align-items:center;justify-content:center;min-width:2rem;height:26px;padding:0 10px;
  border-radius:999px;background:linear-gradient(135deg,var(--quest),var(--quest-deep));
  color:#fff;font-size:11px;font-weight:900;letter-spacing:.02em
}
.quest-q-meta{display:flex;flex-wrap:wrap;gap:6px}
.quest-pill{
  display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;
  font-size:10px;font-weight:800;background:rgba(241,245,249,.95);color:#475569;border:1px solid rgba(226,232,240,.9)
}
.quest-pill-amber{background:#fffbeb;color:#92400e;border-color:#fde68a}
.quest-pill-violet{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe}
.quest-q-prompt,.quest-q-text{margin:0;font-size:15px;line-height:1.45;font-weight:650;color:#0f172a}
.quest-options{display:grid;gap:8px;margin-top:12px}
@media (min-width:640px){.quest-options{grid-template-columns:1fr 1fr}}
.quest-option{
  display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:14px;
  background:rgba(255,255,255,.82);border:1px solid rgba(226,232,240,.95);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9)
}
.quest-option-letter{
  width:26px;height:26px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#8b5cf6),var(--quest-deep,#6d28d9));
  color:#fff;font-size:11px;font-weight:900
}
.quest-option-text{flex:1;min-width:0;padding-top:3px;font-size:13px;line-height:1.4;color:#334155;font-weight:500}
.quest-answer{
  margin-top:12px;padding:10px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(255,255,255,.55),rgba(255,255,255,.85));
  border:1px solid rgba(255,255,255,.9);border-left:4px solid var(--quest)
}
.quest-answer-label,.quest-explain-label{
  display:inline-block;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
  color:var(--quest-deep,#6d28d9);margin-bottom:4px
}
.quest-answer p,.quest-explain p{margin:0;font-size:13px;line-height:1.45;color:#1e293b;font-weight:600}
.quest-explain{
  margin-top:8px;padding:10px 12px;border-radius:14px;
  background:rgba(248,250,252,.9);border:1px dashed rgba(148,163,184,.45)
}
.quest-explain-label{color:#64748b}
.quest-story-q{
  display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;padding:12px;
  border-radius:16px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.85);
  border-left:4px solid var(--quest)
}
.quest-story-num{
  width:28px;height:28px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest),var(--quest-deep));color:#fff;font-size:12px;font-weight:900
}
.quest-story-q p{margin:0;padding-top:3px;font-size:14px;line-height:1.45;color:#1e293b;font-weight:500}
`;

export const AI_TOOL_QUEST_BOOTSTRAP = `
(function(){
  try{
    var palette = ['#8b5cf6','#0ea5e9','#f59e0b','#f43f5e','#6366f1','#06b6d4','#f97316','#d946ef','#3b82f6','#14b8a6'];
    var deep = ['#6d28d9','#0369a1','#b45309','#be123c','#4338ca','#0e7490','#c2410c','#a21caf','#1d4ed8','#0f766e'];
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.quest-node'));
    if(!nodes.length){
      var legacy = Array.prototype.slice.call(document.querySelectorAll('section.ai-tool-section-card'));
      legacy.forEach(function(sec, i){
        var header = sec.querySelector('header');
        if(!header) return;
        var titleEl = header.querySelector('h4,h3');
        var labelEl = header.querySelector('p');
        var details = document.createElement('details');
        details.className = 'quest-node';
        details.style.setProperty('--quest', palette[i%10]);
        details.style.setProperty('--quest-deep', deep[i%10]);
        if(i < 2) details.open = true;
        var summary = document.createElement('summary');
        summary.className = 'quest-summary';
        summary.innerHTML = '<div class="quest-orb">'+(i+1)+'</div><div class="quest-copy"><div class="quest-kicker"><span class="dot"></span>'+(labelEl?labelEl.textContent:'Quest')+'</div><div class="quest-title">'+(titleEl?titleEl.textContent:'Section')+'</div></div><div class="quest-hint">Tap</div>';
        var bodyWrap = document.createElement('div');
        bodyWrap.className = 'quest-body';
        var kids = sec.children;
        for (var k = 0; k < kids.length; k++) {
          if (kids[k] !== header) bodyWrap.appendChild(kids[k].cloneNode(true));
        }
        details.appendChild(summary);
        details.appendChild(bodyWrap);
        sec.parentNode.insertBefore(details, sec);
        sec.remove();
      });
      nodes = Array.prototype.slice.call(document.querySelectorAll('.quest-node'));
    }
    if(!nodes.length) return;

    var field = document.createElement('div');
    field.className = 'quest-field';
    var first = nodes[0];
    var parent = first.parentNode;
    parent.insertBefore(field, first);
    nodes.forEach(function(n){ field.appendChild(n); });

    var stamp = document.createElement('div');
    stamp.className = 'quest-stamp';
    stamp.style.setProperty('--quest', palette[0]);
    stamp.innerHTML = 'Portal<br/>Unlocked';
    field.insertBefore(stamp, field.firstChild);

    var orbit = document.createElement('div');
    orbit.className = 'quest-orbit';
    orbit.setAttribute('aria-label','Jump between quests');
    nodes.forEach(function(n, i){
      var title = (n.querySelector('.quest-title') || {}).textContent || ('Quest '+(i+1));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quest-orbit-btn';
      btn.style.setProperty('--c', getComputedStyle(n).getPropertyValue('--quest').trim() || palette[i%10]);
      btn.textContent = (i+1)+' · '+String(title).trim().slice(0,22);
      btn.addEventListener('click', function(){
        n.open = true;
        n.scrollIntoView({behavior:'smooth', block:'start'});
        Array.prototype.forEach.call(orbit.children, function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
      if(i===0) btn.classList.add('is-active');
      orbit.appendChild(btn);
    });
    field.insertBefore(orbit, stamp.nextSibling);

    nodes.forEach(function(n, i){
      n.addEventListener('toggle', function(){
        if(!n.open) return;
        Array.prototype.forEach.call(orbit.children, function(b, bi){ b.classList.toggle('is-active', bi===i); });
      });
    });
  }catch(e){}
})();
`;

export function wrapQuestExperience(bodyHtml: string): string {
  return `${bodyHtml}
<script>${AI_TOOL_QUEST_BOOTSTRAP}</script>`;
}
