import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseFileName } from '../src/index/Parser.js';
import { defaultSettings } from '../src/settings/Settings.js';
const api={Modal:class {},Menu:class {},setIcon(){},addIcon(){},Plugin:class {},PluginSettingTab:class {},ItemView:class {},MarkdownView:class {},TFile:class {},Platform:{isMobileApp:false}};
function evaluate(code){const context={module:{exports:{}},require(name){assert.equal(name,'obsidian');return api;},console,Map,Set,Date,setTimeout,clearTimeout,window:{setTimeout,clearTimeout},performance};vm.createContext(context);vm.runInContext(code,context);return context;}
const original=evaluate(readFileSync(new URL('../recovery/original/main.js',import.meta.url),'utf8'));
const result=await build({stdin:{contents:'export * from "./src/services/IndexService.js";',resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',external:['obsidian'],write:false});
const recovered=evaluate(result.outputFiles[0].text).module.exports;
const plain=value=>JSON.parse(JSON.stringify(value,(_,v)=>v instanceof Map?[...v.entries()]:v instanceof Set?[...v]:v));
test('parser retains original behavior across filename rules and malformed IDs',()=>{
 let count=0;
 const names=['Root+100','Child+100-2','Child+100-10','Leading+001-02','Deep+100-1-1-1-1','Bad+10000','Bad+1--2','Bad+abc','+100','Title+','Unnumbered','Title + 1','1 Title','1  Title','Title  1','1+Title','Title+1+2'];
 for(const idPosition of ['prefix','suffix'])for(const titleDelimiter of ['+',' ','，','-','1',''])for(const idSegmentDelimiter of ['-','.','+'])for(const allowTrimAroundDelimiter of [false,true])for(const name of names){const settings={...defaultSettings,idPosition,titleDelimiter,idSegmentDelimiter,allowTrimAroundDelimiter};assert.deepEqual(parseFileName(name,settings),plain(original.parseFileName(name,settings)));count++;}
 assert.equal(count,1224);
 assert.equal(parseFileName('Deep+100-1-1-1-1',defaultSettings).ok,true);
 assert.equal(parseFileName('Bad+10000',defaultSettings).reason,'segment_too_long');
});
function service(Ctor){return new Ctor({settings:()=>({...defaultSettings}),app:{vault:{getConfig:()=> 'en'}},onIndexUpdated(){},onNotices(){}});}
const fixture=['Root+100','Ten+100-10','Two+100-2','Orphan+200-3-4','Duplicate+100-2','Unnumbered','Bad+12345'].map((basename,i)=>({basename,path:'notes/'+basename+'.md',extension:'md',stat:{mtime:i,size:20}}));
test('index reconstruction matches original, including numeric sorting, missing ancestors and duplicate IDs',()=>{
 const a=service(original.IndexService),b=service(recovered.IndexService);
 const actual=b.buildIndexFromFiles(fixture,'test'),expected=a.buildIndexFromFiles(fixture,'test');
 assert.deepEqual(plain(actual),plain(expected));
 assert.deepEqual(plain(actual.index.roots),['100','200']);
 assert.deepEqual(plain(b.getChildrenForRender('100','100')),['100-2','100-10']);
 assert.equal(actual.index.idIndex.get('200').filePath,null);
 assert.equal(actual.ignoredStats.total,2);
 assert.equal(actual.index.conflicts.size,1);
});
test('rebuilt runtime exports the plugin and preserves default view activation',async()=>{
 const plugin=evaluate(readFileSync(new URL('../dist/main.js',import.meta.url),'utf8')).module.exports.default;
 assert.equal(typeof plugin,'function');
 const p=new plugin();let requested=false,state=null,revealed=false;
 const leaf={setViewState:async v=>{state=v;}};
 p.app={workspace:{getLeavesOfType:()=>[],getRightLeaf:(split)=>{assert.equal(split,false);requested=true;return leaf;},revealLeaf:l=>{assert.equal(l,leaf);revealed=true;}}};
 await p.activateView();assert.equal(requested,true);assert.equal(state.type,'zettel-outline-view');assert.equal(revealed,true);
});
const viewBuild = await build({stdin:{contents:'export * from "./src/view/VirtualTree.js"; export * from "./src/view/NoteCreation.js"; export * from "./src/view/deleteNoteFile.js"; export * from "./src/services/RenameNote.js"; export * from "./src/services/MoveBranch.js"; export * from "./src/services/PositionBranch.js"; export * from "./src/services/StructureArchive.js"; export * from "./src/services/RestoreStructure.js"; export * from "./src/services/TreeEdit.js";',resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',external:['obsidian'],write:false});
const {VirtualTree,occupiedNumbers,suggestNumber,noteBasename,deleteNoteFile,makeRenameCommand,makeMoveCommand,makePositionCommand,StructureArchive,planStructureRestore,makeStructureRestoreCommand,makeTreeEdit,creationContext} = evaluate(viewBuild.outputFiles[0].text).module.exports;
test('list style indents levels and displays local numbers while classic keeps its numbering', async () => {
  class Element {
    constructor() { this.children = []; this.style = {}; this.clientHeight = 200; this.scrollTop = 0; this.classes = []; }
    createDiv({cls}) { const child = new Element(); child.classes.push(cls); this.children.push(child); return child; }
    createEl(tag, options) { return this.createDiv(options); }
    setAttribute() {}
    addEventListener() {}
    createSpan(options) { return this.createDiv(options); }
    addClass(cls) { this.classes.push(cls); }
    empty() { this.children = []; }
    setText(text) { this.text = text; }
  }
  const settings = {...defaultSettings, outlineStyle: 'list'};
  const nodes = new Map([
    ['100', {idKey:'100', segments:[100], title:'Root',filePath:'root.md'}],
    ['100-2', {idKey:'100-2', segments:[100,2], title:'Child',filePath:'child.md'}],
    ['100-2-3', {idKey:'100-2-3', segments:[100,2,3], title:'Grandchild',filePath:'grandchild.md'}]
  ]);
  const tree = new VirtualTree(new Element(), {
    getIndex: () => ({idIndex:nodes}), getViewState: () => ({}), getSettings: () => settings
  });
  tree.rootKey = '100';
  tree.visible = [...nodes.keys()].map((idKey, depth) => ({idKey, depth}));
  tree.activeId = '100-2';
  tree.renderWindow();
  const rows = tree.spacerEl.children;
  assert.deepEqual(rows.map(row => row.style.paddingLeft), [0,1,2].map(depth => `calc(var(--zettel-outline-list-start, 1em) + ${depth} * var(--zettel-outline-list-indent, 2em))`));
  assert.deepEqual(rows.map(row => row.children[0].text), ['100.','2.','3.']);
  assert.ok(rows[1].classes.includes('is-active'));
  const forest = new VirtualTree(new Element(), {
    deps:{app:{vault:{getConfig:()=>"en"}}},
    getIndex: () => ({idIndex:nodes, roots:['100']}), getViewState: () => ({}), getSettings: () => settings,
    getChildrenForRender: id => id === '100' ? ['100-2'] : id === '100-2' ? ['100-2-3'] : []
  }, {forest:true});
  forest.refresh();
  assert.deepEqual(plain(forest.visible.map(row => row.idKey)), ['100']);
  forest.expanded = new Set(nodes.keys());
  forest.refresh();
  assert.equal(forest.visible.length, 3);
  assert.equal(forest.spacerEl.children[2].children.filter(child => child.classes.includes('zettel-outline__indent-guide')).length, 2);
  forest.expanded.clear();
  forest.refresh();
  assert.equal(forest.visible.length, 1);
  forest.setActive('100-2-3');
  forest.refresh();
  assert.equal(forest.visible.length, 3);
  forest.selectedId = '100';
  const key = value => ({key:value,target:forest.viewportEl,preventDefault(){},stopPropagation(){}});
  await forest.onKeyDown(key('ArrowDown'));
  assert.equal(forest.selectedId,'100-2');
  await forest.onKeyDown(key('ArrowLeft'));
  assert.ok(!forest.expanded.has('100-2'));
  assert.equal(forest.visible.length,2);
  await forest.onKeyDown(key('ArrowRight'));
  assert.equal(forest.visible.length,3);
  await forest.onKeyDown(key('ArrowRight'));
  assert.equal(forest.selectedId,'100-2-3');
  await forest.onKeyDown({...key('ArrowUp'),target:{tagName:'INPUT'}});
  assert.equal(forest.selectedId,'100-2-3');
  await forest.onKeyDown({...key('ArrowUp'),isComposing:true});
  assert.equal(forest.selectedId,'100-2-3');
  let renameId;
  forest.startRename=id=>{renameId=id;};
  await forest.onKeyDown({...key('Enter'),altKey:true});
  assert.equal(renameId,'100-2-3');
  await forest.onKeyDown(key('Home'));
  assert.equal(forest.selectedId,'100');
  await forest.onKeyDown(key('End'));
  assert.equal(forest.selectedId,'100-2-3');
  const leaf = forest.listIndex.idIndex.get('100-2-3');
  leaf.filePath = 'leaf.md';
  let opened;
  forest.indexService.openFileByPath = async path => {opened=path;};
  await forest.onKeyDown(key('Enter'));
  assert.equal(opened,'leaf.md');
  settings.outlineStyle = 'classic';
  tree.renderWindow();
  assert.equal(tree.spacerEl.children[0].children.length, 1);
  assert.equal(tree.spacerEl.children[1].children[0].text, '2.');
  assert.equal(tree.spacerEl.children[2].children[0].text, '2.3');
});
import { buildListIndex } from '../src/view/ListIndex.js';
test('list hierarchy restores missing ancestors with blank titles and numeric ordering', () => {
  const original = {idIndex:new Map([
    ['2022', {idKey:'2022',segments:[2022],title:'2022',filePath:null}],
    ['2022-05-03', {idKey:'2022-05-03',segments:[2022,5,3],title:'Note',filePath:'note.md'}],
    ['2022-5-16', {idKey:'2022-5-16',segments:[2022,5,16],title:'Other',filePath:'other.md'}]
  ])};
  const list = buildListIndex(original, '-');
  assert.equal(list.idIndex.get('2022').title, '');
  assert.equal(list.idIndex.get('2022-5').title, '');
  assert.equal(list.idIndex.get('2022-5').filePath, null);
  assert.deepEqual(list.childrenIndex.get('2022'), ['2022-5']);
  assert.deepEqual(list.childrenIndex.get('2022-5'), ['2022-5-3','2022-5-16']);
  assert.equal(list.idIndex.get('2022-5-3').title, 'Note');
  assert.equal(list.idIndex.get('2022-5-3').filePath, 'note.md');
  assert.equal(original.idIndex.size, 3);
  original.idIndex.set('2022-5', {idKey:'2022-5',segments:[2022,5],title:'May',filePath:'may.md'});
  assert.equal(buildListIndex(original, '-').idIndex.get('2022-5').title, 'May');
});

test('new note numbering reserves missing ancestors and respects filename rules', () => {
  const settings = {...defaultSettings};
  const numbers = occupiedNumbers([{basename:'Deep+2022-05-03'},{basename:'Other+2022-5-16'}],settings);
  assert.ok(numbers.occupied.has('2022/5'));
  assert.ok(!numbers.actual.has('2022/5'));
  assert.equal(suggestNumber(numbers.occupied,[2022]),6);
  assert.equal(suggestNumber(numbers.occupied,[2022,5]),17);
  assert.equal(suggestNumber(numbers.occupied,[2022,5,3]),1);
  assert.equal(noteBasename('Note',[2022,5,17],settings),'Note+2022-5-17');
  assert.equal(noteBasename('Note',[2022,5],{...settings,idPosition:'prefix',titleDelimiter:' ',idSegmentDelimiter:'.'}),'2022.5 Note');
});

test('deletion trashes only the selected markdown file and updates the index', async () => {
  const file = {path:'parent.md',extension:'md'};
  const calls = [];
  const app = {vault:{getAbstractFileByPath:path => path === file.path ? file : null},fileManager:{trashFile:async target => {assert.equal(target,file);calls.push('trash');}}};
  const service = {onDelete:target => {assert.equal(target,file);calls.push('index');},flush:async () => calls.push('flush')};
  await deleteNoteFile(app,service,'parent.md');
  assert.deepEqual(calls,['trash','index','flush']);
  await deleteNoteFile(app,service,'missing.md');
  assert.equal(calls.length,3);
});

import {resizeNumberInput,bindImmediateHint} from '../src/view/createControls.js';
test('number width follows digit count and help opens synchronously on hover and click', () => {
  const input = {style:{}};
  resizeNumberInput(input,1);
  assert.equal(input.style.width,'max(20px, calc(1ch + 10px))');
  resizeNumberInput(input,123);
  assert.equal(input.style.width,'max(20px, calc(3ch + 10px))');
  const events = {};
  const trigger = {ownerDocument:{defaultView:{innerWidth:1000}},getBoundingClientRect:()=>({left:20,bottom:30}),addEventListener:(name,fn)=>events[name]=fn};
  const tooltip = {style:{setProperty(key,value){this[key]=value;}}};
  bindImmediateHint(trigger,tooltip);
  events.pointerenter();
  assert.equal(tooltip.style.display,'block');
  events.pointerleave();
  assert.equal(tooltip.style.display,'none');
  events.click({preventDefault(){},stopPropagation(){}});
  assert.equal(tooltip.style.display,'block');
  events.pointerleave();
  assert.equal(tooltip.style.display,'block');
  events.blur();
  assert.equal(tooltip.style.display,'none');
});

import {EditHistory} from '../src/services/EditHistory.js';
test('memory history preserves failed entries, bounds size, and clears redo after new edits',async()=>{
  const history=new EditHistory(2);let value=0;
  const command=n=>({redo:async()=>{value+=n;},undo:async()=>{value-=n;}});
  await history.execute(command(1));await history.execute(command(2));
  await history.undo();assert.equal(value,1);
  await history.redo();assert.equal(value,3);
  await history.undo();await history.execute(command(4));
  assert.equal(history.redoStack.length,0);assert.equal(value,5);
  await history.execute(command(8));assert.equal(history.undoStack.length,2);
  await assert.rejects(history.execute({redo:async()=>{throw Error('fail');}}));
  assert.equal(history.undoStack.length,2);
  const last=history.undoStack.at(-1);last.undo=async()=>{throw Error('conflict');};
  await assert.rejects(history.undo());assert.equal(history.undoStack.at(-1),last);
});
test('rename preserves original numbered ID, supports undo/redo, and refuses external conflicts',async()=>{
  const file={path:'notes/Old+2022-05-03.md',basename:'Old+2022-05-03',extension:'md'};
  const files=new Map([[file.path,file]]);
  const app={vault:{getAbstractFileByPath:path=>files.get(path)},fileManager:{renameFile:async(target,path)=>{files.delete(target.path);target.path=path;target.basename=path.slice(path.lastIndexOf('/')+1,-3);files.set(path,target);}}};
  const service={getSettings:()=>defaultSettings,getIndex:()=>({stale:false}),isRebuilding:()=>false,onRename(){},flush:async()=>{}};
  const command=makeRenameCommand(app,service,file.path,'New','2022-5-3');
  const history=new EditHistory();await history.execute(command);
  assert.equal(file.path,'notes/New+2022-05-03.md');
  await history.undo();assert.equal(file.path,'notes/Old+2022-05-03.md');
  await history.redo();assert.equal(file.path,'notes/New+2022-05-03.md');
  files.set(command.before,{path:command.before});
  await assert.rejects(history.undo(),/edit.conflict/);
  assert.equal(history.undoStack.length,1);
  assert.throws(()=>makeRenameCommand(app,service,file.path,'bad/name','id'),/edit.invalid/);
});

import {captureOutlineKeys} from '../src/view/outlineKeys.js';
test('focused outline captures Alt+Enter before app hotkeys and leaves editor input alone',()=>{
  let listener;let removed=false;let handled=0;let stopped=0;
  const ownerWindow={addEventListener:(name,fn,capture)=>{assert.equal(capture,true);listener=fn;},removeEventListener:(name,fn,capture)=>{assert.equal(fn,listener);assert.equal(capture,true);removed=true;}};
  const document={defaultView:ownerWindow};
  const viewport={ownerDocument:document};document.activeElement=viewport;
  const release=captureOutlineKeys(viewport,()=>handled++);
  const event={key:'Enter',altKey:true,target:viewport,preventDefault(){},stopImmediatePropagation(){stopped++;}};
  listener(event);assert.equal(handled,1);assert.equal(stopped,1);
  document.activeElement={tagName:'INPUT'};listener(event);assert.equal(handled,1);
  document.activeElement=viewport;listener({...event,isComposing:true});assert.equal(handled,1);
  release();assert.ok(removed);
});

import {keyBinding,shortcutAction} from '../src/settings/Shortcuts.js';
test('custom panel shortcuts replace defaults, allow clearing, and preserve modifier distinctions',()=>{
  assert.equal(shortcutAction({key:'Enter',altKey:true}),'rename');
  const settings={panelShortcuts:{rename:'Alt+r',up:'',redoAlt:'Ctrl+Shift+k'}};
  assert.equal(shortcutAction({key:'F2'},settings),undefined);
  assert.equal(shortcutAction({key:'r',altKey:true},settings),'rename');
  assert.equal(shortcutAction({key:'ArrowUp'},settings),undefined);
  assert.equal(shortcutAction({key:'K',ctrlKey:true,shiftKey:true},settings),'redoAlt');
  assert.equal(shortcutAction({key:'k',ctrlKey:true},settings),undefined);
  assert.equal(keyBinding({key:'Control',ctrlKey:true}),null);
  assert.equal(keyBinding({key:'r',isComposing:true}),null);
});

import {parseIndexedFile,isDateId,normalizeExcludedFolders} from '../src/index/Exclusions.js';
test('exclusions match folder boundaries and validate real calendar dates',()=>{
  assert.deepEqual(normalizeExcludedFolders(' Diary/\nDiary\nArchive\\Daily/ '),['Archive/Daily','Diary']);
  const settings={...defaultSettings,excludedFolders:['Diary'],excludeDateIds:true};
  assert.equal(parseIndexedFile({path:'Diary/sub/Note+1.md',basename:'Note+1'},settings).reason,'excluded_folder');
  assert.ok(parseIndexedFile({path:'Diary2/Note+1.md',basename:'Note+1'},settings).ok);
  assert.equal(parseIndexedFile({path:'Daily+2024-02-29.md',basename:'Daily+2024-02-29'},settings).reason,'excluded_date');
  assert.ok(parseIndexedFile({basename:'Note+2025-02-30'},settings).ok);
  assert.ok(parseIndexedFile({basename:'Note+2025-2-3'},settings).ok);
  assert.equal(isDateId('1900-02-29'),false);assert.equal(isDateId('2000-02-29'),true);
  assert.equal(occupiedNumbers([{path:'Diary/Note+8.md',basename:'Note+8'}],settings).occupied.size,0);
  assert.ok(occupiedNumbers([{path:'Diary/Note+8.md',basename:'Note+8'}],settings,true).actual.has('8'));
});
test('index rebuild and incremental candidate ingestion use exclusions and invalidate cached rules',async()=>{
  const settings={...defaultSettings,excludedFolders:['Diary'],excludeDateIds:true};
  const files=['Diary/Note+100.md','Notes/Daily+2025-02-03.md','Notes/Keep+200.md'].map(path=>({path,basename:path.slice(path.lastIndexOf('/')+1,-3),extension:'md',stat:{mtime:1,size:1}}));
  const indexService=new recovered.IndexService({settings:()=>settings,app:{vault:{getAbstractFileByPath:path=>files.find(file=>file.path===path),getConfig:()=> 'en'}},onIndexUpdated(){},onNotices(){}});
  const result=indexService.buildIndexFromFiles(files,recovered.settingsHash(settings));
  assert.deepEqual(plain(result.index.roots),['200']);
  assert.equal(result.ignoredStats.byReason.excluded_folder,1);
  assert.equal(result.ignoredStats.byReason.excluded_date,1);
  await indexService.createOrUpdateCandidateByPath(files[0].path,new Set());
  assert.equal(indexService.candidatesByPath.size,1);
  assert.notEqual(recovered.settingsHash(settings),recovered.settingsHash(defaultSettings));
  assert.equal(recovered.settingsHash({...defaultSettings,excludedFolders:[]}),recovered.settingsHash(defaultSettings));
});

test('revealing the active row preserves scroll when visible and moves only to viewport edges',()=>{
  const tree=Object.create(VirtualTree.prototype);
  tree.visible=Array.from({length:100},(_,i)=>({idKey:String(i)}));
  tree.indexService={getSettings:()=>({rowHeightPx:20})};
  tree.viewportEl={scrollTop:400,clientHeight:200};
  tree.activeId='25';
  assert.equal(tree.tryScrollToActive(),true);
  assert.equal(tree.viewportEl.scrollTop,400);
  tree.activeId='40';tree.tryScrollToActive();
  assert.equal(tree.viewportEl.scrollTop,620);
  tree.activeId='10';tree.tryScrollToActive();
  assert.equal(tree.viewportEl.scrollTop,200);
  tree.activeId='99';tree.viewportEl.clientHeight=0;
  assert.equal(tree.tryScrollToActive(),false);
  assert.equal(tree.viewportEl.scrollTop,200);
});

function moveFixture(names) {
  const files=names.map(basename=>({path:'notes/'+basename+'.md',basename,extension:'md'}));
  const settings={...defaultSettings};
  let failure=null;
  const app={vault:{getMarkdownFiles:()=>files,getAbstractFileByPath:path=>files.find(file=>file.path===path)},fileManager:{renameFile:async(file,path)=>{
    if(failure && failure(file,path))throw Error('injected');
    file.path=path;file.basename=path.slice(path.lastIndexOf('/')+1,-3);
  }}};
  const service={getSettings:()=>settings,getIndex:()=>service.index,isRebuilding:()=>false,onRename(){},notifyViewStateChanged(){},flush:async()=>rebuild()};
  function rebuild(){service.index={stale:false,idIndex:new Map(),roots:[]};for(const file of files){const p=parseFileName(file.basename,settings);if(p.ok){const n=p.parsed;service.index.idIndex.set(n.idKey,{...n,filePath:file.path});if(!service.index.roots.includes(n.rootKey))service.index.roots.push(n.rootKey);}}}
  rebuild();return {app,service,files,settings,fail:fn=>failure=fn};
}
test('Tab moves a complete branch, preserves siblings and undoes/redoes as one operation',async()=>{
  const f=moveFixture(['Root+2022','Parent+2022-5','A+2022-5-1','B+2022-5-4','Child+2022-5-4-1']);
  const history=new EditHistory();
  const command=makeMoveCommand(f.app,f.service,'2022-5-4','indent');
  await history.execute(command);
  assert.equal(f.files[3].basename,'B+2022-5-1-1');
  assert.equal(f.files[4].basename,'Child+2022-5-1-1-1');
  assert.equal(f.files[2].basename,'A+2022-5-1');
  assert.equal(history.undoStack.length,1);
  await history.undo();assert.equal(f.files[4].basename,'Child+2022-5-4-1');
  await history.redo();assert.equal(f.files[4].basename,'Child+2022-5-1-1-1');
  const out=makeMoveCommand(f.app,f.service,'2022-5-1-1','outdent');
  await history.execute(out);assert.equal(f.files[3].basename,'B+2022-5-2');
});
test('branch planning supports missing parents, reserves excluded numbers and rejects impossible moves',()=>{
  const f=moveFixture(['A+2022-5-3','B+2022-11-16']);
  assert.throws(()=>makeMoveCommand(f.app,f.service,'2022','outdent'),/move.topLevel/);
  assert.throws(()=>makeMoveCommand(f.app,f.service,'2022-5','indent'),/move.noPrevious/);
  const command=makeMoveCommand(f.app,f.service,'2022-11','indent');
  assert.equal(command.afterSelection,'2022-1-2');
  assert.equal(command.entries.find(entry=>entry.before.includes('/B+')).after,'notes/B+2022-1-2-16.md');
});
test('partial branch failure restores paths and does not enter history',async()=>{
  const f=moveFixture(['A+1-1','B+1-2','Child+1-2-1']);
  f.fail((file,path)=>path==='notes/Child+1-1-1-1.md');
  const history=new EditHistory();
  await assert.rejects(history.execute(makeMoveCommand(f.app,f.service,'1-2','indent')),/injected/);
  assert.equal(f.files[1].path,'notes/B+1-2.md');
  assert.equal(f.files[2].path,'notes/Child+1-2-1.md');
  assert.equal(history.undoStack.length,0);
  assert.equal(f.service.editBatch,false);
});
test('branch undo refuses newly occupied original numbering',async()=>{
  const f=moveFixture(['A+1-1','B+1-2']);
  const history=new EditHistory();await history.execute(makeMoveCommand(f.app,f.service,'1-2','indent'));
  f.files.push({path:'Other+1-2.md',basename:'Other+1-2',extension:'md'});
  await assert.rejects(history.undo(),/move.conflict/);
  assert.equal(f.files[1].basename,'B+1-1-1');
  assert.equal(history.undoStack.length,1);
});

test('moving or deleting the last note removes its old root and stale placeholders never render',()=>{
  const indexService=service(recovered.IndexService);
  const file={basename:'Note+2023-1',path:'Note+2023-1.md',extension:'md',stat:{mtime:1,size:1}};
  indexService.buildIndexFromFiles([file],'test');
  assert.ok(indexService.index.idIndex.has('2023'));
  indexService.deleteCandidate(file.path,new Set());
  indexService.rebuildRoot('2023');
  assert.equal(indexService.index.idIndex.has('2023'),false);
  assert.equal(indexService.index.rootMeta.has('2023'),false);
  assert.deepEqual(plain(indexService.index.roots),[]);
  const legacy={idIndex:new Map([['2023',{idKey:'2023',segments:[2023],rootKey:'2023',title:'2023',filePath:null}]])};
  assert.equal(buildListIndex(legacy,'-').idIndex.size,0);
});

test('focus command reveals existing outline and transfers focus without changing files',async()=>{
  const Plugin=evaluate(readFileSync(new URL('../dist/main.js',import.meta.url),'utf8')).module.exports.default;
  const plugin=new Plugin();let focused=0;let revealed=0;
  const leaf={view:{focusKeyboard(){focused++;}}};
  plugin.app={workspace:{getLeavesOfType:()=>[leaf],revealLeaf:async target=>{assert.equal(target,leaf);revealed++;}}};
  await plugin.focusOutline();
  assert.equal(focused,1);assert.ok(revealed>=1);
});

test('creation and deletion panel actions have defaults and support custom bindings',()=>{
  assert.equal(shortcutAction({key:'Delete'}),'deleteFile');
  const settings={panelShortcuts:{newSibling:'Ctrl+Enter',newChild:'Ctrl+Shift+Enter',deleteFile:'Delete'}};
  assert.equal(shortcutAction({key:'Enter',ctrlKey:true},settings),'newSibling');
  assert.equal(shortcutAction({key:'Enter',ctrlKey:true,shiftKey:true},settings),'newChild');
  assert.equal(shortcutAction({key:'Delete'},settings),'deleteFile');
  assert.equal(shortcutAction({key:'Enter'}),'open');
});

import {dropParent} from '../src/view/dragBranch.js';
test('drag destinations support child, sibling and top-level moves with one undo',async()=>{
  assert.deepEqual(dropParent([2,5],false),[2,5]);
  assert.deepEqual(dropParent([2,5],true),[2]);
  const f=moveFixture(['Source+1-2','Descendant+1-2-1','Target+2-5']);
  const history=new EditHistory();
  await history.execute(makeMoveCommand(f.app,f.service,'1-2',[2,5]));
  assert.equal(f.files[0].basename,'Source+2-5-1');
  assert.equal(f.files[1].basename,'Descendant+2-5-1-1');
  await history.undo();assert.equal(f.files[0].basename,'Source+1-2');
  await history.execute(makeMoveCommand(f.app,f.service,'1-2',[]));
  assert.equal(f.files[0].basename,'Source+3');
  assert.equal(f.files[1].basename,'Descendant+3-1');
});
test('drag refuses own descendants and same-parent no-op without renaming',()=>{
  const f=moveFixture(['Source+1-2','Child+1-2-1']);
  assert.throws(()=>makeMoveCommand(f.app,f.service,'1-2',[1,2]),/move.cycle/);
  assert.throws(()=>makeMoveCommand(f.app,f.service,'1-2',[1,2,1]),/move.cycle/);
  assert.equal(makeMoveCommand(f.app,f.service,'1-2',[1]),null);
  assert.equal(f.files[0].basename,'Source+1-2');
});

import {projectDrop} from '../src/view/dragBranch.js';
test('horizontal drag projection uses indentation rather than narrow vertical hit zones',()=>{
  const sibling=projectDrop([2022,5],100,100,32);
  assert.deepEqual(sibling.parent,[2022]);assert.equal(sibling.child,false);
  const child=projectDrop([2022,5],124,100,32);
  assert.deepEqual(child.parent,[2022,5]);assert.equal(child.child,true);
  const root=projectDrop([2022,5],60,100,32);
  assert.deepEqual(root.parent,[]);
  assert.ok(projectDrop([2022,5],132,100,32).progress > child.progress);
  assert.equal(projectDrop([1],-999,100,32).progress,0);
  assert.equal(projectDrop([1],999,100,32).progress,1);
});

import {exceedsDragThreshold,nearestDrop} from '../src/view/dragBranch.js';
test('title drag threshold distinguishes click from move and nearest drop chooses vertical line first',()=>{
  assert.equal(exceedsDragThreshold({x:10,y:10},13,12),false);
  assert.equal(exceedsDragThreshold({x:10,y:10},13,14),true);
  const targets=[{x:20,y:100,id:'a'},{x:52,y:100,id:'b'},{x:20,y:150,id:'c'}];
  assert.equal(nearestDrop(targets,50,101).id,'b');
  assert.equal(nearestDrop(targets,50,149).id,'c');
  assert.equal(nearestDrop([],0,0),null);
});
test('position move swaps entire sibling number slots and undo restores identical titles safely',async()=>{
  const f=moveFixture(['Same+1-1','Child+1-1-1','Same+1-2','Child+1-2-1']);
  const history=new EditHistory();
  const command=makePositionCommand(f.app,f.service,'1-2','1-1','before');
  await history.execute(command);
  assert.equal(f.files[0].basename,'Same+1-2');assert.equal(f.files[2].basename,'Same+1-1');
  assert.equal(f.files[1].basename,'Child+1-2-1');assert.equal(f.files[3].basename,'Child+1-1-1');
  await history.undo();assert.equal(f.files[0].basename,'Same+1-1');
  await history.redo();assert.equal(f.files[0].basename,'Same+1-2');
});
test('position insertion reassigns only affected destination slots and carries source children',async()=>{
  const f=moveFixture(['A+1-1','B+1-3','Source+2-1','Kid+2-1-2']);
  const history=new EditHistory();
  await history.execute(makePositionCommand(f.app,f.service,'2-1','1-3','before'));
  assert.equal(f.files[0].basename,'A+1-1');
  assert.equal(f.files[1].basename,'B+1-3');
  assert.equal(f.files[2].basename,'Source+1-2');
  assert.equal(f.files[3].basename,'Kid+1-2-2');
  await history.undo();assert.equal(f.files[2].basename,'Source+2-1');
});
test('position transaction rolls back partial finalization without retaining temporary filenames',async()=>{
  const f=moveFixture(['A+1-1','B+1-2']);
  let thrown=false;
  f.fail((file,path)=>{if(!thrown&&path==='notes/B+1-1.md'){thrown=true;return true;}return false;});
  const history=new EditHistory();
  await assert.rejects(history.execute(makePositionCommand(f.app,f.service,'1-2','1-1','before')),/injected/);
  assert.equal(f.files[0].path,'notes/A+1-1.md');assert.equal(f.files[1].path,'notes/B+1-2.md');
  assert.equal(history.undoStack.length,0);
});
test('position moves reject cycles and skip unchanged positions',()=>{
  const f=moveFixture(['A+1-1','Child+1-1-1','B+1-2']);
  assert.throws(()=>makePositionCommand(f.app,f.service,'1-1','1-1-1','inside'),/move.cycle/);
  assert.equal(makePositionCommand(f.app,f.service,'1-1','1-2','before'),null);
});

import {alignStructure,textChanges} from '../src/view/StructureDiff.js';
function archiveFixture(names) {
  const f=moveFixture(names),disk=new Map(),errors=[];
  f.files.forEach((file,i)=>file.stat={ctime:1000+i,mtime:2000+i,size:20});
  f.app.vault.adapter={exists:async path=>disk.has(path),read:async path=>disk.get(path),write:async(path,text)=>disk.set(path,text)};
  const archive=new StructureArchive(f.app,f.service,'plugin/history.json',error=>errors.push(error));
  f.service.structureArchive=archive;
  f.service.onRename=(file,oldPath)=>archive.changed(file,oldPath);
  return {...f,archive,disk,errors};
}
test('structure comparison preserves tree order and stable note identity across renumbering',()=>{
  const node=(id,title,segments)=>({id,title,segments,idKey:segments.join('-'),path:title+'+'+segments.join('-')+'.md'});
  const before={delimiter:'-',nodes:[node('a','Parent',[1]),node('b','Child',[1,1]),node('c','Other',[2])]};
  const after={delimiter:'-',nodes:[node('a','Parent',[1]),node('b','Renamed',[2]),node('c','Other',[3])]};
  const pairs=alignStructure(before,after);
  assert.deepEqual(pairs.filter(p=>p.left).map(p=>p.left.id),['a','b','c']);
  assert.deepEqual(pairs.filter(p=>p.right).map(p=>p.right.id),['a','b','c']);
  const changed=pairs.find(p=>p.left?.id==='b');
  assert.equal(changed.leftChange.title,true);assert.equal(changed.leftChange.number,true);assert.equal(changed.leftChange.moved,true);
  assert.deepEqual(textChanges('Note+1-1.md','Note+2.md'),{prefix:'Note+',old:'1-1',next:'2',suffix:'.md'});
});
test('structure archive records before/after and reloads identities without storing note bodies',async()=>{
  const f=archiveFixture(['Old+1']);
  const history=new EditHistory(100,f.archive);
  await history.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'New','1'));
  assert.equal(f.archive.records.length,1);
  const record=f.archive.records[0];
  assert.equal(record.before.nodes[0].title,'Old');assert.equal(record.after.nodes[0].title,'New');
  assert.equal(record.before.nodes[0].id,record.after.nodes[0].id);
  const loaded=new StructureArchive(f.app,f.service,'plugin/history.json');await loaded.load();
  assert.equal(loaded.resolve(record.before.nodes[0].id),f.files[0]);
  assert.equal(loaded.records[0].after.nodes[0].title,'New');
  assert.ok(!f.disk.get('plugin/history.json').includes('content'));
  await f.archive.close();
});
test('snapshot restore reverses multiple edits and remains undoable as one operation',async()=>{
  const f=archiveFixture(['A+1-1','B+1-2']);
  const history=new EditHistory(100,f.archive);
  await history.execute(makePositionCommand(f.app,f.service,'1-2','1-1','before'));
  const original=f.archive.records[0].before;
  await history.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'Renamed','1-2'));
  const plan=planStructureRestore(f.archive,original);
  assert.equal(plan.conflicts.length,0);assert.equal(plan.entries.length,2);
  await history.execute(makeStructureRestoreCommand(f.archive,original));
  assert.equal(f.files[0].basename,'A+1-1');assert.equal(f.files[1].basename,'B+1-2');
  await history.undo();assert.equal(f.files[0].basename,'Renamed+1-2');
  await history.redo();assert.equal(f.files[0].basename,'A+1-1');
  await f.archive.close();
});
test('restore refuses missing, replaced or conflicting notes and never treats same path as identity',async()=>{
  const f=archiveFixture(['Old+1']);
  const before=f.archive.capture();
  const command=makeRenameCommand(f.app,f.service,f.files[0].path,'New','1');await command.redo();f.archive.capture();
  f.files.push({path:'notes/Other+1.md',basename:'Other+1',extension:'md',stat:{ctime:9999}});
  assert.ok(planStructureRestore(f.archive,before).conflicts.some(c=>c.reason==='occupied'));
  f.files.pop();
  const oldFile=f.files[0];f.files[0]={...oldFile,stat:{ctime:9999}};
  assert.ok(planStructureRestore(f.archive,before).conflicts.some(c=>c.reason==='missing'));
  await f.archive.close();
});
test('archive write failure prevents starting a structural edit',async()=>{
  const f=archiveFixture(['Old+1']);
  f.app.vault.adapter.write=async()=>{throw Error('disk full');};
  const history=new EditHistory(100,f.archive);
  await assert.rejects(history.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'New','1')),/disk full/);
  assert.equal(f.files[0].basename,'Old+1');assert.equal(history.undoStack.length,0);
});
test('interrupted journal is surfaced as a comparison and corrupt primary history can use backup',async()=>{
  const f=archiveFixture(['Old+1']);await f.archive.begin('rename');
  const loaded=new StructureArchive(f.app,f.service,'plugin/history.json');await loaded.load();
  assert.equal(loaded.records[0].status,'interrupted');
  assert.equal(loaded.pending,null);
  const saved=f.disk.get('plugin/history.json');f.disk.set('plugin/history.json.bak',saved);f.disk.set('plugin/history.json','broken json');
  const recoveredArchive=new StructureArchive(f.app,f.service,'plugin/history.json');await recoveredArchive.load();
  assert.equal(recoveredArchive.records.length,1);assert.equal(recoveredArchive.disabled,false);
});

