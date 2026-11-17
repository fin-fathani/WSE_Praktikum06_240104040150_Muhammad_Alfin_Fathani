const cp=require('node:child_process');
const files=['src/errors.cjs','src/books.cjs','src/security.cjs','app.cjs','server.cjs','client.cjs','scripts/generate-openapi.cjs','scripts/setup-local.cjs','public/app.js'];
let fail=false;
for(const f of files){const p=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});console.log((p.status===0?'OK':'FAIL')+' '+f);if(p.status!==0){console.error(p.stderr);fail=true;}}
if(fail)process.exitCode=1;
