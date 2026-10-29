"use strict";
(function importer() {
  const $ = selector => document.querySelector(selector);
  let candidate = null;
  let requestId = 0;
  function clean(s) { return String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim(); }
  function normalized(s) { return clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function validDate(d) {
    const m = /^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})$/.exec(d);
    if (!m) return null;
    const day = +m[1], month = +m[2], year = +m[3];
    const x = new Date(Date.UTC(year,month-1,day));
    return x.getUTCDate()===day&&x.getUTCMonth()===month-1&&x.getUTCFullYear()===year ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }
  function dates(text) {
    return [...text.matchAll(/\b(\d{2})\s*[\/.\-]\s*(\d{2})\s*[\/.\-]\s*(\d{4})\b/g)]
      .map(m=>validDate(`${m[1]}/${m[2]}/${m[3]}`)).filter(Boolean);
  }
  function prepare(rawPages) {
    return rawPages.map(raw=>{
      const spans=raw.map(item=>({
        text:clean(item.str??item.text),
        x:Number(item.x??item.transform?.[4]??0),
        y:Number(item.y??(item.pageHeight-item.transform?.[5])??0)
      })).filter(s=>s.text&&Number.isFinite(s.x)&&Number.isFinite(s.y))
        .sort((a,b)=>a.y-b.y||a.x-b.x);
      const lines=[];
      for(const s of spans){
        let line=lines.find(l=>Math.abs(l.y-s.y)<=3);
        if(!line){line={y:s.y,spans:[]};lines.push(line);}
        line.spans.push(s);
      }
      lines.forEach(l=>l.spans.sort((a,b)=>a.x-b.x));
      return {spans,lines};
    });
  }
  // Cada nome é lido de sua própria célula na tabela administrativa.
  // PDF.js pode fragmentar os rótulos em muitos pedaços.
  function anchor(page, re) {
    const direct=page.spans.find(s=>re.test(normalized(s.text)));
    if(direct)return direct;
    for(const line of page.lines) {
      for(let i=0;i<line.spans.length;i++) {
        let combined="";
        for(const piece of line.spans.slice(i,i+18)) {
          combined+=(combined?" ":"")+piece.text;
          const match=re.exec(normalized(combined));
          if(match&&match.index===0)return line.spans[i];
        }
      }
    }
    return null;
  }
  function headerTop(points,fallback) {
    const values=points.filter(Boolean).map(p=>p.y);
    return values.length?Math.min(...values):fallback;
  }
  function isFieldHeader(text) {
    return /^(?:\d{1,2}(?:\.\d+)?\s*[-–.]\s*(?:nome|cnpj|cpf|cnae|br|data|sexo|matricula|regime|funcao|cargo|periodo|lotacao)|(?:nome\s+do\s+trabalhador|nome\s+empresarial|br\s*\/\s*pdh)\s*:?)/i.test(normalized(text));
  }
  function cellContent(page,left,right,top,bottom) {
    if(![left,right,top,bottom].every(Number.isFinite))return "";
    return clean(page.spans.filter(s=>s.x>=left-5&&s.x<right-3&&s.y>=top-0.8&&s.y<bottom-1)
      .sort((a,b)=>a.y-b.y||a.x-b.x)
      .filter(s=>!isFieldHeader(s.text)&&!/^\s*(?:n\.?a\.?|n\/a)\s*$/i.test(s.text))
      .map(s=>s.text).join(" "));
  }
  function plausiblePersonName(name) {
    const t=normalized(name);
    if(!t||!/^[a-z]/i.test(t)||!/[a-z]+\s+[a-z]+/i.test(t))return false;
    if(/\b(?:cnpj|cpf|cnae|trabalhador|empresarial|nascimento|regime|matricula|representante|responsavel|br\s*\/\s*pdh)\b/i.test(t))return false;
    if(/\d/.test(t)||/[;|]/.test(t))return false;
    return true;
  }
  function extractAdministrativeFields(page, anchors) {
    const {c1,c2,c3,w4,b5,p6,d7,s8,a10}=anchors;
    const top1=headerTop([c1,c2,c3],145);
    const top2=headerTop([w4,b5,p6],top1+42);
    const top3=headerTop([d7,s8,a10],top2+27);
    const y1=Math.min(top2,top1+55);
    const y2=Math.min(top3,top2+53);
    const firstX=c1?.x??w4?.x??27;
    const secondX=c2?.x??b5?.x??207;
    const thirdX=c3?.x??p6?.x??445;
    const nameRight=b5?.x&&b5.x>firstX+70?b5.x:secondX;
    // Empresa: somente linha 1, coluna 2; Trabalhador: somente linha 2, coluna 1.
    const company=c2?cellContent(page,c2.x,thirdX,top1+3,y1):"";
    const candidate=cellContent(page,w4?.x??firstX,nameRight,top2+2,y2);
    const inline=w4?.text.match(/nome\s+do\s+trabalhador\s*:\s*(.+)$/i);
    const worker=plausiblePersonName(candidate)?candidate:
      inline&&plausiblePersonName(inline[1])?clean(inline[1]):"";
    const cnpjText=cellContent(page,firstX,secondX,top1+3,y1);
    const cpfText=cellContent(page,p6?.x??thirdX,595,top2+2,y2);
    const cnpjPattern=/\b\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}\b/;
    const cpfPattern=/\b\d{3}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*-\s*\d{2}\b/;
    return {
      company:company&&!/\b(?:nome\s+do\s+trabalhador|br\s*\/\s*pdh|cpf:)\b/i.test(company)?company:"",
      worker,
      cnpj:clean(cnpjText.match(cnpjPattern)?.[0]||"").replace(/\s/g,""),
      cpf:clean(cpfText.match(cpfPattern)?.[0]||"").replace(/\s/g,"")
    };
  }
  function findPeriods(page, firstRe, nextRe, endRe) {
    const label=anchor(page,firstRe);
    if(!label)return [];
    const next=anchor(page,nextRe), end=anchor(page,endRe);
    const x2=next&&Math.abs(next.y-label.y)<=35?next.x-2:label.x+100;
    const y2=end?.y&&end.y>label.y+14?end.y-3:label.y+260;
    const snippets=page.spans.filter(s=>s.x>=label.x-8&&s.x<x2&&s.y>=label.y+14&&s.y<y2)
      .sort((a,b)=>a.y-b.y||a.x-b.x);
    const allDates=dates(snippets.map(s=>s.text).join(" "));
    const current=snippets.some(s=>/atualidade|ate\s+(?:o\s+)?momento|em\s+aberto/.test(normalized(s.text)));
    const periods=[];
    for(let i=0;i+1<allDates.length;i+=2){
      if(allDates[i+1]>=allDates[i]) periods.push({start:allDates[i],end:allDates[i+1],current:false});
    }
    if(allDates.length%2&&current)periods.push({start:allDates.at(-1),end:"",current:true});
    return periods;
  }
  function unique(periods) {
    const seen=new Set();
    return periods.filter(p=>{
      const k=`${p.start}|${p.end}|${p.current}`;
      if(seen.has(k))return false;
      seen.add(k);return true;
    });
  }
  function parsePPPPages(rawPages) {
    const pages=prepare(rawPages), first=pages[0];
    const out={company:"",cnpj:"",worker:"",cpf:"",periods:[],warnings:[],confidentFields:0};
    if(!first||first.spans.length<5){
      out.warnings.push("PDF sem camada de texto pesquisável. Para imagens digitalizadas, será necessário OCR.");
      return out;
    }
    const c1=anchor(first,/\b1\s*[-–.]\s*cnpj\b/);
    const c2=anchor(first,/\b2\s*[-–.]\s*nome\s+empresarial/);
    const c3=anchor(first,/\b3\s*[-–.]\s*cnae\b/);
    const w4=anchor(first,/\b4\s*[-–.]\s*nome\s+do\s+trabalhador/);
    const b5=anchor(first,/\b5\s*[-–.]\s*br\s*\/\s*pdh/);
    const p6=anchor(first,/\b6\s*[-–.]\s*cpf\b/);
    const d7=anchor(first,/\b7\s*[-–.]\s*data\s+de/);
    const cnpjPattern=/\b\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}\b/;
    const cpfPattern=/\b\d{3}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*-\s*\d{2}\b/;
    const s8=anchor(first,/\b8\s*[-–.]\s*sexo\b/);
    const a10=anchor(first,/\b10\s*[-–.]\s*data\s+de\s+admissao/);
    const admin=extractAdministrativeFields(first,{c1,c2,c3,w4,b5,p6,d7,s8,a10});
    out.company=admin.company;
    out.cnpj=admin.cnpj;
    out.worker=admin.worker;
    out.cpf=admin.cpf;
    const before13=anchor(first,/\b13\s*[-–.]\s*lotacao/);
    const administrativeText=first.spans.filter(s=>s.y<(before13?.y||500)).map(s=>s.text).join(" ");
    if(!out.cnpj)out.cnpj=(administrativeText.match(cnpjPattern)?.[0]||"").replace(/\s/g,"");
    if(!out.cpf)out.cpf=(administrativeText.match(cpfPattern)?.[0]||"").replace(/\s/g,"");
    for(const p of pages){
      out.periods.push(...findPeriods(p,/\b13\.1\s*[-–.]?/,/\b13\.2\s*[-–.]?/,/\b14\s*[-–.]\s*profissiografia/));
    }
    out.periods=unique(out.periods);
    if(!out.periods.length){
      for(const p of pages){
        out.periods.push(...findPeriods(p,/\b14\.1\s*[-–.]?/,/\b14\.2\s*[-–.]?/,/\b15\s*[-–.]\s*exposicao|registros\s+ambientais/));
      }
      out.periods=unique(out.periods);
    }
    if(!out.company)out.warnings.push("Razão social não identificada com segurança.");
    if(!out.worker)out.warnings.push("Nome do trabalhador não identificado com segurança.");
    if(out.cnpj.replace(/\D/g,"").length!==14){out.cnpj="";out.warnings.push("CNPJ não identificado com segurança.");}
    if(out.cpf.replace(/\D/g,"").length!==11){out.cpf="";out.warnings.push("CPF não identificado com segurança.");}
    if(!out.periods.length)out.warnings.push("Períodos das seções 13.1/14.1 não identificados com segurança; preencha manualmente.");
    out.confidentFields=["company","cnpj","worker","cpf"].filter(k=>out[k]).length;
    return out;
  }
  function review(data, filename) {
    const rows=[
      ["Razão social",data.company],
      ["CNPJ",data.cnpj],
      ["Trabalhador(a)",data.worker],
      ["CPF",data.cpf],
      ["Períodos",data.periods.map(p=>dateBR(p.start)+" a "+(p.current?"Atualidade":dateBR(p.end))).join("; ")]
    ];
    const target=$("#ppp-review-fields");target.replaceChildren();
    for(const [name,val] of rows){
      const line=document.createElement("div");
      const dt=document.createElement("dt");dt.textContent=name;
      const dd=document.createElement("dd");dd.textContent=val||"Não identificado";
      if(!val)dd.classList.add("review-missing");
      line.append(dt,dd);target.append(line);
    }
    $("#ppp-review-source").textContent="Arquivo: "+filename;
    $("#ppp-review-warning").textContent=[...data.warnings,
      "Confira os dados antes de aplicar. Solicitante e telefone permanecem manuais."].join(" ");
    $("#ppp-apply").disabled=!(data.confidentFields||data.periods.length);
    $("#ppp-review").hidden=false;
  }
  async function extract() {
    const file=$("#ppp-file").files?.[0];
    candidate=null;$("#ppp-review").hidden=true;
    if(!file){setStatus("Selecione um arquivo PDF de PPP.","error");return;}
    if(file.type!=="application/pdf"&&!/\.pdf$/i.test(file.name)){setStatus("Selecione um PDF válido.","error");return;}
    if(file.size>25*1024*1024){setStatus("O PDF deve ter no máximo 25 MB.","error");return;}
    if(!window.pdfjsLib?.getDocument){setStatus("Biblioteca de leitura não carregou. Verifique sua conexão e recarregue.","error");return;}
    const id=++requestId, button=$("#ppp-extract");
    button.disabled=true;button.textContent="Lendo PPP...";
    setStatus("Analisando PPP no próprio navegador...");
    let pdf;
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      const pages=[];
      for(let n=1;n<=Math.min(pdf.numPages,8);n++){
        const page=await pdf.getPage(n);
        const content=await page.getTextContent();
        const height=page.getViewport({scale:1}).height;
        pages.push(content.items.map(item=>({str:item.str,transform:item.transform,pageHeight:height})));
      }
      if(id!==requestId)return;
      candidate=parsePPPPages(pages);
      review(candidate,file.name);
      setStatus(candidate.confidentFields||candidate.periods.length?
        "Dados identificados. Confira a prévia de importação e clique em Aplicar.":"Dados não identificados. Verifique os avisos de leitura.",
        candidate.confidentFields||candidate.periods.length?"success":"error");
    } catch(e) {
      console.error("Falha na leitura do PPP:",e);
      setStatus(e.name==="PasswordException"?
        "PDF protegido por senha. Use uma cópia acessível.":
        "Não foi possível ler o PDF. Verifique se tem texto pesquisável ou se está corrompido.","error");
    } finally {
      if(pdf)try{await pdf.destroy();}catch{}
      button.disabled=false;button.textContent="Extrair dados do PPP";
    }
  }
  function apply() {
    if(!candidate)return;
    for(const [key,selector] of [["company","#company-name"],["cnpj","#company-cnpj"],
      ["worker","#worker-name"],["cpf","#worker-cpf"]]){
      if(candidate[key]){
        const input=$(selector);input.value=candidate[key];input.classList.remove("invalid");
      }
    }
    if(candidate.periods.length) {
      periods=candidate.periods.map(p=>({...p,id:++periodSequence}));
      renderPeriods();
    }
    updatePreview();
    $("#ppp-review").hidden=true;
    setStatus("Dados importados. Confira os campos e complete solicitante e telefone.","success");
  }
  document.addEventListener("DOMContentLoaded",()=>{
    $("#ppp-file").addEventListener("change",()=>{requestId++;candidate=null;$("#ppp-review").hidden=true;});
    $("#ppp-extract").addEventListener("click",extract);
    $("#ppp-apply").addEventListener("click",apply);
  });
  window.PPPImport={parsePPPPages};
})();
