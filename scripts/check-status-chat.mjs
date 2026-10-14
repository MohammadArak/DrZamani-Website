import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function module(path,extra={}){const exports={};const code=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,...extra});return exports;}
const handlers={};const env={navigator:{onLine:true},window:{addEventListener:(name,fn)=>{handlers[name]=fn;}},Event};
const network=module("src/services/networkStatus.ts",env);
const response=(status,marker="")=>({status,ok:status>=200&&status<300,headers:{get:()=>marker}});
const old=network.beginRequest(),latest=network.beginRequest();network.responseObserved(latest,response(200));network.requestFailed(old);assert.equal(network.networkSnapshot(),"connected");
network.responseObserved(network.beginRequest(),response(503));assert.equal(network.networkSnapshot(),"connected","provider 503 must not be called maintenance");
network.responseObserved(network.beginRequest(),response(503,"maintenance"));assert.equal(network.networkSnapshot(),"maintenance");
network.responseObserved(old,response(200));assert.equal(network.networkSnapshot(),"maintenance","a stale success must not hide maintenance");
network.responseObserved(network.beginRequest(),response(200));assert.equal(network.networkSnapshot(),"connected");env.navigator.onLine=false;handlers.offline();assert.equal(network.networkSnapshot(),"connection");
const {mergeMessages}=module("src/services/conversationState.ts");
const a={id:2,created_at:"2026-01-01T12:00:00Z",sender_type:"staff",read_at:null},b={...a,id:1};
const page={items:[a,b,a],peer_read_through:{id:1,created_at:b.created_at,read_at:"2026-01-01T12:02:00Z"}};
const merged=mergeMessages([],page,"staff");assert.deepEqual(Array.from(merged,item=>item.id),[1,2]);assert.ok(merged[0].read_at);assert.equal(merged[1].read_at,null);
const same=mergeMessages(merged,{items:[b],peer_read_through:null},"staff");assert.equal(same,merged,"stale delivery cannot roll back read status or duplicate a message");
const workerHandlers={},cached=[];const fallback=new Response("public connection page");
const worker={location:{origin:"https://clinic.test"},addEventListener:(type,fn)=>{workerHandlers[type]=fn;},skipWaiting:()=>{},clients:{claim:()=>{}}};
const caches={open:async()=>({addAll:async assets=>{cached.push(...assets);}}),keys:async()=>[],match:async()=>fallback};
let networkFails=false;vm.runInNewContext(readFileSync("public/connection-worker.js","utf8"),{self:worker,caches,URL,Response,fetch:async()=>{if(networkFails)throw Error("offline");return new Response("uncached authenticated page");}});
let installation;workerHandlers.install({waitUntil:value=>{installation=value;}});await installation;
assert.deepEqual(cached.sort(),["/offline.html","/img/logo/logo-dark-full.webp","/fonts/optimized/dana-regular.woff2","/fonts/optimized/vazir-bold.woff2"].sort());
for(const path of ["/api/v1/me","/api/v1/staff/consultations","/media/private.webp","/uploads/x"]){let intercepted=false;workerHandlers.fetch({request:{method:"GET",url:"https://clinic.test"+path,mode:"cors"},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false,path);}
let nav;workerHandlers.fetch({request:{method:"GET",url:"https://clinic.test/staff/",mode:"navigate"},respondWith:value=>{nav=value;}});assert.equal(await(await nav).text(),"uncached authenticated page");networkFails=true;
workerHandlers.fetch({request:{method:"GET",url:"https://clinic.test/staff/",mode:"navigate"},respondWith:value=>{nav=value;}});assert.equal(await nav,fallback);
console.log("PASS: status ordering, explicit maintenance, message dedupe/read monotonicity, and public-only offline cache; no monitoring timer.");
