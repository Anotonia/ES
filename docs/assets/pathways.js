(() => {
  "use strict";

  const KEY = "eslab-missions-v1";
  const LEVELS = ["A1","A2","B1","B2"];
  let attempts = {};
  let activeScene = null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) attempts = raw;
  } catch (_) { attempts = {}; }

  const escape = value => String(value == null ? "" : value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const stat = key => attempts[key] || {tries:0,correct:false,lastChoice:-1};
  const keyFor = (sceneId,turn) => sceneId + "::" + turn;
  function save() {
    try {localStorage.setItem(KEY, JSON.stringify(attempts));} catch (_) {}
  }
  function sceneComplete(s) {
    return Boolean(s?.mission?.decisions?.length) &&
      s.mission.decisions.every((_,i) => stat(keyFor(s.id,i)).correct);
  }
  function renderTracks(tracks,scenarios) {
    if (!tracks?.length) return "";
    return tracks.map((track,index)=>{
      const stages=LEVELS.map(level=>scenarios.find(s=>s.track===track.id&&s.level===level));
      const complete=stages.filter(sceneComplete).length;
      return '<article class="pathway-card '+(track.domain==="school"?"path-school":"")+'">' +
        '<div class="pathway-top"><span class="pathway-index">PATH '+String(index+1).padStart(2,"0")+
        ' · '+escape(track.domain==="school"?"学校重点":"生活应用")+'</span><span class="pathway-progress">'+complete+'/4 任务完成</span></div>'+
        '<h3>'+escape(track.title)+'</h3><p class="pathway-subtitle">'+escape(track.subtitle)+'</p>'+
        '<p class="pathway-desc">'+escape(track.description)+'</p>'+
        '<div class="pathway-levels">'+stages.map((scene,i)=>scene ?
          '<a class="pathway-level '+(sceneComplete(scene)?"completed":"")+'" href="#/detail/'+escape(scene.id)+
          '" aria-label="'+escape(scene.level+" · "+scene.title)+'" title="'+escape(scene.title)+'">'+
          '<strong>'+scene.level+'</strong><small>'+escape(scene.title)+'</small><span>'+(sceneComplete(scene)?"✓":"↗")+'</span></a>':
          '<span class="pathway-level unavailable">'+LEVELS[i]+' · 待编写</span>'
        ).join('')+'</div></article>';
    }).join("");
  }
  function orderedChoices(decision,sceneId,decisionIndex) {
    const choices=decision.choices.map((choice,index)=>({...choice,_choiceIndex:index}));
    const offset=(sceneId.length+decisionIndex)%choices.length;
    return choices.slice(offset).concat(choices.slice(0,offset));
  }
  function renderMission(scene) {
    if (!scene.mission?.decisions?.length) return "";
    activeScene=scene;
    const decisions=scene.mission.decisions;
    const correct=decisions.filter((_,i)=>stat(keyFor(scene.id,i)).correct).length;
    let cards = "";
    for (let i=0;i<decisions.length;i++) {
      const turn=decisions[i],saved=stat(keyFor(scene.id,i));
      const priorDone=i===0||stat(keyFor(scene.id,i-1)).correct;
      if (!priorDone) {
        cards += '<div class="mission-locked">步骤 '+(i+1)+' · 回答上一个问题后解锁</div>';
        continue;
      }
      cards += '<div class="mission-turn"><span class="mission-step">突发情况 '+(i+1)+' / '+decisions.length+
        '</span><p class="mission-situation">'+escape(turn.situation)+'</p>'+
        '<h4>'+escape(turn.prompt)+'</h4><div class="mission-choices">'+orderedChoices(turn,scene.id,i).map(choice=>
        '<button type="button" class="mission-choice '+(saved.lastChoice===choice._choiceIndex?(saved.correct?"chosen-right":"chosen-wrong"):"")+
        '" data-path-choice="'+escape(scene.id)+'" data-path-step="'+i+'" data-path-option="'+choice._choiceIndex+'">'+
        escape(choice.es)+'</button>').join("")+'</div>';
      if (saved.tries>0) {
        const chosen=turn.choices[saved.lastChoice];
        cards += '<div class="mission-feedback '+(saved.correct?"success":"warning")+'" role="status">'+
          '<strong>'+(saved.correct?"选择恰当":"这种表达在此场景不合适")+'</strong><p>'+
          escape(chosen?.feedback||"重新核对场景要求。")+'</p>'+
          (saved.correct?"":'<p>建议回应：<em>'+escape(turn.model)+'</em></p>')+
          '</div>';
      }
      cards += '</div>';
      if (!saved.correct) break;
    }
    const done=correct===decisions.length;
    const transfer=done?'<div class="mission-transfer"><span class="overline">TRANSFER CHALLENGE · 迁移输出</span>'+
      '<h4>现在轮到你独立表达</h4><p>'+escape(scene.mission.transfer)+'</p>'+
      '<p class="small-note">'+escape(scene.mission.debrief||"关闭提示后用自己的西语重新表达。")+'</p>'+
      '<button type="button" class="secondary-btn" data-path-reset="'+escape(scene.id)+'">↺ 再做一遍分支练习</button></div>':"";
    return '<section id="lesson-mission" class="panel mission-panel"><div class="panel-head"><h2 class="panel-title">04. 情境升级：自己决定怎么说</h2>'+
      '<span class="panel-caption">'+escape(scene.level)+' · INTERACTIVE MISSION</span></div>'+
      '<p class="panel-intro">'+escape(scene.mission.setup)+'</p>'+
      '<div class="mission-goal"><span>你的交际目标</span><strong>'+escape(scene.goal||"完成当前交流任务")+'</strong></div>'+
      '<div class="mission-progress"><span>已完成 '+correct+' / '+decisions.length+' 个情境决策</span><div class="mission-meter"><div style="width:'+
      Math.round(correct*100/decisions.length)+'%"></div></div></div>'+cards+transfer+'</section>';
  }
  document.addEventListener("click",event=>{
    const choice=event.target.closest("[data-path-choice]");
    if (choice) {
      const id=choice.dataset.pathChoice,step=Number(choice.dataset.pathStep),selected=Number(choice.dataset.pathOption);
      if (!activeScene || activeScene.id!==id) return;
      const decision=activeScene.mission?.decisions?.[step];
      if (!decision || !decision.choices[selected]) return;
      if (step>0 && !stat(keyFor(id,step-1)).correct) return;
      const prev=stat(keyFor(id,step));
      attempts[keyFor(id,step)]={tries:prev.tries+1,correct:decision.choices[selected].correct===true,lastChoice:selected,updated:Date.now()};
      if (!attempts[keyFor(id,step)].correct) {
        for(let later=step+1;later<activeScene.mission.decisions.length;later++)delete attempts[keyFor(id,later)];
      }
      save();
      const current=document.getElementById("lesson-mission");
      if (current) {
        const wrap=document.createElement("div");
        wrap.innerHTML=renderMission(activeScene);
        current.replaceWith(wrap.firstElementChild);
      }
      return;
    }
    const reset=event.target.closest("[data-path-reset]");
    if (reset && activeScene?.id===reset.dataset.pathReset) {
      activeScene.mission.decisions.forEach((_,i)=>delete attempts[keyFor(activeScene.id,i)]);
      save();
      const current=document.getElementById("lesson-mission");
      if(current){
        const wrap=document.createElement("div");
        wrap.innerHTML=renderMission(activeScene);
        current.replaceWith(wrap.firstElementChild);
      }
    }
  });
  window.ESPathways={renderTracks,renderMission,sceneComplete};
})();