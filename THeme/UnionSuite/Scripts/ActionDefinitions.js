/* Standard Union Suite actions. Load once AFTER zUnionSuite.js and business
   dependencies, BEFORE UnionSuite-Client/Actions.js. Do not embed in iParts. */
(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before ActionDefinitions.js.');
  const party = {from:'query', parameter:'ID', required:true};
  const recordId = value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid record ID.';
  const row = {
    partyId:{from:'trigger',attribute:'data-id',required:true,validate:recordId},
    ordinal:{from:'trigger',attribute:'data-seqn',required:true,validate:value => /^\d+$/.test(String(value)) || 'Invalid job ordinal.'}
  };
  function define(key, options) {
    return actions.define(key, {className:'us-action-'+key.replace(/\./g,'-'),owner:'UnionSuite',source:'ActionDefinitions.js:'+key,...options});
  }
  function editor(path, values) {
    const url = new URL(path,location.origin);
    Object.entries(values).forEach(([name,value]) => url.searchParams.set(name,String(value)));
    url.searchParams.set('AllowEdit','True');
    return url.href;
  }
  // Client context published in the DOM. loggedInPartyId is who is signed in,
  // which is not the same as the contact being viewed.
  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); }
    catch (_) { return {}; }
  }
  async function refreshReport(env, selector) {
    if (env.origin.report || env.origin.ambiguous) return env.refresh.originReport();
    return env.refresh.iqa(selector,{scope:'page',match:'one'});
  }
  // These seven integrations retain their existing site-owned implementations.
  // Their popup/save/refresh behaviour remains in those helpers until ported.
  const legacy = [
    ['member.email','Email member','ti-mail','EmailMemberPopupFn'],
    ['member.sms','SMS member','ti-message','SMSMemberPopupFn'],
    ['member.add-note','Add note','plus','AddNotePopupFn'],
    ['member.create-case','Create case','plus','CreateCasePopupFn'],
    ['member.create-quick-case','Quick case','plus','CreateQuickCasePopupFn'],
    ['member.resolve-duplicate','Resolve duplicate','ti-users','ResolveDuplicatePopupFn'],
    ['member.assign-workbench','Assign workbench','ti-user-plus','AssignWorkbenchToStaffFn']
  ];
  legacy.forEach(([key,label,icon,helper]) => define(key,{
    presentation:{label,icon,default:'button',menu:'menu-item'},
    context:{partyId:party},
    action:{type:'function',requires:[helper],recordKey:['partyId'],run:() => window[helper]()}
  }));
  define('member.add-job',{
    presentation:{label:'Add job',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',requires:['getSystemVersion'],recordKey:['partyId'],
      href:async ({context}) => {
        const version = Number(await window.getSystemVersion());
        // The legacy helper returns 0 on lookup failure. Do not silently choose
        // an old editor when the installed version could not be established.
        if (!Number.isFinite(version) || version <= 0) throw new Error('The installed system version could not be determined.');
        return editor(version>=411 ? '/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Jobs/Select-Workplace.aspx' : '/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/AddJob.aspx', {Ordinal:'',ID:context.partyId});
      },
      popup:{title:'Add new job',width:'90%',height:'90%'},
      refresh:{when:'close',run:env => refreshReport(env,'.JobsIQA')}
    }
  });
  define('member.add-address',{
    presentation:{label:'Add new address',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/iParts/Contact%20Management/ContactAddressEditor/ContactAddressEdit.aspx',{
        ContentItemKey:'5eaa38bb-f275-4f1d-98ed-94cc6ff1060a',SingleTextAddress:'False',CloseWindowOnCommit:'true',ID:context.partyId
      }),
      popup:{title:'Add address',width:'70%',height:'70%'},
      refresh:{when:'close',run:env => refreshReport(env,'.AddressIQA')}
    }
  });
  define('home.manage-bulletin',{
    presentation:{label:'Manage bulletin',default:'button',menu:'menu-item'},context:{},
    action:{type:'navigate',href:'/_i4u_/Core/Staff-Site-Layouts/Home-Dashboard/Staff-Bulletin.aspx',target:'_blank'}
  });
  define('home.add-task',{
    presentation:{label:'Add task',icon:'plus',default:'button',menu:'menu-item'},
    context:{
      // The signed-in staff member, not the selected contact. Anonymous
      // sessions resolve to null so the required check reports it rather
      // than opening the editor without an owner.
      partyId:{
        resolve:() => { const c = clientContext(); return c.isAnonymous === true ? null : c.loggedInPartyId ?? null; },
        required:true, validate:recordId
      }
    },
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => {
        const url = new URL('/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx',location.origin);
        url.searchParams.set('ID',context.partyId);
        return url.href;
      },
      popup:{title:'Add task',width:'70%',height:'70%'},
      // Refresh the iPart the button belongs to, whichever report that is.
      refresh:{when:'close',targets:[{type:'origin-report'}]}
    }
  });
  define('jobs.edit',{
    presentation:{label:'Edit job',icon:'pencil',default:'button',row:'icon',menu:'menu-item'},
    context:{...row,workplaceId:{from:'trigger',attribute:'data-workplace',required:true,validate:recordId}},
    action:{type:'popup',recordKey:['partyId','ordinal'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/EditJob.aspx',{ID:context.partyId,Ordinal:context.ordinal,Worksite:context.workplaceId}),
      popup:{title:'Edit job',width:'70%',height:'70%'},
      refresh:{when:'close',targets:[{type:'origin-report'}]}
    }
  });
  define('jobs.delete',{
    presentation:{label:'Delete job',icon:'trash',tone:'danger',default:'button',row:'icon',menu:'menu-item'},context:row,
    action:{type:'function',recordKey:['partyId','ordinal'],confirm:{message:'Are you sure you wish to delete this job?'},
      async run({context}) {
        const token = document.getElementById('__RequestVerificationToken')?.value;
        if (!token) throw new Error('The request verification token is unavailable.');
        const response = await fetch('/api/i4u_UT_Jobs/~'+encodeURIComponent(context.partyId)+'|'+encodeURIComponent(context.ordinal),{
          method:'DELETE',credentials:'same-origin',redirect:'error',headers:{RequestVerificationToken:token,Accept:'application/json'}
        });
        if (!response.ok) throw new Error('Job deletion failed (HTTP '+response.status+').');
        return {deleted:true};
      },
      refresh:{when:'success',targets:[{type:'origin-report'}]},successMessage:'Job deleted.'
    }
  });
})();
