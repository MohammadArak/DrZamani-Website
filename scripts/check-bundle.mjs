import {readdir,readFile,mkdir,writeFile} from "node:fs/promises";
import {gzipSync} from "node:zlib";
import path from "node:path";

const args=process.argv.slice(2);
const value=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback;
const directory=value("--assets","public_html/assets");
const files=[];
for(const name of await readdir(directory)) {
    if(!/\.(js|css)$/.test(name))continue;
    const content=await readFile(path.join(directory,name));
    files.push({name,bytes:content.length,gzipBytes:gzipSync(content).length});
}
const totalJs=files.filter(r=>r.name.endsWith(".js")).reduce((sum,r)=>sum+r.gzipBytes,0);
const totalCss=files.filter(r=>r.name.endsWith(".css")).reduce((sum,r)=>sum+r.gzipBytes,0);
const entry=prefix=>files.filter(r=>r.name.startsWith(prefix+"-")&&r.name.endsWith(".js")).reduce((sum,r)=>sum+r.gzipBytes,0);
const measurements={main:entry("index"),staff:entry("Staff"),patientGate:entry("Appointment"),patientSession:entry("AppointmentPortalV2"),allJs:totalJs,allCss:totalCss};
// Compressed artifact limits; these do not represent LCP, INP or field performance.
// allCss was raised from 23000 to 24500 for the server-rendered article/service page styles (content.css).
const limits={main:102000,staff:27000,patientGate:1500,patientSession:5000,allJs:470000,allCss:24500};
if(!measurements.main||!measurements.staff||!measurements.patientGate||!measurements.patientSession||!totalCss)throw new Error("Required build entries are missing");
const failures=Object.keys(limits).filter(key=>measurements[key]>limits[key]);
const report={version:(await readFile("VERSION","utf8")).trim(),measurements,limits,files,failures};
const output=value("--report",null);
if(output){await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+"\n");}
console.log(JSON.stringify({measurements,limits,failures},null,2));
if(failures.length)process.exitCode=1;
