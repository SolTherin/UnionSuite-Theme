// Standard definitions: retain the seven legacy contracts and verify native add routes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('THeme/UnionSuite/Scripts/ActionDefinitions.js','utf8'),defs=new Map();
const window={UnionSuiteActions:{define(key,value){assert.equal(value.owner,'UnionSuite');assert.equal(value.source,'ActionDefinitions.js:'+key);defs.set(key,value);}}};
const context=vm.createContext({window,URL,location:{origin:'https://theme.test'}});
(async()=>{
 vm.runInContext(source,context);assert.equal(defs.size,14);
 const names=['EmailMemberPopupFn','SMSMemberPopupFn','AddNotePopupFn','CreateCasePopupFn','CreateQuickCasePopupFn','ResolveDuplicatePopupFn','AssignWorkbenchToStaffFn'];
 const keys=['member.email','member.sms','member.add-note','member.create-case','member.create-quick-case','member.resolve-duplicate','member.assign-workbench'];
 for(let i=0;i<keys.length;i++){
  const def=defs.get(keys[i]);assert.equal(def.action.requires[0],names[i]);assert.equal(def.context.partyId.parameter,'ID');
  let calls=0;const result=Promise.resolve(i);window[names[i]]=function(...args){assert.equal(this,window);assert.deepEqual(args,[]);calls++;return result;};
  assert.equal(def.action.run(),result);assert.equal(calls,1);
 }
 const job=defs.get('member.add-job');window.getSystemVersion=async()=>411;
 let url=new URL(await job.action.href({context:{partyId:'00123'}}));assert.match(url.pathname,/Select-Workplace.aspx$/);assert.equal(url.searchParams.get('ID'),'00123');
 window.getSystemVersion=async()=>410;url=new URL(await job.action.href({context:{partyId:'00123'}}));assert.match(url.pathname,/Staff\/AddJob.aspx$/);
 window.getSystemVersion=async()=>0;await assert.rejects(job.action.href({context:{partyId:'00123'}}),/could not be determined/);
 const address=defs.get('member.add-address');url=new URL(address.action.href({context:{partyId:'00123'}}));assert.equal(url.searchParams.get('ID'),'00123');assert.equal(url.searchParams.get('CloseWindowOnCommit'),'true');
 const calls=[];const refresh={originReport:async()=>calls.push('origin'),iqa:async(selector,options)=>calls.push([selector,options.scope,options.match])};
 await job.action.refresh.run({origin:{report:{}},refresh});await address.action.refresh.run({origin:{report:null},refresh});
 assert.deepEqual(calls,['origin',['.AddressIQA','page','one']]);
 console.log('PASS fourteen definitions, seven retained legacy call/promise contracts, selected-member IDs, version routes/failure, address popup and origin/explicit refresh.');
})().catch(e=>{console.error(e);process.exitCode=1;});