test('persisted history restoration remains usable after reload and does not overwrite body contents',async()=>{
  const f=archiveFixture(['Old+1']);
  const history=new EditHistory(100,f.archive);
  await history.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'New','1'));
  const loaded=new StructureArchive(f.app,f.service,'plugin/history.json');await loaded.load();
  f.files[0].body='text edited after renaming';
  const command=makeStructureRestoreCommand(loaded,loaded.records[0].before);
  assert.equal(command.beforeSelection,'1');assert.equal(command.afterSelection,'1');
  await command.redo();assert.equal(f.files[0].basename,'Old+1');assert.equal(f.files[0].body,'text edited after renaming');
  await command.undo();assert.equal(f.files[0].basename,'New+1');
  await f.archive.close();
});
test('history retention is bounded and snapshot restore ignores later additions while blocking missing originals',async()=>{
  const f=archiveFixture(['Original+1']);
  const before=f.archive.capture();
  const record={id:'r',time:1,kind:'edit',before,after:before,status:'complete'};
  f.archive.records=Array.from({length:102},(_,i)=>({...record,id:String(i)}));
  await f.archive.save();assert.equal(f.archive.records.length,100);
  f.files.push({path:'notes/Later+2.md',basename:'Later+2',extension:'md',stat:{ctime:12345}});
  assert.equal(planStructureRestore(f.archive,before).entries.length,0);
  f.files.shift();assert.equal(planStructureRestore(f.archive,before).conflicts[0].reason,'missing');
});

