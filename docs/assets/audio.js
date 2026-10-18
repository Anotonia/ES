(() => {
  "use strict";
  const KEY="eslab-audio-v1";
  const speech={rate:0.70,voiceURI:"auto",token:0,queue:null,index:0,override:null,last:[],lastLabel:"",label:"",paused:false,dialogue:[],dialogueName:""};
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)||"{}");
    if(Number.isFinite(+saved.rate)&&+saved.rate>=0.55&&+saved.rate<=1.20)speech.rate=+saved.rate;
    if(typeof saved.voiceURI==="string")speech.voiceURI=saved.voiceURI;
  } catch(_){}
  const get=id=>document.getElementById(id);
  const engine=()=>window.speechSynthesis||null;
  const escape=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const status=message=>{const node=get("speech-status");if(node)node.textContent=message;};
  function save(){try{localStorage.setItem(KEY,JSON.stringify({rate:speech.rate,voiceURI:speech.voiceURI}));}catch(_){}}
  function voiceList(){
    try{
      if(typeof engine()?.getVoices!=="function")return [];
      return engine().getVoices().filter(v=>/^es([_-]|$)/i.test(v.lang||"")).sort((a,b)=>{
        const rank=v=>(/^es[-_]ES$/i.test(v.lang||"")?100:0)+(/natural|premium|enhanced/i.test(v.name||"")?20:0)+(v.localService?1:0);
        return rank(b)-rank(a)||String(a.name).localeCompare(String(b.name));
      });
    }catch(_){return [];}
  }
  function chosenVoice(){
    const all=voiceList();
    if(speech.voiceURI!=="auto"){
      const chosen=all.find(v=>v.voiceURI===speech.voiceURI);
      if(chosen)return chosen;
    }
    return all.find(v=>/^es[-_]ES$/i.test(v.lang||""))||all[0]||null;
  }
  function refreshVoices(){
    const select=get("speech-voice");if(!select)return;
    const voices=voiceList();
    select.innerHTML='<option value="auto">西班牙口音优先 · 自动</option>'+voices.map(v=>
      '<option value="'+escape(v.voiceURI||v.name)+'">'+escape((v.name||"西语声音")+" · "+v.lang+(v.localService?" · 本机":""))+'</option>').join("");
    select.value=voices.some(v=>v.voiceURI===speech.voiceURI)?speech.voiceURI:"auto";
    select.title=voices.length?"可选择本机支持的西班牙语语音":"当前设备未返回可选西语语音";
  }
  function highlight(index){
    document.querySelectorAll(".dialogue-line[data-audio-index]").forEach(n=>{
      n.classList.toggle("audio-active",index!==null&&n.dataset.audioIndex===String(index));
    });
  }
  function pauseButtons(){
    document.querySelectorAll('[data-action="speech-pause"]').forEach(button=>{
      button.textContent=speech.paused?"▶ 继续":"Ⅱ 暂停";
      button.setAttribute("aria-label",speech.paused?"继续对话播放":"暂停对话播放");
    });
  }
  function stop(silent=false){
    speech.token++;
    speech.queue=null;speech.index=0;speech.paused=false;speech.override=null;
    if(typeof engine()?.cancel==="function")engine().cancel();
    highlight(null);pauseButtons();
    if(!silent)status("已停止朗读");
  }
  function playQueue(list,label,rateOverride=null){
    const items=list.map(item=>typeof item==="string"?{text:item,index:null}:item)
      .map(item=>({text:String(item.text||"").trim().slice(0,500),index:item.index??null})).filter(item=>item.text);
    if(!items.length)return;
    if(!engine()||typeof SpeechSynthesisUtterance!=="function"){status("此设备不支持浏览器语音朗读");return;}
    stop(true);
    speech.queue=items;speech.index=0;speech.override=rateOverride;speech.label=label;
    speech.last=items.map(x=>({...x}));speech.lastLabel=label;
    playNext(speech.token);
  }
  function playNext(token){
    if(token!==speech.token||!speech.queue)return;
    if(speech.index>=speech.queue.length){
      speech.queue=null;speech.override=null;speech.paused=false;
      highlight(null);pauseButtons();status("朗读完成 · 可重听");
      return;
    }
    const item=speech.queue[speech.index];
    const voice=chosenVoice();
    const utterance=new SpeechSynthesisUtterance(item.text);
    utterance.lang=voice?.lang||"es-ES";
    if(voice)utterance.voice=voice;
    utterance.rate=speech.override??speech.rate;utterance.pitch=1;utterance.volume=1;
    highlight(item.index);
    status(speech.queue.length>1?
      "正在朗读 "+speech.label+" · "+(speech.index+1)+"/"+speech.queue.length+" · "+utterance.rate.toFixed(2)+"×":
      "正在朗读 · "+utterance.rate.toFixed(2)+"×");
    utterance.onend=()=>{if(token!==speech.token)return;speech.index++;playNext(token);};
    utterance.onerror=e=>{
      if(token!==speech.token||e.error==="interrupted"||e.error==="canceled")return;
      stop(true);status("朗读失败，请更换声音或检查系统西语语音包");
    };
    try{engine().speak(utterance);}catch(_){stop(true);status("朗读无法启动，请检查浏览器语音功能");}
  }
  function speak(text){
    const phrase=String(text||"").trim();
    if(phrase)playQueue([phrase],"单句");
  }
  function setDialogue(lines,name){
    speech.dialogue=Array.isArray(lines)?lines.map(t=>String(t||"")):[];
    speech.dialogueName=String(name||"场景对话");
  }
  function playDialogue(slow=false){
    if(!speech.dialogue.length){status("请先进入场景课程");return;}
    playQueue(speech.dialogue.map((text,index)=>({text,index})),speech.dialogueName,
      slow?Math.min(speech.rate,0.60):null);
  }
  function pause(){
    if(!speech.queue||!engine()){status("请先播放整段对话");return;}
    if(speech.paused){
      if(typeof engine().resume!=="function")return;
      engine().resume();speech.paused=false;status("继续播放对话");
    } else {
      if(typeof engine().pause!=="function")return;
      engine().pause();speech.paused=true;status("已暂停 · 可以跟读");
    }
    pauseButtons();
  }
  function repeat(){
    if(speech.last.length)playQueue(speech.last,speech.lastLabel);
    else status("请先播放单句或对话");
  }
  function bind(){
    const slider=get("speech-rate"),label=get("speech-rate-value");
    if(slider&&label){
      slider.value=speech.rate.toFixed(2);label.textContent=speech.rate.toFixed(2)+"×";
      slider.setAttribute("aria-valuetext",speech.rate.toFixed(2)+" 倍速");
      slider.addEventListener("input",e=>{
        const value=Number(e.target.value);
        if(!Number.isFinite(value))return;
        speech.rate=Math.max(0.55,Math.min(1.20,value));
        label.textContent=speech.rate.toFixed(2)+"×";
        e.target.setAttribute("aria-valuetext",speech.rate.toFixed(2)+" 倍速");
        save();if(speech.queue)status("语速已调整 · 下一句或重听生效");
      });
    }
    const select=get("speech-voice");
    if(select){
      refreshVoices();
      select.addEventListener("change",e=>{
        speech.voiceURI=String(e.target.value||"auto");save();
        status("声音已切换 · 下一句或重听生效");
      });
    }
    if(typeof engine()?.addEventListener==="function")engine().addEventListener("voiceschanged",refreshVoices);
    else if(engine()&&"onvoiceschanged" in engine())engine().onvoiceschanged=refreshVoices;
    if(!engine())status("此浏览器不支持语音朗读");
    document.addEventListener("click",e=>{
      const b=e.target.closest('[data-action^="speech-"]');
      if(!b)return;
      switch(b.dataset.action){
        case "speech-dialogue":playDialogue(false);break;
        case "speech-follow":playDialogue(true);break;
        case "speech-pause":pause();break;
        case "speech-stop":stop();break;
        case "speech-repeat":repeat();break;
      }
    });
    window.addEventListener("hashchange",()=>{if(speech.queue)stop(true);});
  }
  window.ESAudio={speak,stop,setDialogue,playDialogue};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);
  else bind();
})();