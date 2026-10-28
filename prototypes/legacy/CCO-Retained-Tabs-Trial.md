# Retained CCO tabs — combined console trial

Status: experimental, not installed in shared theme. Script: [CCO-Retained-Tabs-Trial.js](CCO-Retained-Tabs-Trial.js).

## Run
1. Publish/open CCO-Testing.aspx outside Edit mode with People search selected and the correct test member ID in the URL.
2. Reload the outer page to remove old trials. Select the outer page's DevTools Console context.
3. Paste the complete script. It expects ste_container_ciDirectory and the CCO URL parameter Directory.
4. Click the ORIGINAL CCO tabs. About should now display a retained frame in the CCO area, not an extra test section below it.
5. Test Add Job: outer-viewport popup sizing, correct member, Save refreshes the child report, Cancel and repeated opening. Check Find, paging, sorting, other popups and navigation too.
6. Reload the outer page to remove the trial. Do not install this as theme JS.

The initially selected tab remains native. Other labels are read from the native strip; labels are matched to DocumentVersionKey values extracted from CCO_Tabs_2026-09-12T12_45_21.xml. Child URLs now use ContentPreview.aspx to load each individual content record, not the parent CCO page. Context parameters including ID and repeated values are retained; Directory and child rendering/routing parameters are excluded or replaced. Unknown labels fail before installing the trial. This is a fixed export snapshot; folder lookup is not automatic. The outer URL/history is not updated on switching.

After 1.5 seconds, speculative loads run sequentially. Clicking an unloaded tab starts it immediately and may overlap the current background load. Frames are retained at 800px height with internal scrolling. Only the referenced child content page is requested. No child CCO row is hidden or removed; nested controls belonging to that content remain intact. The preceding same-page trial repeated the parent header and was rejected by the user. No recursive enhancement is installed in the frames.

After every frame load, the child's ShowDialog_NoReturnValue forwards to the outer helper. Callback objects are passed unchanged so child-defined callbacks retain their child environment. Tested live previously for Add Job sizing/save refresh; other helpers and parent/child context assumptions need live checks. A partial update that replaces the helper without navigating may require further bridge lifecycle work.

A 45-second timeout reports a slow load and releases the preload queue. iframe load is not proof of query success or permission to access content. Authentication/error documents can also load; the normal-page link is the fallback. No automatic retry/reload discards retained edits. Use the fallback or outer reload deliberately when changing context.

The trial does not synchronize Telerik/server selection state. A native full postback on the original tab can reset the trial; CCO replacement removes interception and requires a reload before reinstalling. It does not implement dirty-form detection, cross-tab invalidation, automatic height, Back/Forward selection, mobile All sections integration or memory limits. Those remain prerequisites for promotion to production.

Local regression: node tools/test-cco-retained-trial.cjs. Uses fictional intercepted pages; never contacts iMIS. Shared theme, native CSS and standalone usage guide remain unchanged for this console experiment.