test('failed snapshot restore rolls back and corrupt history without a usable backup is protected',async()=>{
  const f=archiveFixture(['A+1-1','B+1-2']);
  const history=new EditHistory(100,f.archive);
  await history.execute(makePositionCommand(f.app,f.service,'1-2','1-1','before'));
  const record=f.archive.records[0];
  let injected=false;
  f.fail((file,path)=>{if(!injected&&path==='notes/B+1-2.md'){injected=true;return true;}return false;});
  const count=history.undoStack.length;
  await assert.rejects(history.execute(makeStructureRestoreCommand(f.archive,record.before)),/injected/);
  assert.equal(f.files[0].basename,'A+1-2');assert.equal(f.files[1].basename,'B+1-1');
  assert.equal(history.undoStack.length,count);
  await f.archive.close();
  f.disk.set('plugin/history.json','bad');f.disk.set('plugin/history.json.bak','bad');
  const broken=new StructureArchive(f.app,f.service,'plugin/history.json');await broken.load();
  assert.equal(broken.disabled,true);
  await assert.rejects(broken.begin('rename'),/archive.unreadable/);
  assert.equal(f.disk.get('plugin/history.json'),'bad');
});

test('outdent inserts immediately after the parent and compacts both affected levels',async()=>{
  const f=moveFixture(['xxx+1','zzzz+1-1','Kept+1-2','yyy+2','Nested+1-1-1','OtherNested+2-1']);
  const history=new EditHistory();
  await history.execute(makeMoveCommand(f.app,f.service,'1-1','outdent'));
  assert.deepEqual(f.files.map(file=>file.basename),['xxx+1','zzzz+2','Kept+1-1','yyy+3','Nested+2-1','OtherNested+3-1']);
  await history.undo();assert.deepEqual(f.files.map(file=>file.basename),['xxx+1','zzzz+1-1','Kept+1-2','yyy+2','Nested+1-1-1','OtherNested+2-1']);
  await history.redo();assert.equal(f.files[2].basename,'Kept+1-1');
});
test('indent appends under previous sibling, closes source numbering, and preserves all descendants',async()=>{
  const f=moveFixture(['A+1','Existing+1-1','B+2','Kid+2-1','C+3']);
  const command=makeMoveCommand(f.app,f.service,'2','indent');await command.redo();
  assert.deepEqual(f.files.map(file=>file.basename),['A+1','Existing+1-1','B+1-2','Kid+1-2-1','C+2']);
  await command.undo();assert.equal(f.files[4].basename,'C+3');
});
function withCreation(f) {
  let createdTime=10000;
  f.app.vault.create=async(path,body)=>{
    if(f.app.vault.getAbstractFileByPath(path))throw Error('exists');
    const file={path,basename:path.slice(path.lastIndexOf('/')+1,-3),extension:'md',body,stat:{ctime:++createdTime}};f.files.push(file);return file;
  };
  f.app.vault.read=async file=>file.body??'';
  f.app.fileManager.trashFile=async file=>{const i=f.files.indexOf(file);if(i<0)throw Error('missing');f.files.splice(i,1);};
  f.service.onCreate=()=>{};f.service.onDelete=()=>{};return f;
}
test('new sibling inserts after selected note and is undoable without losing its siblings',async()=>{
  const f=withCreation(moveFixture(['A+1','B+2','Kid+2-1']));
  const history=new EditHistory();
  const command=makeTreeEdit(f.app,f.service,{type:'create',mode:'sibling',id:'1',title:'New',folder:'notes'});
  await history.execute(command);
  assert.equal(command.getCreatedFile().basename,'New+2');assert.equal(f.files[1].basename,'B+3');assert.equal(f.files[2].basename,'Kid+3-1');
  await history.undo();assert.equal(f.files.length,3);assert.equal(f.files[1].basename,'B+2');
  await history.redo();assert.equal(command.getCreatedFile().basename,'New+2');
});
test('new parent wraps the branch and undo refuses to trash a parent with edited contents',async()=>{
  const f=withCreation(moveFixture(['A+1','Kid+1-1','B+2']));const history=new EditHistory();
  const command=makeTreeEdit(f.app,f.service,{type:'create',mode:'parent',id:'1',title:'Parent',folder:'notes'});
  await history.execute(command);
  assert.equal(command.getCreatedFile().basename,'Parent+1');assert.equal(f.files[0].basename,'A+1-1');assert.equal(f.files[1].basename,'Kid+1-1-1');
  command.getCreatedFile().body='do not delete';
  await assert.rejects(history.undo(),/create.undoHasContent/);assert.equal(f.files.length,4);
  command.getCreatedFile().body='';await history.undo();assert.equal(f.files.length,3);assert.equal(f.files[0].basename,'A+1');
});
test('new parent fills an existing empty ancestor and creation suggestions match insertion positions',async()=>{
  const f=withCreation(moveFixture(['A+1-1','B+1-2']));
  const node={segments:[1,1]};
  assert.deepEqual(plain(creationContext(f.service,'sibling',node)),{parent:[1],number:2,max:3,fixed:false});
  assert.deepEqual(plain(creationContext(f.service,'parent',node)),{parent:[],number:1,fixed:true});
  const command=makeTreeEdit(f.app,f.service,{type:'create',mode:'parent',id:'1-1',title:'Parent',folder:'notes'});
  await command.redo();assert.equal(command.entries.length,0);assert.equal(command.getCreatedFile().basename,'Parent+1');
});
test('new shortcut defaults include parent, child, sibling and folding while custom keys win',()=>{
  assert.equal(shortcutAction({key:'Enter',ctrlKey:true}),'newSibling');
  assert.equal(shortcutAction({key:'Enter',ctrlKey:true,shiftKey:true}),'newChild');
  assert.equal(shortcutAction({key:'Enter',ctrlKey:true,altKey:true}),'newParent');
  assert.equal(shortcutAction({key:'ArrowDown',ctrlKey:true,altKey:true}),'expandAll');
  assert.equal(shortcutAction({key:'ArrowUp',ctrlKey:true,altKey:true}),'collapseAll');
  assert.equal(shortcutAction({key:'Enter',ctrlKey:true},{panelShortcuts:{newChild:'Ctrl+Enter'}}),'newChild');
});

