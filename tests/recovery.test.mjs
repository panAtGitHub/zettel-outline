import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseFileName } from '../src/index/Parser.js';
import { defaultSettings } from '../src/settings/Settings.js';
const api={Modal:class {},Menu:class {},setIcon(){},Plugin:class {},PluginSettingTab:class {},ItemView:class {},MarkdownView:class {},TFile:class {},Platform:{isMobileApp:false}};
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
const viewBuild = await build({stdin:{contents:'export * from "./src/view/VirtualTree.js"; export * from "./src/view/NoteCreation.js"; export * from "./src/view/deleteNoteFile.js";',resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',external:['obsidian'],write:false});
const {VirtualTree,occupiedNumbers,suggestNumber,noteBasename,deleteNoteFile} = evaluate(viewBuild.outputFiles[0].text).module.exports;
test('list style indents levels and displays local numbers while classic keeps its numbering', () => {
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
    ['100', {idKey:'100', segments:[100], title:'Root'}],
    ['100-2', {idKey:'100-2', segments:[100,2], title:'Child'}],
    ['100-2-3', {idKey:'100-2-3', segments:[100,2,3], title:'Grandchild'}]
  ]);
  const tree = new VirtualTree(new Element(), {
    getIndex: () => ({idIndex:nodes}), getViewState: () => ({}), getSettings: () => settings
  });
  tree.rootKey = '100';
  tree.visible = [...nodes.keys()].map((idKey, depth) => ({idKey, depth}));
  tree.activeId = '100-2';
  tree.renderWindow();
  const rows = tree.spacerEl.children;
  assert.deepEqual(rows.map(row => row.style.paddingLeft), [0,1,2].map(depth => `calc(16px + ${depth} * var(--zettel-outline-list-indent, 2em))`));
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
