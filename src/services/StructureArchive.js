import {parseIndexedFile} from "../index/Exclusions.js";
import {settingsHash} from "./IndexService.js";

const LIMIT=100, MAX_BYTES=5*1024*1024;
const GROUP_IDLE_MS=60_000;
const sameStructure=(a,b)=>a.hash===b.hash&&a.delimiter===b.delimiter&&JSON.stringify(a.nodes)===JSON.stringify(b.nodes);
const uid=()=>Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
export class StructureArchive {
  constructor(app,service,path,report=()=>{}) {
    this.app=app;this.service=service;this.path=path;this.report=report;
    this.records=[];this.registry={};this.identities=new WeakMap();this.listeners=new Set();
    this.queue=Promise.resolve();this.pending=null;this.timer=null;this.disabled=false;
    this.group=null;
  }
  async load() {
    const adapter=this.app.vault.adapter;
    let data=null,found=false;
    for(const path of [this.path,this.path+'.bak']) {
      if(!await adapter.exists(path))continue;found=true;
      try {
        const parsed=JSON.parse(await adapter.read(path));
        if(parsed.version!==1||!Array.isArray(parsed.records)||!parsed.registry||typeof parsed.registry!=="object")throw Error('archive.invalid');
        if(Object.values(parsed.registry).some(item=>!item||(item.path!==null&&typeof item.path!=='string')||typeof item.ctime!=='number'))throw Error('archive.invalid');
        const validSnapshot=snapshot=>snapshot&&typeof snapshot.hash==='string'&&typeof snapshot.delimiter==='string'&&Array.isArray(snapshot.nodes)&&snapshot.nodes.every(node=>node&&typeof node.id==='string'&&typeof node.path==='string'&&typeof node.title==='string'&&Array.isArray(node.segments)&&node.segments.length>0&&node.segments.every(n=>Number.isInteger(n)&&n>=0&&n<=9999));
        if(parsed.records.some(record=>!record||!validSnapshot(record.before)||!validSnapshot(record.after))||(parsed.pending&&!validSnapshot(parsed.pending.before)))throw Error('archive.invalid');
        data=parsed;break;
      } catch(error){this.report(error);}
    }
    if(found&&!data){this.disabled=true;this.report(Error('archive.unreadable'));return;}
    if(!data)return;
    this.records=data.records.slice(-LIMIT);this.registry=data.registry;
    for(const [id,item] of Object.entries(this.registry)) {
      const file=item.path&&this.app.vault.getAbstractFileByPath(item.path);
      if(file&&file.extension==='md'&&item.ctime>0&&file.stat?.ctime===item.ctime)this.identities.set(file,id);
    }
    if(data.pending) {
      const after=this.capture();
      this.records.push({...data.pending,after,status:'interrupted'});
      this.pending=null;await this.save();
    }
  }
  identify(file) {
    let id=this.identities.get(file);
    if(!id){id=uid();this.identities.set(file,id);}
    this.registry[id]={path:file.path,ctime:file.stat?.ctime??0};
    return id;
  }
  capture() {
    const settings=this.service.getSettings();
    const nodes=[];
    for(const file of this.app.vault.getMarkdownFiles()) {
      const parsed=parseIndexedFile(file,settings);if(!parsed.ok)continue;
      nodes.push({id:this.identify(file),path:file.path,title:parsed.parsed.title,idKey:parsed.parsed.idKey,segments:parsed.parsed.segments.slice()});
    }
    nodes.sort((a,b)=>a.path.localeCompare(b.path));
    return {hash:settingsHash(settings),delimiter:settings.idSegmentDelimiter,nodes};
  }
  async begin(kind,isolated=false) {
    if(this.disabled)throw Error('archive.unreadable');
    if(this.service.isRebuilding()||this.service.editBatch||this.service.creatingNote)throw Error('history.busy');
    const token={id:uid(),time:Date.now(),kind,before:this.capture()};
    const group=this.group;
    if(isolated||kind==='restore'||!group||token.time-group.lastTime>=GROUP_IDLE_MS||!sameStructure(group.after,token.before))this.group=null;
    token.isolated=isolated||kind==='restore';
    this.pending=token;
    // Write the pre-operation structure before modifying any note paths.
    try{await this.save();}catch(error){this.pending=null;throw error;}
    return token;
  }
  async finish(token,status='complete') {
    const after=this.capture();
    if(status==='complete'&&!token.isolated) {
      let group=this.group;
      if(!group)group={...token,after,status,lastTime:Date.now(),count:0};
      group.after=after;group.lastTime=Date.now();group.count++;
      if(group.count>1)group.kind='edit';
      const index=this.records.findIndex(record=>record.id===group.id);
      if(sameStructure(group.before,after)) {
        if(index>=0)this.records.splice(index,1);
      } else if(index>=0)this.records[index]=group;
      else this.records.push(group);
      // Keep the original baseline even if undo temporarily removes the record.
      this.group=group;
    } else {
      this.group=null;
      if(!sameStructure(token.before,after))this.records.push({...token,after,status});
    }
    this.pending=null;
    try{await this.save();}catch(error){this.report(error);}
    this.emit();
  }
  changed(file,oldPath,deleted=false) {
    let id=this.identities.get(file);
    if(!id&&oldPath)id=Object.keys(this.registry).find(key=>this.registry[key].path===oldPath&&this.registry[key].ctime>0&&file.stat?.ctime===this.registry[key].ctime);
    if(!id)return;
    this.identities.set(file,id);this.registry[id]={path:deleted?null:file.path,ctime:file.stat?.ctime??0};
    if(!this.pending){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.save().catch(this.report);},250);}
  }
  resolve(id) {
    const item=this.registry[id];if(!item?.path)return null;
    const file=this.app.vault.getAbstractFileByPath(item.path);
    return file&&file.extension==='md'&&this.identities.get(file)===id?file:null;
  }
  async save() {
    if(this.disabled)throw Error('archive.unreadable');
    while(this.records.length>LIMIT)this.records.shift();
    let text=JSON.stringify({version:1,records:this.records,registry:this.registry,pending:this.pending});
    while(text.length>MAX_BYTES/3&&this.records.length>1){this.records.shift();text=JSON.stringify({version:1,records:this.records,registry:this.registry,pending:this.pending});}
    const retained=new Set();
    for(const record of this.records)for(const snapshot of [record.before,record.after])for(const node of snapshot.nodes)retained.add(node.id);
    if(this.pending)for(const node of this.pending.before.nodes)retained.add(node.id);
    if(retained.size){for(const id of Object.keys(this.registry))if(!retained.has(id))delete this.registry[id];}
    text=JSON.stringify({version:1,records:this.records,registry:this.registry,pending:this.pending});
    const write=async()=>{
      const adapter=this.app.vault.adapter;
      if(await adapter.exists(this.path)) {
        const old=await adapter.read(this.path);
        try{const parsed=JSON.parse(old);if(parsed.version===1)await adapter.write(this.path+'.bak',old);}catch{}
      }
      await adapter.write(this.path,text);
    };
    this.queue=this.queue.catch(()=>{}).then(write);return this.queue;
  }
  emit(){for(const listener of this.listeners)listener();}
  subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  async close(){clearTimeout(this.timer);this.group=null;await this.save();}
}