test('number compaction refuses excluded descendants rather than leaving them under the wrong prefix',()=>{
  const f=moveFixture(['A+1','B+2','Secret+2-1']);
  f.files[2].path='Hidden/Secret+2-1.md';f.settings.excludedFolders=['Hidden'];
  f.service.index.idIndex.delete('2-1');
  assert.throws(()=>makeMoveCommand(f.app,f.service,'2','indent'),/move.excluded/);
  assert.equal(f.files[1].basename,'B+2');
});
test('parent creation supports identical titles through staging and can redo after undo',async()=>{
  const f=withCreation(moveFixture(['Same+1','Child+1-1']));const history=new EditHistory();
  const command=makeTreeEdit(f.app,f.service,{type:'create',mode:'parent',id:'1',title:'Same',folder:'notes'});
  await history.execute(command);assert.equal(command.getCreatedFile().path,'notes/Same+1.md');assert.equal(f.files[0].path,'notes/Same+1-1.md');
  await history.undo();assert.equal(f.files[0].path,'notes/Same+1.md');
  await history.redo();assert.equal(command.getCreatedFile().path,'notes/Same+1.md');
});
test('failed parent creation rolls back every renamed descendant',async()=>{
  const f=withCreation(moveFixture(['A+1','Child+1-1']));f.app.vault.create=async()=>{throw Error('disk full');};
  const history=new EditHistory();
  await assert.rejects(history.execute(makeTreeEdit(f.app,f.service,{type:'create',mode:'parent',id:'1',title:'Parent',folder:'notes'})),/disk full/);
  assert.deepEqual(f.files.map(file=>file.basename),['A+1','Child+1-1']);assert.equal(history.undoStack.length,0);
});


