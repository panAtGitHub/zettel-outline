import {parseFileName} from "../index/Parser.js";
import {parseIndexedFile} from "../index/Exclusions.js";
import {buildListIndex} from "../view/ListIndex.js";
import {settingsHash} from "./IndexService.js";
const prefix=(a,b)=>a.length>=b.length&&b.every((n,i)=>n===a[i]);
const numberKey=parts=>parts.join('/');
export function makeTreeEdit(app,service,operation) {
  const settings=service.getSettings(),hash=settingsHash(settings),index=service.getIndex();
  if(!index||index.stale||service.isRebuilding()||service.editBatch)throw Error('edit.rules');
  const view=buildListIndex(index,settings.idSegmentDelimiter),nodes=new Map();
  const root={key:null,children:[],parent:null};
  for(const [key,node] of view.idIndex)nodes.set(key,{...node,key,local:node.segments.at(-1),children:[],parent:null});
  for(const node of nodes.values()){
    const parent=node.segments.length===1?root:nodes.get(node.segments.slice(0,-1).join(settings.idSegmentDelimiter));
    node.parent=parent;parent.children.push(node);
  }
  for(const node of [root,...nodes.values()])node.children.sort((a,b)=>a.local-b.local);
  const source=nodes.get(operation.id),target=nodes.get(operation.target);
  let selected=source,newNode=null,createdPlan=null;
  const compact=parent=>parent.children.forEach((child,i)=>{child.local=i+1;});
  const detach=node=>{node.parent.children.splice(node.parent.children.indexOf(node),1);};
  const insert=(node,parent,position)=>{node.parent=parent;parent.children.splice(position,0,node);};
  const ensureSource=()=>{if(!source)throw Error('edit.missing');};
  const move=(parent,position)=>{
    ensureSource();if(parent!==root&&prefix(parent.segments,source.segments))throw Error('move.cycle');
    const old=source.parent,oldIndex=old.children.indexOf(source);
    if(old===parent&&oldIndex<position)position--;
    if(old===parent&&position===oldIndex)return false;
    detach(source);insert(source,parent,position);compact(old);compact(parent);return true;
  };
  let changed=true;
  if(operation.type==='outdent'){
    ensureSource();const parent=source.parent;if(parent===root)throw Error('move.topLevel');
    changed=move(parent.parent,parent.parent.children.indexOf(parent)+1);
  }else if(operation.type==='indent'){
    ensureSource();const siblings=source.parent.children,position=siblings.indexOf(source);
    if(position<1)throw Error('move.noPrevious');const parent=siblings[position-1];changed=move(parent,parent.children.length);
  }else if(operation.type==='position'){
    ensureSource();if(operation.target&&!target)throw Error('edit.missing');
    if(target&&prefix(target.segments,source.segments))throw Error('move.cycle');
    const parent=operation.where==='inside'?target:target?.parent??root;
    const position=operation.where==='inside'||!target?parent.children.length:parent.children.indexOf(target)+(operation.where==='after'?1:0);
    changed=move(parent,position);
  }else if(operation.type==='create'){
    const mode=operation.mode;
    if(mode!=='root')ensureSource();
    if(mode==='parent'){
      if(source.parent!==root&&!source.parent.filePath){newNode=source.parent;selected=newNode;}
      else{
        const parent=source.parent,position=parent.children.indexOf(source);
        newNode={key:'new',local:source.local,children:[],parent};
        parent.children.splice(position,1,newNode);source.parent=newNode;source.local=1;newNode.children.push(source);selected=newNode;
      }
    }else if(mode==='fill'){
      if(source.filePath)throw Error('create.conflict');newNode=source;selected=source;
    }else{
      const parent=mode==='child'?source:mode==='sibling'?source.parent:root;
      const position=operation.position??(mode==='sibling'?parent.children.indexOf(source)+1:parent.children.length);
      if(!Number.isInteger(position)||position<0||position>parent.children.length)throw Error('create.invalidNumber');
      newNode={key:'new',local:position+1,children:[],parent};insert(newNode,parent,position);compact(parent);selected=newNode;
    }
    if(newNode?.filePath)throw Error('create.conflict');
  }else throw Error('edit.invalid');
  if(!changed)return null;
  const mapping=new Map();
  const visit=(parent,parts)=>{if(parent.children.length>9999)throw Error('move.full');for(const node of parent.children){node.after=[...parts,node.local];if(node.key!=='new')mapping.set(node.key,node.after);visit(node,node.after);}};
  visit(root,[]);
  const basename=(title,parts)=>settings.idPosition==='prefix'?`${parts.join(settings.idSegmentDelimiter)}${settings.titleDelimiter}${title}`:`${title}${settings.titleDelimiter}${parts.join(settings.idSegmentDelimiter)}`;
  const validatePath=(path,segments,title)=>{
    const name=path.slice(path.lastIndexOf('/')+1,-3);
    if(!path.endsWith('.md')||/[\\:*?"<>|\x00-\x1f]/.test(path)||path.split('/').some(p=>p==='.'||p==='..')||/[. ]$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))throw Error('create.invalidTitle');
    const parsed=parseIndexedFile({path,basename:name},settings);
    if(!parsed.ok||numberKey(parsed.parsed.segments)!==numberKey(segments)||parsed.parsed.title!==title)throw Error('move.excluded');
  };
  const all=app.vault.getMarkdownFiles().flatMap(file=>{const p=parseFileName(file.basename,settings);return p.ok?[{file,p:p.parsed}]:[];});
  const prefixMaps=[...mapping].map(([key,to])=>({from:key.split(settings.idSegmentDelimiter).map(Number),to})).sort((a,b)=>b.from.length-a.from.length);
  const entries=[];
  for(const {file,p} of all){
    const map=prefixMaps.find(item=>prefix(p.segments,item.from));
    const afterParts=map?[...map.to,...p.segments.slice(map.from.length)]:null;
    if(!afterParts||numberKey(afterParts)===numberKey(p.segments))continue;
    if(!parseIndexedFile(file,settings).ok)throw Error('move.excluded');
    const after=file.path.slice(0,file.path.lastIndexOf('/')+1)+basename(p.title,afterParts)+'.md';validatePath(after,afterParts,p.title);
    entries.push({file,before:file.path,after,oldId:numberKey(p.segments),newId:numberKey(afterParts)});
  }
  if(newNode){
    const title=operation.title?.trim();if(!title)throw Error('create.needTitle');
    const folder=operation.folder??'';
    const path=(folder&&folder!=='/'?folder+'/':'')+basename(title,newNode.after)+'.md';validatePath(path,newNode.after,title);
    createdPlan={path,number:numberKey(newNode.after)};
  }
  if(!entries.length&&!createdPlan)return null;
  const token=Math.random().toString(36).slice(2),affected=new Set(entries.map(e=>e.file));
  let createdFile=null;
  const apply=async reverse=>{
    if(service.editBatch||service.isRebuilding()||service.getIndex()?.stale||settingsHash(service.getSettings())!==hash)throw Error('edit.rules');
    const moving=new Set(affected);if(reverse&&createdFile)moving.add(createdFile);
    if(reverse&&createdPlan){if(!createdFile||app.vault.getAbstractFileByPath(createdPlan.path)!==createdFile)throw Error('edit.changed');if((await app.vault.read(createdFile))!=='')throw Error('create.undoHasContent');}
    const paths=new Set(),ids=new Set();
    for(const e of entries){
      const from=reverse?e.after:e.before,to=reverse?e.before:e.after,id=reverse?e.oldId:e.newId;
      if(e.file.path!==from||app.vault.getAbstractFileByPath(from)!==e.file)throw Error('edit.changed');
      const existing=app.vault.getAbstractFileByPath(to);if((existing&&!moving.has(existing))||paths.has(to)||ids.has(id))throw Error('edit.conflict');
      paths.add(to);ids.add(id);
    }
    if(!reverse&&createdPlan){const existing=app.vault.getAbstractFileByPath(createdPlan.path);if((existing&&!moving.has(existing))||paths.has(createdPlan.path)||ids.has(createdPlan.number))throw Error('edit.conflict');ids.add(createdPlan.number);}
    for(const file of app.vault.getMarkdownFiles()){
      if(moving.has(file))continue;const parsed=parseFileName(file.basename,settings);if(!parsed.ok)continue;const key=numberKey(parsed.parsed.segments);
      if(ids.has(key)||entries.some(e=>prefix(parsed.parsed.segments,(reverse?e.newId:e.oldId).split('/').map(Number))))throw Error('move.conflict');
    }
    const rename=async(file,path)=>{const old=file.path;await app.fileManager.renameFile(file,path);service.onRename(file,old);};
    const temp=(path,i,phase)=>path.slice(0,path.lastIndexOf('/')+1)+`.zettel-edit-${token}-${phase}-${i}.md`;
    const originalCreated=createdFile;
    service.editBatch=true;
    try{
      if(reverse&&createdFile){const path=temp(createdPlan.path,0,'parent');if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(createdFile,path);}
      for(let i=0;i<entries.length;i++){if(settingsHash(service.getSettings())!==hash||service.getIndex()?.stale||service.isRebuilding())throw Error('edit.rules');const expected=reverse?entries[i].after:entries[i].before;if(entries[i].file.path!==expected||app.vault.getAbstractFileByPath(expected)!==entries[i].file)throw Error('edit.changed');const path=temp(entries[i].before,i,'stage');if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(entries[i].file,path);}
      for(const e of entries){const path=reverse?e.before:e.after;if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(e.file,path);}
      if(!reverse&&createdPlan){if(app.vault.getAbstractFileByPath(createdPlan.path))throw Error('edit.conflict');createdFile=await app.vault.create(createdPlan.path,'');service.onCreate(createdFile);}
      service.editBatchFlushing=true;await service.flush();
      if(reverse&&createdFile){await app.fileManager.trashFile(createdFile);service.structureArchive?.changed(createdFile,createdFile.path,true);service.onDelete(createdFile);createdFile=null;}
    }catch(error){
      service.editBatchFlushing=false;
      try{
        if(!reverse&&createdFile&&createdFile!==originalCreated){if((await app.vault.read(createdFile))!=='')throw Error('create.undoHasContent');await app.fileManager.trashFile(createdFile);service.onDelete(createdFile);createdFile=null;}
        for(let i=0;i<entries.length;i++){const path=temp(entries[i].before,i,'rollback');if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(entries[i].file,path);}
        for(const e of entries){const path=reverse?e.after:e.before;if(app.vault.getAbstractFileByPath(path))throw Error('edit.conflict');await rename(e.file,path);}
        if(reverse&&originalCreated){if(!app.vault.getAbstractFileByPath(originalCreated.path))throw Error('edit.missing');if(app.vault.getAbstractFileByPath(createdPlan.path)&&originalCreated.path!==createdPlan.path)throw Error('edit.conflict');if(originalCreated.path!==createdPlan.path)await rename(originalCreated,createdPlan.path);createdFile=originalCreated;}
        service.editBatchFlushing=true;await service.flush();
      }catch{service.getIndex().stale=true;throw Error('move.rollbackFailed');}
      throw error;
    }finally{service.editBatch=false;service.editBatchFlushing=false;service.notifyViewStateChanged();}
  };
  const beforeSelection=source?.segments.join(settings.idSegmentDelimiter),afterSelection=selected?.after.join(settings.idSegmentDelimiter);
  return {kind:operation.type==='create'?'create'+operation.mode:operation.type==='position'?'move':operation.type,entries,createdPlan,beforeSelection,afterSelection,selection:afterSelection,getCreatedFile:()=>createdFile,redo:()=>apply(false),undo:()=>apply(true)};
}
