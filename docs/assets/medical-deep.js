(() => {
  "use strict";
  // Long-form fictional learning cases, independent from the short scenario cards.
  const FILES = ["assets/medical-cases-a.json","assets/medical-cases-b.json"];
  const STORAGE_KEY = "eslab-medical-journeys-v1";
  let cases=null,loading=null,active=null,renderSerial=0;
  const ui={hideZh:false,roleMode:false,draft:"",showModel:false};
  let results={};
  try {
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    if(raw && typeof raw==="object" && !Array.isArray(raw)) results=raw;
  } catch(_) {results={};}
  const el=id=>document.getElementById(id);
  const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const chapterKey=(caseId,stageId)=>caseId+"::"+stageId;
  const answerFor=(caseId,stageId)=>results[chapterKey(caseId,stageId)]||{};
  function save() {
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(results));} catch(_){}
  }
  function findCurrent(){
    if(!active||!cases)return null;
    const item=cases.find(c=>c.id===active.caseId);
    if(!item)return null;
    const chapter=item.stages[active.index];
    return chapter?{item,chapter}:null;
  }
  function sortedOptions(options,id){
    const n=options.length;
    let offset=0;for(const x of id) offset=(offset+x.charCodeAt(0))%n;
    return options.map((opt,index)=>({...opt,index})).slice(offset).concat(
      options.map((opt,index)=>({...opt,index})).slice(0,offset));
  }
  function completed(item,chapter){
    const r=answerFor(item.id,chapter.id);
    return r.comprehensionCorrect&&r.decisionCorrect&&r.production==="ready";
  }
  function stageStatus(item,chapter){
    return completed(item,chapter)?"✓ 已完成自评":"未完成";
  }
  async function load(){
    if(cases)return cases;
    if(loading)return loading;
    loading=Promise.all(FILES.map(async file=>{
      const r=await fetch(file,{cache:"no-cache"});
      if(!r.ok)throw Error("无法加载 "+file);
      return r.json();
    })).then(packs=>{
      if(packs.some(p=>p.schema!==1||!Array.isArray(p.cases)))throw Error("医疗课程结构错误");
      const list=packs.flatMap(p=>p.cases);
      if(new Set(list.map(c=>c.id)).size!==list.length)throw Error("医疗案例 ID 重复");
      cases=list;
      return list;
    }).finally(()=>{loading=null;});
    return loading;
  }
  function header(){
    return '<div class="med-breadcrumb"><a href="#/scenarios">生活场景</a> / <a href="#/medical">医疗深度训练</a></div>';
  }
  function directory(){
    const totalStages=cases.reduce((sum,c)=>sum+c.stages.length,0);
    const turns=cases.reduce((sum,c)=>sum+c.stages.reduce((n,s)=>n+s.dialogue.length,0),0);
    return header()+'<div class="med-hero"><span class="overline">LONGITUDINAL HEALTHCARE SIMULATIONS</span>'+
      '<h1>这次不是背十句话，<span>而是完整看一次病。</span></h1>'+
      '<p>同一个虚构人物持续推进 4 个章节。上一幕的症状、日期、医院手续和疑问会进入下一幕。既要听懂医护人员，也要自己解释、复述、协商。</p>'+
      '<div class="med-stat-row"><span><strong>'+cases.length+'</strong> 条连续经历</span>'+
      '<span><strong>'+totalStages+'</strong> 个剧情章节</span>'+
      '<span><strong>'+turns+'</strong> 轮双语对话</span></div>'+
      '<p class="med-safety">只教授西班牙语。所有病例虚构，不提供诊断、检查准备细则或药物剂量；真实就医应遵循专业人员意见，紧急情况在西班牙可拨打 112。</p></div>'+
      '<div class="med-case-grid">'+cases.map((item,i)=>{
        const done=item.stages.filter(st=>completed(item,st)).length;
        return '<a href="#/medical/'+esc(item.id)+'/0" class="med-case-card">'+
          '<span class="med-card-code">CASE '+String(i+1).padStart(2,"0")+' · A1 → B2</span>'+
          '<h2>'+esc(item.title)+'</h2><p>'+esc(item.subtitle)+'</p>'+
          '<div class="med-focus">'+esc(item.focus)+'</div>'+
          '<div class="med-card-foot"><span>'+done+'/4 章节通过自评</span><strong>进入连续剧情 ↗</strong></div>'+
          '</a>';
      }).join("")+'</div>'+
      '<p class="med-note">这里的学习完成数来自你的自评与选择题结果，不是语音识别评分，也不是 CEFR 认证。开放式西语作文只提供参考与要点。</p>';
  }
  function transcript(item,chapter){
    return '<section class="med-panel"><div class="med-panel-title"><div><span class="overline">01 · DEEP LISTENING</span>'+
      '<h2>连贯对话 · '+chapter.dialogue.length+' 轮</h2></div>'+
      '<div class="med-toolbar"><button type="button" data-med-play="normal">▶ 连续播放</button>'+
      '<button type="button" data-med-play="slow">▷ 慢速跟读</button></div></div>'+
      '<div class="med-toolbar med-options"><button type="button" data-med-setting="zh" aria-pressed="'+ui.hideZh+'">'+
      (ui.hideZh?"显示中文":"遮住中文")+'</button>'+
      '<button type="button" data-med-setting="role" aria-pressed="'+ui.roleMode+'">'+
      (ui.roleMode?"退出角色代入":"角色代入：遮住自己的西语")+'</button></div>'+
      '<p class="med-hint">你可以跟着工作人员的提问扮演患者／家长；逐句点击「听」可以重播。语速由网页顶部控制。</p>'+
      '<div class="med-transcript">'+chapter.dialogue.map((turn,index)=>{
        const learner=/患者|家长|顾客|来电者/.test(turn.speaker);
        const blank=ui.roleMode&&learner;
        return '<div class="med-turn"><span class="med-speaker">'+esc(turn.speaker)+'</span>'+
          '<div class="med-turn-body"><div class="med-es">'+
          (blank?'<span class="med-placeholder">轮到你说：请先尝试独立表达</span>':esc(turn.es))+
          '</div><div class="med-zh" '+(ui.hideZh?'hidden':'')+'>'+esc(turn.zh)+'</div></div>'+
          '<button type="button" class="med-listen" data-med-say="'+index+'" aria-label="听第'+(index+1)+'句">▶ 听</button></div>';
      }).join("")+'</div>'+
      (ui.roleMode?'<p class="med-note">若想核对自己的句子，请退出角色代入模式。角色代入隐藏患者/家长一方的西语，不会自动判断你的发音。</p>':'')+
      '</section>';
  }
  function chunks(chapter){
    return '<section class="med-panel"><div class="med-panel-title"><div><span class="overline">02 · CHUNKS & PRAGMATICS</span><h2>把固定表达学成可替换的词块</h2></div></div>'+
      '<div class="med-chunks">'+chapter.chunks.map(x=>
      '<div class="med-chunk"><strong lang="es">'+esc(x.es)+'</strong><span>'+esc(x.zh)+'</span><small>'+esc(x.note)+'</small></div>').join("")+
      '</div></section>';
  }
  function choiceSection(item,chapter,type,number,title,subtitle){
    const question=chapter[type];
    const saved=answerFor(item.id,chapter.id);
    const last=saved[type+"Choice"];
    const correct=saved[type+"Correct"];
    const choices=sortedOptions(question.options,chapter.id+"-"+type);
    return '<section class="med-task"><span class="med-task-num">0'+number+' / COMPREHENSION</span>'+
      (type==="decision"?'<p class="med-situation">'+esc(question.situation)+'</p>':'')+
      '<h3>'+esc(title)+'</h3><p>'+esc(question.prompt)+'</p>'+
      '<div class="med-choice-list">'+choices.map(o=>
        '<button type="button" data-med-choice="'+type+'" data-med-option="'+o.index+'" class="med-choice '+
        (last===o.index?(correct?"med-right":"med-wrong"):"")+'">'+esc(o.es)+'</button>').join("")+'</div>'+
      (last!==undefined?'<div class="med-feedback '+(correct?"med-feedback-ok":"med-feedback-try")+'" role="status"><strong>'+
        (correct?"这一轮判断合理":"这项回答还有关键遗漏")+'</strong><p>'+
        esc(question.options[last]?.feedback||"再检查对话细节。")+'</p>'+
        (!correct?'<p>请重新阅读本幕对话后再试。</p>':'')+'</div>':'')+
      '</section>';
  }
  function production(item,chapter){
    const saved=answerFor(item.id,chapter.id);
    return '<section class="med-task med-production"><span class="med-task-num">05 / ACTIVE PRODUCTION</span>'+
      '<h3>不用选答案，现在你自己开口</h3><p>'+esc(chapter.production.prompt)+'</p>'+
      '<label for="med-draft">尝试用西语写出你准备说的话（仅当前页面保留，不会保存到公共仓库）</label>'+
      '<textarea id="med-draft" rows="5" placeholder="Escribe tu respuesta en español…">'+esc(ui.draft)+'</textarea>'+
      '<div class="med-toolbar"><button type="button" data-med-reveal="true">'+(ui.showModel?"隐藏参考表达":"查看参考表达与检查点")+'</button></div>'+
      (ui.showModel?'<div class="med-model"><strong>一种可行的表达（并非唯一答案）</strong>'+
        '<p lang="es">'+esc(chapter.production.model)+'</p><ul>'+
        chapter.production.checks.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'+
        '<p>请根据内容准确度、自然度和能否脱稿表达自行判断。这里**没有** AI 作文评分或语音识别。</p>'+
        '<div class="med-toolbar"><button type="button" data-med-self="ready" class="'+(saved.production==="ready"?"med-self-active":"")+'">能独立表达</button>'+
        '<button type="button" data-med-self="review" class="'+(saved.production==="review"?"med-self-active":"")+'">需要再练</button></div></div>':
        '<p class="med-note">先尝试写/说，再对照关键点。点击显示参考表达后才能进行自评。</p>')+
      '</section>';
  }
  function chapterUI(item,chapter,index){
    const completedCount=item.stages.filter(st=>completed(item,st)).length;
    const done=completed(item,chapter);
    return header()+'<div class="med-stage-header"><span class="overline">FICTITIOUS CASE FILE · A1—B2 CONTINUOUS JOURNEY</span>'+
      '<h1>'+esc(item.title)+'</h1><p>'+esc(item.profile)+'</p>'+
      '<div class="med-stage-summary"><strong>'+esc(item.focus)+'</strong><span>完成自评 '+completedCount+'/4</span></div></div>'+
      '<div class="med-timeline">'+item.stages.map((st,i)=>
      '<a href="#/medical/'+esc(item.id)+'/'+i+'" class="med-timeline-step '+(i===index?"is-current ":"")+
      (completed(item,st)?"is-completed":"")+'"><strong>'+esc(st.level)+'</strong><span>'+
      esc(st.title.replace(/^第[一二三四]幕｜/,""))+'</span><small>'+
      (completed(item,st)?"✓ 通过自评":i===index?"当前章节":"打开本章")+'</small></a>').join("")+'</div>'+
      '<div class="med-case-layout"><div class="med-case-main">'+
      '<section class="med-intro"><span class="overline">'+esc(chapter.level)+' · '+esc(chapter.setting)+'</span>'+
      '<h2>'+esc(chapter.title)+'</h2>'+
      '<p><strong>剧情变化：</strong>'+esc(chapter.turning)+'</p><p><strong>下一幕衔接：</strong>'+esc(chapter.handoff)+'</p></section>'+
      transcript(item,chapter)+chunks(chapter)+
      '<section class="med-panel"><div class="med-panel-title"><div><span class="overline">03 · LISTEN, REASON, RESPOND</span>'+
      '<h2>推理理解与情境变化</h2></div></div>'+
      choiceSection(item,chapter,"comprehension",3,"听懂事实，而不是猜测","")+
      choiceSection(item,chapter,"decision",4,"如果情境突然变化，你怎么回答？","")+
      production(item,chapter)+
      '<div class="med-after"><strong>'+ (done?"已完成本章的选择题与自评":"继续完成理解题、情境题和开放表达自评")+'</strong>'+
      '<p>两道选择题回答正确且自行确认“能独立表达”才标记完成；这个状态只是学习进度记录。</p>'+
      (index<item.stages.length-1?'<a class="med-next-link" href="#/medical/'+esc(item.id)+'/'+(index+1)+'">进入下一幕 →</a>':
      '<a class="med-next-link" href="#/medical">返回所有深度案例 →</a>')+
      '</div></section>'+
      '</div><aside class="med-aside"><div class="med-sticky"><strong>患者档案（全部虚构）</strong><p>'+esc(item.profile)+'</p>'+
      '<strong>本章要求</strong><ul><li>听懂至少 1 项具体事实</li><li>根据新条件选择下一句话</li><li>不看参考，表达自己的立场与疑问</li><li>确认下一幕要传递的信息</li></ul>'+
      '<p class="med-safety">勿填写真实姓名、医疗卡号、药物、病史或儿童身份信息。实际疾病、药物、医疗费用均应由专业人员核实。西班牙发生紧急情况，可拨 112。</p>'+
      '<a href="#/medical">← 全部连续案例</a></div></aside></div>';
  }
  function print(){
    const node=el("view-medical");if(!node)return;
    if(!cases){node.innerHTML='<div class="empty-state">正在载入医疗深度课程…</div>';return;}
    const current=findCurrent();
    node.innerHTML=current?chapterUI(current.item,current.chapter,active.index):directory();
  }
  async function render(parts=[]){
    const seq=++renderSerial;
    const caseId=parts[0]||null;
    const index=Math.max(0,Number.parseInt(parts[1]||"0",10)||0);
    active=caseId?{caseId,index}:null;
    ui.hideZh=false;ui.roleMode=false;ui.draft="";ui.showModel=false;
    print();
    try {
      await load();
      if(seq!==renderSerial)return;
      const c=cases.find(x=>x.id===caseId);
      if(caseId && (!c || index>=c.stages.length)) {
        el("view-medical").innerHTML='<div class="empty-state">未找到该章节。<a href="#/medical">返回病例列表</a></div>';
        return;
      }
      if(c && window.ESAudio)window.ESAudio.setDialogue(c.stages[index].dialogue.map(t=>t.es),c.stages[index].title);
      print();
    } catch(err) {
      if(seq===renderSerial)el("view-medical").innerHTML='<div class="empty-state">无法载入医疗深度课程：'+esc(err.message)+'。<a href="#/medical">重试</a></div>';
    }
  }
  document.addEventListener("input",event=>{
    if(event.target?.id==="med-draft")ui.draft=String(event.target.value||"");
  });
  document.addEventListener("click",event=>{
    const button=event.target?.closest?.("[data-med-play],[data-med-say],[data-med-setting],[data-med-choice],[data-med-reveal],[data-med-self]");
    if(!button)return;
    const current=findCurrent();if(!current)return;
    const {item,chapter}=current;
    if(button.dataset.medPlay){
      if(window.ESAudio){
        window.ESAudio.setDialogue(chapter.dialogue.map(x=>x.es),chapter.title);
        window.ESAudio.playDialogue(button.dataset.medPlay==="slow");
      }return;
    }
    if(button.dataset.medSay!==undefined){
      const line=chapter.dialogue[Number(button.dataset.medSay)];
      if(line && window.ESAudio)window.ESAudio.speak(line.es);
      return;
    }
    if(button.dataset.medSetting){
      if(button.dataset.medSetting==="zh")ui.hideZh=!ui.hideZh;
      if(button.dataset.medSetting==="role")ui.roleMode=!ui.roleMode;
      print();return;
    }
    if(button.dataset.medChoice){
      const type=button.dataset.medChoice;
      if(!["comprehension","decision"].includes(type))return;
      const idx=Number(button.dataset.medOption),option=chapter[type].options[idx];
      if(!option)return;
      const k=chapterKey(item.id,chapter.id);
      const saved=results[k]||{};
      saved[type+"Choice"]=idx;
      saved[type+"Correct"]=Boolean(option.correct);
      results[k]=saved;save();print();return;
    }
    if(button.dataset.medReveal){
      ui.showModel=!ui.showModel;print();return;
    }
    if(button.dataset.medSelf){
      if(!ui.showModel)return;
      const value=button.dataset.medSelf;
      if(!["ready","review"].includes(value))return;
      const k=chapterKey(item.id,chapter.id);
      results[k]={...(results[k]||{}),production:value};
      save();print();return;
    }
  });
  window.ESMedicalDeep={render,load,getCases:()=>cases,completed};
})();