import {parseIndexedFile} from "../index/Exclusions.js";
import {settingsHash} from "./IndexService.js";

export function planStructureRestore(archive,snapshot) {
  const {app,service}=archive,settings=service.getSettings();
  const conflicts=[],entries=[];
  if(snapshot.hash!==settingsHash(settings)||!service.getIndex()||service.getIndex().stale||service.isRebuilding())conflicts.push({reason:'rules'});
  const paths=new Set(),numbers=new Map();
  for(const node of snapshot.nodes) {
    if(!node.path.endsWith('.md')||node.path.startsWith('/')||/[\\:*?"<>|\x00-\x1f]/.test(node.path)||node.path.split('/').some(part=>part==='.'||part==='..')){conflicts.push({reason:'rules',path:node.path});continue;}
    const file=archive.resolve(node.id);
    if(!file){conflicts.push({reason:'missing',path:node.path});continue;}
    if(file.path===node.path)continue;
    const basename=node.path.slice(node.path.lastIndexOf('/')+1,-3);
    const parsed=parseIndexedFile({path:node.path,basename},settings);
    if(!parsed.ok){conflicts.push({reason:'rules',path:node.path});continue;}
    const key=parsed.parsed.segments.join('/');
    if(paths.has(node.path)||numbers.has(key))conflicts.push({reason:'occupied',path:node.path});
    paths.add(node.path);numbers.set(key,file);
    entries.push({file,id:node.id,before:file.path,after:node.path});
  }
  const moving=new Set(entries.map(entry=>entry.file));
  for(const entry of entries){const occupied=app.vault.getAbstractFileByPath(entry.after);if(occupied&&!moving.has(occupied))conflicts.push({reason:'occupied',path:entry.after});}
  for(const file of app.vault.getMarkdownFiles()) {
    if(moving.has(file))continue;
    const p=parseIndexedFile(file,settings);
    if(p.ok&&numbers.has(p.parsed.segments.join('/')))conflicts.push({reason:'occupied',path:file.path});
  }
  return {entries,conflicts};
}
export function makeStructureRestoreCommand(archive,snapshot) {
  const plan=planStructureRestore(archive,snapshot);
  if(plan.conflicts.length)throw Error('archive.conflicts');
  if(!plan.entries.length)return null;
  const {app,service}=archive,entries=plan.entries;
  const hash=settingsHash(service.getSettings());
  const token=Date.now().toString(36)+Math.random().toString(36).slice(2);
  const apply=async reverse=>{
    if(service.editBatch||service.getIndex()?.stale||service.isRebuilding()||settingsHash(service.getSettings())!==hash)throw Error('edit.rules');
    const moving=new Set(entries.map(e=>e.file));
    for(const e of entries){
      const from=reverse?e.after:e.before,to=reverse?e.before:e.after;
      if(archive.resolve(e.id)!==e.file||e.file.path!==from)throw Error('edit.changed');
      const existing=app.vault.getAbstractFileByPath(to);if(existing&&!moving.has(existing))throw Error('edit.conflict');
    }
    const targetNumbers=new Set();
    for(const e of entries){const path=reverse?e.before:e.after;const basename=path.slice(path.lastIndexOf('/')+1,-3);const parsed=parseIndexedFile({path,basename},service.getSettings());if(!parsed.ok)throw Error('edit.rules');targetNumbers.add(parsed.parsed.segments.join('/'));}
    for(const file of app.vault.getMarkdownFiles()){if(moving.has(file))continue;const parsed=parseIndexedFile(file,service.getSettings());if(parsed.ok&&targetNumbers.has(parsed.parsed.segments.join('/')))throw Error('edit.conflict');}
    // Revalidate the restore direction, including numbering changes since the preview.
    if(!reverse&&planStructureRestore(archive,snapshot).conflicts.length)throw Error('archive.conflicts');
    const rename=async(e,path)=>{const old=e.file.path;await app.fileManager.renameFile(e.file,path);archive.changed(e.file,old);service.onRename(e.file,old);};
    const temp=(e,i,phase)=>e.before.slice(0,e.before.lastIndexOf('/')+1)+`.zettel-restore-${token}-${phase}-${i}.md`;
    service.editBatch=true;
    try {
      for(let i=0;i<entries.length;i++){const path=temp(entries[i],i,'stage');if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(entries[i],path);}
      for(const e of entries){const path=reverse?e.before:e.after;if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(e,path);}
      service.editBatchFlushing=true;await service.flush();
    } catch(error) {
      try {
        for(let i=0;i<entries.length;i++){const path=temp(entries[i],i,'rollback');if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(entries[i],path);}
        for(const e of entries){const path=reverse?e.after:e.before;if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(e,path);}
        service.editBatchFlushing=true;await service.flush();
      }catch{service.getIndex().stale=true;throw Error('move.rollbackFailed');}
      throw error;
    }finally{service.editBatch=false;service.editBatchFlushing=false;service.notifyViewStateChanged();}
  };
  const activePath=service.getViewState?.().activeFilePath;
  const selected=entries.find(e=>e.before===activePath)??entries[0];
  const numberAt=path=>parseIndexedFile({path,basename:path.slice(path.lastIndexOf('/')+1,-3)},service.getSettings()).parsed?.segments.join(service.getSettings().idSegmentDelimiter);
  return {kind:'restore',entries,beforeSelection:numberAt(selected.before),afterSelection:numberAt(selected.after),selection:numberAt(selected.after),redo:()=>apply(false),undo:()=>apply(true)};
}
