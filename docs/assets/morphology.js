(() => {
  "use strict";
  const URL="assets/morphology.json", PAGE=45;
  const state={data:null,loading:null,search:"",level:"all",status:"all",affixTab:"prefix",limit:PAGE,editorText:""};
  const el=id=>document.getElementById(id);
  const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const labels={
    provisional_editorial_analysis:"已编写具体词素拆分 · 词源待审",
    infinitive_pattern_only:"已标记不定式词尾 · 非派生",
    multiword_or_variant:"词组／变体 · 需逐词拆分",
    not_analyzed:"未完成词素审校"
  };
  const escNode=x=>String(x).replace(/["\\\r\n]/g,"").replace(/\|/g,"/").replace(/[<>{}]/g,"");
  function pathRecord(id){return state.data?.words.find(x=>x.curated_id===id)||null;}
  function buildMermaid(word){
    const segments=String(word.segments||"").split(" + ").filter(Boolean);
    const lines=["flowchart LR",'  F["'+escNode(word.related_base||word.lemma_core)+'"]'];
    if(word.analysis_status==="provisional_editorial_analysis" && segments.length>=2){
      lines.push('  F -->|词族 / 编辑性分析| R["'+escNode(word.lemma_core)+'"]');
      segments.forEach((part,i)=>{
        lines.push('  R --> P'+i+'["'+escNode(part)+'"]');
      });
    }else if(word.analysis_status==="infinitive_pattern_only"&&segments.length>=2){
      lines.push('  F -->|动词不定式 · 屈折线索| R["'+escNode(word.lemma_core)+'"]');
      lines.push('  R --> P0["'+escNode(segments[0])+'"]');
      lines.push('  R --> P1["'+escNode(segments[1])+'"]');
    }else{
      lines.push('  F -.->|结构未审校 / 不得自动推断| R["'+escNode(word.lemma_core)+'"]');
    }
    return lines.join("\n");
  }
  function graph(word){
    if(!word.segments)return '<div class="morph-unknown"><strong>'+esc(word.lemma_core)+'</strong><span>未做可靠拆分；这不是“不能拆”，而是目前不应猜。</span></div>';
    const parts=word.segments.split(" + ");
    return '<div class="morph-visual"><div class="morph-whole">'+esc(word.lemma_core)+'</div>'+
      '<div class="morph-vertical-arrow">↓ 结构层</div><div class="morph-parts">'+parts.map((x,i)=>
      '<div class="morph-part"><strong>'+esc(x)+'</strong><small>'+(word.analysis_status==="infinitive_pattern_only"?(i===parts.length-1?"不定式词尾":"词干线索"):"形式成分 "+(i+1))+'</small></div>').join('<span class="morph-plus">+</span>')+
      '</div></div>';
  }
  function dir(){
    const arr=state.data.words;
    const current=arr.filter(x=>(state.level==="all"||x.level===state.level)&&
      (state.status==="all"||x.analysis_status===state.status)&&
      (!state.search||[x.lemma_core,x.spanish,x.meaning_zh,x.related_base,x.segments,x.unit].some(v=>String(v).toLocaleLowerCase("es").includes(state.search.toLocaleLowerCase("es")))));
    const byStatus=Object.fromEntries(Object.keys(labels).map(k=>[k,arr.filter(x=>x.analysis_status===k).length]));
    return '<div class="morph-hero"><span class="overline">SPANISH MORPHOLOGY · 词素与词族数据库</span>'+
      '<h1>词根词缀，不是机械拆字。</h1><p>逐词查看词基、派生、动词词尾和真实词族。数据覆盖现有 '+arr.length+' 条主词库记录，未校验的词明确标记，不伪造词源。</p>'+
      '<div class="morph-metrics"><span><strong>'+state.data.affixes.length+'</strong>组词缀目录</span><span><strong>'+
      state.data.words.length+'</strong>条词库索引</span><span><strong>'+byStatus.provisional_editorial_analysis+
      '</strong>条具体分解</span><span><strong>'+byStatus.not_analyzed+'</strong>条待审校</span></div>'+
      '<p class="morph-alert">注意：具体拆分仍为编辑性分析，不代表逐词得到词源学认证；动词词尾标记不等于派生分析。带介词、冠词或多词的表达必须逐项理解。</p></div>'+
      '<div class="morph-layout"><section class="morph-search-area"><h2>现有 A1–B2 词表 · 可搜索的词素状态</h2>'+
      '<label for="morph-q" class="morph-label">搜索西语 / 释义 / 词干</label>'+
      '<input id="morph-q" type="search" placeholder="例如：autorización / -idad / 学校" value="'+esc(state.search)+'" />'+
      '<div class="morph-filters"><label>等级<select id="morph-level">'+["all","A1","A2","B1","B2"].map(x=>'<option value="'+x+'" '+(x===state.level?"selected":"")+'>'+(x==="all"?"全部":x)+'</option>').join("")+'</select></label>'+
      '<label>分析状态<select id="morph-status"><option value="all">全部状态</option>'+
      Object.entries(labels).map(([k,v])=>'<option value="'+k+'" '+(state.status===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label></div>'+
      '<p class="morph-small">筛选到 '+current.length+' 条；显示前 '+Math.min(current.length,state.limit)+' 条。<a href="https://github.com/Anotonia/ES/blob/main/data/morphology/morphology_master.csv" target="_blank" rel="noopener noreferrer">完整 827 条 CSV ↗</a></p>'+
      '<div class="morph-word-list">'+current.slice(0,state.limit).map(w=>
      '<a href="#/morphology/'+encodeURIComponent(w.curated_id)+'" class="morph-word-link"><div><strong>'+esc(w.spanish)+'</strong><small>'+
      esc(w.meaning_zh)+'</small></div><span>'+esc(w.level)+' · '+(w.analysis_status==="provisional_editorial_analysis"?"拆解":
      w.analysis_status==="infinitive_pattern_only"?"词尾":w.analysis_status==="multiword_or_variant"?"词组":"待审")+'</span></a>').join("")+
      (current.length===0?'<div class="empty-state">没有找到匹配的词条。调整筛选词再试。</div>':"")+'</div>'+
      (current.length>state.limit?'<button type="button" class="morph-more" data-morph="more">加载更多匹配词</button>':"")+'</section>'+
      '<section class="morph-affix-area"><h2>53 组词缀与变体</h2><p class="morph-small">先理解规则，再看反例，最后尝试用自己熟悉的词造句。</p>'+
      '<div class="morph-toggle"><button type="button" data-morph="prefix" class="'+(state.affixTab==="prefix"?"active":"")+'">前缀</button>'+
      '<button type="button" data-morph="suffix" class="'+(state.affixTab==="suffix"?"active":"")+'">派生后缀</button></div>'+
      '<div class="morph-affixes">'+state.data.affixes.filter(a=>a.type===(state.affixTab==="prefix"?"prefix":"derivational_suffix")).map(a=>
      '<details class="morph-affix"><summary><strong>'+esc(a.form)+'</strong><span>'+esc(a.meaning)+'</span></summary>'+
      '<p>'+esc(a.rule)+'</p><p><strong>例词：</strong>'+a.examples.map(esc).join(" · ")+'</p>'+
      '<p class="morph-caution"><strong>注意：</strong>'+esc(a.caution)+'</p></details>').join("")+'</div>'+
      '<div class="morph-footerlinks"><a href="https://github.com/Anotonia/ES/tree/main/mindmaps/morfologia" target="_blank" rel="noopener noreferrer">13 张可编辑 Mermaid 构词脑图 ↗</a>'+
      '<a href="https://github.com/Anotonia/ES/blob/main/mindmaps/morfologia/README-%E5%AE%8C%E6%95%B4%E8%AF%8D%E6%A0%B9%E8%AF%8D%E7%BC%80%E7%B3%BB%E7%BB%9F.md" target="_blank" rel="noopener noreferrer">构词学习总目录 ↗</a></div>'+
      '</section></div>';
  }
  function detail(word){
    const status=labels[word.analysis_status]||word.analysis_status;
    const related=state.data.words.filter(w=>w!==word && word.related_base && 
      (w.lemma_core===word.related_base||w.related_base===word.related_base)).slice(0,12);
    state.editorText=buildMermaid(word);
    return '<div class="med-breadcrumb"><a href="#/morphology">词根词缀</a> / '+esc(word.level)+' / '+esc(word.lemma_core)+'</div>'+
      '<div class="morph-detail-hero"><span class="overline">WORD ANALYSIS · '+esc(word.level)+'</span>'+
      '<h1>'+esc(word.spanish)+'</h1><p>'+esc(word.meaning_zh)+'</p><span class="morph-status">'+esc(status)+'</span></div>'+
      '<section class="morph-panel"><h2>词根、词干与词素分解</h2>'+
      graph(word)+'<div class="morph-facts"><p><strong>词族／词基：</strong>'+esc(word.related_base||"暂无可靠词基链接")+'</p>'+
      '<p><strong>类型：</strong>'+esc(word.analysis_type)+'</p><p><strong>解释与限制：</strong>'+esc(word.note)+'</p>'+
      '<p><strong>例句：</strong><span lang="es">'+esc(word.example_es)+'</span></p></div>'+
      (related.length?'<h3>相关词族（来自主词库）</h3><div class="morph-related">'+related.map(w=>
      '<a href="#/morphology/'+encodeURIComponent(w.curated_id)+'">'+esc(w.lemma_core)+' · '+esc(w.level)+'</a>').join("")+'</div>':"")+
      '</section><section class="morph-panel"><h2>Mermaid 结构图源码 · 可编辑、复制</h2>'+
      '<p class="morph-small">下方代码初始由当前词条生成。你可以修改后复制进 GitHub Markdown 的 mermaid 代码块；**网页不将编辑自动提交到仓库**。</p>'+
      '<textarea id="morph-mermaid-text" rows="9" spellcheck="false">'+esc(state.editorText)+'</textarea>'+
      '<div class="morph-buttons"><button type="button" data-morph="copy">复制 Mermaid 源码</button>'+
      '<a href="#/morphology">返回所有词条 →</a></div>'+
      '<p class="morph-small" id="morph-copy-status" role="status" aria-live="polite"></p></section>';
  }
  function print(){
    const node=el("view-morphology");if(!node)return;
    if(!state.data){node.innerHTML='<div class="empty-state">正在读取词根词缀资料…</div>';return;}
    const key=decodeURIComponent((location.hash||"").split("/")[2]||"");
    const selected=key?pathRecord(key):null;
    node.innerHTML=selected?detail(selected):dir();
  }
  async function render(){
    if(state.data){print();return;}
    print();
    if(!state.loading)state.loading=fetch(URL,{cache:"no-cache"}).then(async r=>{
      if(!r.ok)throw Error("HTTP "+r.status);
      const data=await r.json();
      if(data.schema!==1||!Array.isArray(data.words)||!Array.isArray(data.affixes))throw Error("词素数据结构错误");
      state.data=data;
    });
    try{await state.loading;print();}
    catch(e){if(el("view-morphology"))el("view-morphology").innerHTML='<div class="empty-state">词根词缀库未能载入：'+esc(e.message)+'</div>';}
  }
  document.addEventListener("input",e=>{
    if(e.target?.id==="morph-q"){state.search=String(e.target.value||"");state.limit=PAGE;print();
      const input=el("morph-q");if(input){input.focus();input.setSelectionRange(state.search.length,state.search.length);}}
    if(e.target?.id==="morph-mermaid-text")state.editorText=e.target.value||"";
  });
  document.addEventListener("change",e=>{
    if(e.target?.id==="morph-level"){state.level=e.target.value;state.limit=PAGE;print();}
    if(e.target?.id==="morph-status"){state.status=e.target.value;state.limit=PAGE;print();}
  });
  document.addEventListener("click",async e=>{
    const b=e.target?.closest?.("[data-morph]");if(!b)return;
    if(b.dataset.morph==="more"){state.limit+=PAGE;print();}
    if(["prefix","suffix"].includes(b.dataset.morph)){state.affixTab=b.dataset.morph;print();}
    if(b.dataset.morph==="copy"){
      const box=el("morph-mermaid-text");
      try{await navigator.clipboard.writeText((box?.value||state.editorText).trim());
        if(el("morph-copy-status"))el("morph-copy-status").textContent="Mermaid 源码已复制。";
      }catch(_){if(el("morph-copy-status"))el("morph-copy-status").textContent="剪贴板访问失败，请手动选中复制。";}
    }
  });
  window.ESMorphology={render,data:()=>state.data,mermaid:buildMermaid};
})();