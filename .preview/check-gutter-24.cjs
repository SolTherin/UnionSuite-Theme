// Run existing layout checks against a changed stylesheet in memory only.
const fs=require('node:fs'),path=require('node:path');
const permitted=['test-finder-filters.cjs','test-data-panel-wrappers.cjs','test-membership-layout.cjs'];
const file=process.argv[2];if(!permitted.includes(file))throw Error('Unknown gutter check');
const read=fs.readFileSync;let changed=0;
fs.readFileSync=function(name,...args){
 const value=read.call(this,name,...args);
 if(typeof value==='string' && /\.(css|html)$/.test(String(name)) && value.includes('--bs-gutter-x: 40px;')){
  changed++;return value.replaceAll('--bs-gutter-x: 40px;','--bs-gutter-x: 24px;');
 }
 return value;
};
process.on('exit',()=>{if(!changed){console.error('No gutter declaration was substituted');process.exitCode=1;}else console.log('24px gutter supplied in memory to '+changed+' asset read(s); theme files unchanged.');});
require(path.join('..','tools',file));
