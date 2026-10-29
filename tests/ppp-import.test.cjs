"use strict";
// Regressões com dados fictícios; executar com: node tests/ppp-import.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const script=fs.readFileSync(path.join(__dirname,"..","ppp-import.js"),"utf8");
const sandbox={window:{},document:{addEventListener(){}},console};
vm.createContext(sandbox);
vm.runInContext(script,sandbox);
const parse=sandbox.window.PPPImport.parsePPPPages;
const el=(str,x,y)=>({str,x,y});
function fixture(){
 return [[
  el("1 - CNPJ do Domicílio Tributário/CEI/CAEPF/CNO",28,150),
  el("2 - Nome Empresarial",207,150),el("3 - CNAE",445,150),
  el("12.345.678/0001-90",72,170),el("EMPRESA EXEMPLO LTDA",224,170),
  el("4 - Nome do Trabalhador",28,192),el("5 - BR/PDH",207,192),el("6 - CPF",445,192),
  el("MARIA TESTE SOUZA",77,202),el("N.A.",302,199),el("123.456.789-01",482,202),
  el("7 - Data de Nascimento",28,218),
  el("13 - LOTAÇÃO E ATRIBUIÇÃO",28,320),el("13.1 - Período",28,340),el("13.2 - CNPJ/CEI",120,340),
  el("17/02/2025",35,355),el("19/09/2026",35,373),
  el("14 - PROFISSIOGRAFIA",28,420)
 ]];
}
function check(name,modify,expected="MARIA TESTE SOUZA"){
 const pages=fixture(); modify(pages[0]);
 const r=parse(pages);
 assert.equal(r.worker,expected,name);
 assert.equal(r.company,"EMPRESA EXEMPLO LTDA",name+" empresa");
 assert.equal(r.cnpj,"12.345.678/0001-90",name+" cnpj");
 assert.equal(r.cpf,"123.456.789-01",name+" cpf");
 assert.equal(r.periods.length,1,name+" períodos");
 assert.equal(r.periods[0].start,"2025-02-17");
 assert.equal(r.periods[0].end,"2026-09-19");
 console.log("OK:",name);
}
check("rótulo inteiro",()=>{});
check("rótulo fragmentado",arr=>{
 const i=arr.findIndex(x=>x.str==="4 - Nome do Trabalhador"),item=arr[i];
 arr.splice(i,1,...["4","-","Nome","do","Trabalhador"].map((str,n)=>el(str,item.x+[0,7,15,40,52][n],item.y)));
});
check("nome em coordenada próxima do rótulo",arr=>{
 arr.find(x=>x.str==="MARIA TESTE SOUZA").y=196;
});
check("nome após rótulo na mesma linha",arr=>{
 arr.find(x=>x.str==="4 - Nome do Trabalhador").str+=": MARIA TESTE SOUZA";
 arr.splice(arr.findIndex(x=>x.str==="MARIA TESTE SOUZA"),1);
});
check("nome ausente não inventa responsável",arr=>{
 arr.splice(arr.findIndex(x=>x.str==="MARIA TESTE SOUZA"),1);
 arr.push(el("RESPONSÁVEL TÉCNICO SIMULADO",90,680));
},"");
