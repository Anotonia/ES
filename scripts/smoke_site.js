#!/usr/bin/env node
"use strict";
// Lightweight render smoke test without browser dependencies.
// Checks that all six client routes render with the committed JSON and CSV.
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const root = path.join(__dirname,"..");
const lesson=JSON.parse(fs.readFileSync(path.join(root,"docs/assets/content.json"),"utf8"));
const elements={};
function getNode(id){
  if(!elements[id]){
    elements[id]={
      id,innerHTML:"",textContent:"",value:"",hidden:false,
      classList:{add(){},remove(){},toggle(){},contains(){return false;}},
      style:{}, dataset:{}, setAttribute(){},removeAttribute(){},
      addEventListener(){},scrollIntoView(){},focus(){},setSelectionRange(){}
    };
  }
  return elements[id];
}
const callbacks={};
const document={
  getElementById:getNode,
  querySelectorAll(){return [];},
  querySelector(){return getNode("sidebar");},
  addEventListener(name,handler){callbacks["doc:"+name]=handler;},
  createElement(){return getNode("generated");},
  body:{appendChild(){}}
};
const window={
  addEventListener(name,handler){callbacks["window:"+name]=handler;},
  scrollTo(){},setTimeout(){return 1},clearTimeout(){},
  speechSynthesis:{cancel(){},speak(){}}
};
let currentHash="#/scenarios";
const location={get hash(){return currentHash;},set hash(v){currentHash=v}};
global.document=document;
global.window=window;
global.location=location;
global.localStorage={getItem(){return null},setItem(){}};
Object.defineProperty(global,"navigator",{value:{clipboard:{writeText:async()=>{}}},configurable:true});
global.SpeechSynthesisUtterance=function(){};
global.fetch=async url=>{
  if(url==="assets/content.json"){
    return {ok:true,json:async()=>lesson};
  }
  if(String(url).includes("vocabulary_master.csv")){
    return {ok:true,text:async()=>fs.readFileSync(path.join(root,"data/vocabulary_master.csv"),"utf8")};
  }
  throw Error("unexpected URL "+url);
};
(async()=>{
  const source=fs.readFileSync(path.join(root,"docs/assets/app.js"),"utf8");
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
    callbacks["window:hashchange"]();
    const html=getNode(target).innerHTML;
    if(!html.includes(needle))throw Error("Failed "+label+" route: "+route);
    process.stdout.write("OK "+label+" ("+html.length+" chars)\n");
  }
  console.log("All client views generated successfully.");
})().catch(e=>{console.error(e);process.exitCode=1});