test('continuous edits merge their final diff while undo remains step by step',async()=>{
  const f=archiveFixture(['Original+1']);
  const history=new EditHistory(100,f.archive);
  for(let i=0;i<15;i++)await history.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'Name'+i,'1'));
  assert.equal(f.archive.records.length,1);
  assert.equal(f.archive.records[0].before.nodes[0].title,'Original');
  assert.equal(f.archive.records[0].after.nodes[0].title,'Name14');
  await history.undo();assert.equal(f.files[0].basename,'Name13+1');
  assert.equal(f.archive.records.length,1);
  for(let i=0;i<14;i++)await history.undo();
  assert.equal(f.archive.records.length,0);
  assert.equal(JSON.parse(f.disk.get('plugin/history.json')).records.length,0);
  await history.redo();assert.equal(f.archive.records.length,1);
  assert.equal(f.archive.records[0].before.nodes[0].title,'Original');
  await f.archive.close();
});

test('idle boundary, external changes, reload and restore isolate structure groups',async()=>{
  const f=archiveFixture(['Original+1']);
  const history=new EditHistory(100,f.archive);
  const rename=title=>history.execute(makeRenameCommand(f.app,f.service,f.files[0].path,title,'1'));
  await rename('First');
  f.archive.group.lastTime-=60_000;
  await rename('Second');assert.equal(f.archive.records.length,2);
  assert.equal(f.archive.records[1].before.nodes[0].title,'First');
  await makeRenameCommand(f.app,f.service,f.files[0].path,'External','1').redo();
  await rename('Third');assert.equal(f.archive.records.length,3);
  const loaded=new StructureArchive(f.app,f.service,'plugin/history.json');await loaded.load();
  const reloadedHistory=new EditHistory(100,loaded);
  await reloadedHistory.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'Fourth','1'));
  assert.equal(loaded.records.length,4);
  await reloadedHistory.execute(makeStructureRestoreCommand(loaded,loaded.records[0].before));
  assert.equal(loaded.records.length,5);assert.equal(loaded.records.at(-1).kind,'restore');
  await reloadedHistory.undo();assert.equal(loaded.records.length,6);
  await reloadedHistory.execute(makeRenameCommand(f.app,f.service,f.files[0].path,'Fifth','1'));
  assert.equal(loaded.records.length,7);
  await loaded.close();await f.archive.close();
});
