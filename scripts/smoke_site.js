#!/usr/bin/env node
"use strict";
// Lightweight render smoke test without browser dependencies.
// Checks that all six client routes render with the committed JSON and CSV.
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const root = path.join(__dirname,"..");
const lesson=JSON.parse(fs.readFileSync(path.join(root,"docs/assets/content.json"),"utf8"));
const school=JSON.parse(fs.readFileSync(path.join(root,"docs/assets/school-pathways.json"),"utf8"));
const life=JSON.parse(fs.readFileSync(path.join(root,"docs/assets/life-pathways.json"),"utf8"));
const healthPacks=["health-booking.json","health-consultation.json","health-testing.json","health-pharmacy-path.json","health-family-emergency.json"];
const healthByFile=Object.fromEntries(healthPacks.map(filename=>[filename,JSON.parse(fs.readFileSync(path.join(root,"docs/assets",filename),"utf8"))]));
const elements={};
function getNode(id){
  if(!elements[id]){
    elements[id]={
      id,innerHTML:"",textContent:"",value:"",hidden:false,
      classList:{add(){},remove(){},toggle(){},contains(){return false;}},
      style:{}, dataset:{}, listeners:{}, setAttribute(){},removeAttribute(){},
      addEventListener(type,handler){(this.listeners[type]||=[]).push(handler);},
      scrollIntoView(){},focus(){},setSelectionRange(){},replaceWith(node){this.innerHTML=node?.innerHTML||"";}
    };
  }
  return elements[id];
}
const callbacks={};
const fire=(key,event)=>(callbacks[key]||[]).forEach(handler=>handler(event));
const spoken=[];
let paused=0,resumed=0;
const document={
  getElementById:getNode,
  querySelectorAll(){return [];},
  querySelector(){return getNode("sidebar");},
  addEventListener(name,handler){(callbacks["doc:"+name]||=[]).push(handler);},
  createElement(){return {innerHTML:"",get firstElementChild(){return {innerHTML:this.innerHTML};}};},
  body:{appendChild(){}}
};
const window={
  addEventListener(name,handler){(callbacks["window:"+name]||=[]).push(handler);},
  scrollTo(){},setTimeout(){return 1},clearTimeout(){},
  speechSynthesis:{cancel(){},speak(u){spoken.push(u);},pause(){paused++;},resume(){resumed++;},getVoices(){return [
    {voiceURI:"es-MX-A",name:"Voz mexicana",lang:"es-MX",localService:true},
    {voiceURI:"es-ES-A",name:"Voz española",lang:"es-ES",localService:true}
  ];},addEventListener(){}}
};
let currentHash="#/scenarios";
const location={get hash(){return currentHash;},set hash(v){currentHash=v}};
global.document=document;
global.window=window;
global.location=location;
global.localStorage={getItem(){return null},setItem(){}};
Object.defineProperty(global,"navigator",{value:{clipboard:{writeText:async()=>{}}},configurable:true});
global.SpeechSynthesisUtterance=function(text){this.text=text;};
global.fetch=async url=>{
  if(url==="assets/content.json"){
    return {ok:true,json:async()=>lesson};
  }
  if(url==="assets/school-pathways.json")return {ok:true,json:async()=>school};
  if(url==="assets/life-pathways.json")return {ok:true,json:async()=>life};
  if(String(url).startsWith("assets/") && healthByFile[String(url).slice(7)])return {ok:true,json:async()=>healthByFile[String(url).slice(7)]};
  if(String(url).includes("vocabulary_master.csv")){
    return {ok:true,text:async()=>fs.readFileSync(path.join(root,"data/vocabulary_master.csv"),"utf8")};
  }
  throw Error("unexpected URL "+url);
};
(async()=>{
  const source=fs.readFileSync(path.join(root,"docs/assets/app.js"),"utf8");
  const audio=fs.readFileSync(path.join(root,"docs/assets/audio.js"),"utf8");
  const paths=fs.readFileSync(path.join(root,"docs/assets/pathways.js"),"utf8");
  vm.runInThisContext(audio,{filename:"docs/assets/audio.js"});
  vm.runInThisContext(paths,{filename:"docs/assets/pathways.js"});
  vm.runInThisContext(source,{filename:"docs/assets/app.js"});
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  const routes=[
    ["#/scenarios","scenario-grid","scenario-card","scene list"],
    ["#/detail/school-admission","view-detail","入学报名与学位申请","school lesson"],
    ["#/vocabulary","view-vocabulary","data-table","vocabulary table"],
    ["#/colloquial","view-colloquial","slang-card","colloquial cards"],
    ["#/maps","view-maps","map-canvas","interactive mind-map"],
    ["#/review","view-review","study-card","active recall"]
  ];
  for(const [route,target,needle,label] of routes){
    location.hash=route;
    fire("window:hashchange");
    const html=getNode(target).innerHTML;
    if(!html.includes(needle))throw Error("Failed "+label+" route: "+route);
    process.stdout.write("OK "+label+" ("+html.length+" chars)\n");
  }
  if(getNode("curated-count").textContent!=="827")throw Error("Homepage written total is stale");
  if(!getNode("view-vocabulary").innerHTML.includes("vocab-progress-grid"))throw Error("Vocabulary level cards missing");
  for(const n of ["355","156","159","157"]){
    if(!getNode("view-vocabulary").innerHTML.includes(">"+n+"</strong>"))
      throw Error("Missing live level total "+n);
  }
  console.log("Written vocabulary totals validated: 827 · A1 355 · A2 156 · B1 159 · B2 157.");
  console.log("All client views generated successfully.");
  if(getNode("scene-count").textContent!=="61")throw Error("Expected 61 scenarios");
  if(getNode("health-scene-count").textContent!=="26")throw Error("Expected 26 medical scenarios");
  if(getNode("school-scene-count").textContent!=="23")throw Error("Expected 23 school scenarios");
  if((getNode("pathways-grid").innerHTML.match(/pathway-card/g)||[]).length!==12)throw Error("Expected twelve four-stage learning paths");
  location.hash="#/detail/entry-04";
  fire("window:hashchange");
  if(!getNode("view-detail").innerHTML.includes("mission-panel"))throw Error("Missing B2 interactive scenario");
  if(!getNode("view-detail").innerHTML.includes("lesson-mission"))throw Error("Missing branching mission section");
  const caseItem=school.scenarios.find(x=>x.id==="entry-04");
  const branchButton=(step,option)=>({dataset:{pathChoice:"entry-04",pathStep:String(step),pathOption:String(option)},closest(selector){
    if(selector==="[data-path-choice]")return this;
    return null;
  }});
  fire("doc:click",{target:branchButton(0,1)});
  if(!window.ESPathways.sceneComplete(caseItem) && window.ESPathways.renderMission(caseItem).includes("mission-locked")){
    // Negative choice can require retry, as intended.
  }
  fire("doc:click",{target:branchButton(0,0)});
  if(!window.ESPathways.renderMission(caseItem).includes("突发情况 2"))throw Error("Second decision not unlocked");
  fire("doc:click",{target:branchButton(1,0)});
  if(!window.ESPathways.sceneComplete(caseItem))throw Error("Interactive mission did not complete");
  if(!window.ESPathways.renderMission(caseItem).includes("TRANSFER CHALLENGE"))throw Error("Missing open-ended transfer task");
  console.log("Advanced lesson checks OK: 12 paths, 61 scenes, B2 mission, branching feedback, transfer practice.");
  const appointment=healthByFile["health-booking.json"].scenarios[0];
  const consult=healthByFile["health-consultation.json"].scenarios[2];
  const emerg=healthByFile["health-family-emergency.json"].scenarios[3];
  for(const scene of [appointment,consult,emerg]){
    location.hash="#/detail/"+scene.id;fire("window:hashchange");
    const page=getNode("view-detail").innerHTML;
    if(!page.includes(scene.title)||!page.includes("mission-panel")||!page.includes("speech-dialogue"))
       throw Error("Healthcare lesson not rendered: "+scene.id);
    if(!window.ESPathways.renderMission(scene).includes("mission-choice"))throw Error("Missing health branching");
  }
  console.log("Healthcare pages validated: appointment, clinical history, 112 emergency and branching.");
  if(getNode("speech-rate").value!=="0.70")throw Error("Default speech rate is not 0.70");
  if(!getNode("speech-voice").innerHTML.includes("es-ES"))throw Error("Spanish voice chooser not populated");
  window.ESAudio.speak("Buenos días");
  let spokenFirst=spoken.at(-1);
  if(spokenFirst.rate!==0.70||spokenFirst.voice.lang!=="es-ES")throw Error("Wrong default rate or regional voice");
  if(spokenFirst.text!=="Buenos días")throw Error("Wrong spoken text");
  const slider=getNode("speech-rate");slider.value="0.60";
  for(const handler of slider.listeners.input||[])handler({target:slider});
  window.ESAudio.speak("Hola");
  if(spoken.at(-1).rate!==0.60)throw Error("Speed slider did not update spoken rate");
  location.hash="#/detail/school-admission";
  fire("window:hashchange");
  const button=(action,value="")=>({dataset:{action,value},closest(){return this;}});
  fire("doc:click",{target:button("speech-dialogue","school-admission")});
  const first=spoken.at(-1);
  if(!first.text.includes("Buenos días.")||first.rate!==0.60)throw Error("Dialogue did not begin at slider rate");
  first.onend();
  if(!spoken.at(-1).text.includes("¿Para qué curso"))throw Error("Dialogue sentence sequencing failed");
  fire("doc:click",{target:button("speech-pause")});
  fire("doc:click",{target:button("speech-pause")});
  if(paused!==1||resumed!==1)throw Error("Dialogue pause/resume failed");
  fire("doc:click",{target:button("speech-follow")});
  if(spoken.at(-1).rate>0.60)throw Error("Slow follow-along rate exceeds 0.60");
  fire("doc:click",{target:button("speech-repeat")});
  if(!spoken.at(-1).text.includes("Buenos días."))throw Error("Repeat did not restart dialogue");
  fire("doc:click",{target:button("speech-stop")});
  console.log("Audio smoke checks OK: default speed, es-ES choice, slider, dialogue, pause, repeat, stop.");
})().catch(e=>{console.error(e);process.exitCode=1});
