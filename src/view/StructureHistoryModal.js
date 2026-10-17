import {Modal,Notice,setIcon} from "obsidian";
import {t} from "../i18n/i18n.js";
import {historyFor} from "../services/RenameNote.js";
import {planStructureRestore,makeStructureRestoreCommand} from "../services/RestoreStructure.js";
import {alignStructure,textChanges} from "./StructureDiff.js";

export class StructureHistoryModal extends Modal {
  constructor(app,service){super(app);this.service=service;this.archive=service.structureArchive;this.position=Math.max(0,(this.archive?.records.length??1)-1);this.closed=new Set();this.onlyChanges=true;this.confirm=null;}
  onOpen(){
    this.modalEl.addClass('zettel-outline-history-modal');
    this.contentEl.setAttribute('tabindex','-1');
    this.contentEl.addEventListener('keydown',event=>{
      if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();this.navigate(event.key==='ArrowLeft'?-1:1);}
    });
    this.unsubscribe=this.archive?.subscribe(()=>this.render());this.render();this.contentEl.focus({preventScroll:true});
  }
  onClose(){this.unsubscribe?.();}
  navigate(delta){this.position=Math.min(this.archive.records.length-1,Math.max(0,this.position+delta));this.confirm=null;this.closed.clear();this.render();this.contentEl.focus({preventScroll:true});}
  button(host,label,callback,icon){const button=host.createEl('button',{text:icon?'':label,attr:{'aria-label':label,title:label,type:'button'}});if(icon)setIcon(button,icon);button.addEventListener('click',callback);return button;}
  render(){
    const el=this.contentEl;el.empty();
    el.createEl('h3',{text:t(this.app,'archive.title')});
    const records=this.archive?.records??[];
    if(!records.length){el.createDiv({cls:'zettel-outline-history__empty',text:t(this.app,'archive.empty')});return;}
    this.position=Math.max(0,Math.min(this.position,records.length-1));
    const record=records[this.position];
    const bar=el.createDiv({cls:'zettel-outline-history__toolbar'});
    const prev=this.button(bar,t(this.app,'archive.previous'),()=>this.navigate(-1),'chevron-left');prev.disabled=this.position===0;
    const date=new Date(record.time).toLocaleString();
    bar.createDiv({cls:'zettel-outline-history__caption',text:`${date} · ${t(this.app,'archive.kind.'+record.kind)} · ${this.position+1} / ${records.length}`});
    const next=this.button(bar,t(this.app,'archive.next'),()=>this.navigate(1),'chevron-right');next.disabled=this.position===records.length-1;
    const filter=el.createEl('label',{cls:'zettel-outline-history__filter'});
    const check=filter.createEl('input',{attr:{type:'checkbox'}});check.checked=this.onlyChanges;filter.createSpan({text:t(this.app,'archive.onlyChanges')});
    check.addEventListener('change',()=>{this.onlyChanges=check.checked;this.render();});
    if(record.status!=='complete')el.createDiv({cls:'zettel-outline-history__warning',text:t(this.app,'archive.interrupted')});
    const headers=el.createDiv({cls:'zettel-outline-history__headers'});
    headers.createDiv({text:t(this.app,'archive.before')});headers.createDiv({text:t(this.app,'archive.after')});
    const scroller=el.createDiv({cls:'zettel-outline-history__scroll',attr:{tabindex:'0','aria-label':t(this.app,'archive.compare')}});
    const pairs=alignStructure(record.before,record.after);
    const before=new Map(record.before.nodes.map(n=>[n.id,n])),after=new Map(record.after.nodes.map(n=>[n.id,n]));
    const paths=[new Map(record.before.nodes.map(n=>[n.segments.join('/'),n.id])),new Map(record.after.nodes.map(n=>[n.segments.join('/'),n.id]))];
    const changed=new Set();
    for(const pair of pairs)for(const side of ['left','right'])if(Object.values(pair[side+'Change']).some(Boolean)&&pair[side])changed.add(pair[side].id);
    const relevant=new Set(changed);
    for(const snapshot of [record.before,record.after])for(const node of snapshot.nodes)if(changed.has(node.id))for(let i=1;i<node.segments.length;i++){
      const key=node.segments.slice(0,i).join('/');relevant.add(paths[0].get(key)??'gap:'+key);relevant.add(paths[1].get(key)??'gap:'+key);
    }
    const hidden=(node,side)=>{
      if(!node)return true;
      if(this.onlyChanges&&!relevant.has(node.id))return true;
      for(let i=1;i<node.segments.length;i++){const key=node.segments.slice(0,i).join('/');if(this.closed.has(paths[side].get(key)??'gap:'+key))return true;}
      return false;
    };
    for(const pair of pairs){
      const left=hidden(pair.left,0)?null:pair.left,right=hidden(pair.right,1)?null:pair.right;
      if(!left&&!right)continue;
      const row=scroller.createDiv({cls:'zettel-outline-history__pair'});
      this.cell(row,left,'left',pair.leftChange,after,record.before);
      this.cell(row,right,'right',pair.rightChange,before,record.after);
    }
    const footer=el.createDiv({cls:'zettel-outline-history__footer'});
    footer.createDiv({cls:'setting-item-description',text:t(this.app,'archive.scope')});
    const restore=this.button(footer,t(this.app,'archive.restore'),()=>{this.confirm=planStructureRestore(this.archive,record.before);this.render();});
    restore.disabled=this.busy||this.archive.disabled||!!this.service.editBatch||!!this.service.editHistory?.busy;
    if(this.confirm){
      const panel=el.createDiv({cls:'zettel-outline-history__confirmation',attr:{'aria-live':'polite'}});
      if(this.confirm.conflicts.length){
        panel.createDiv({text:t(this.app,'archive.blocked',{count:this.confirm.conflicts.length})});
        for(const conflict of this.confirm.conflicts.slice(0,20))panel.createDiv({text:t(this.app,'archive.reason.'+conflict.reason)+(conflict.path?' · '+conflict.path:'')});
      }else if(!this.confirm.entries.length)panel.createDiv({text:t(this.app,'archive.noChanges')});
      else {
        panel.createDiv({text:t(this.app,'archive.confirm',{count:this.confirm.entries.length})});
        const list=panel.createDiv({cls:'zettel-outline-history__plan'});
        for(const entry of this.confirm.entries)list.createDiv({text:entry.before+' → '+entry.after});
        const accept=this.button(panel,t(this.app,'archive.apply'),async()=>{
          if(this.busy)return;this.busy=true;accept.disabled=true;
          try{
            const command=makeStructureRestoreCommand(this.archive,record.before);
            if(command)await historyFor(this.service).execute(command);
            this.confirm=null;new Notice(t(this.app,'archive.restored'));this.render();
          }catch(error){new Notice(t(this.app,error.message));this.confirm=planStructureRestore(this.archive,record.before);}
          finally{this.busy=false;this.render();}
        });accept.disabled=!!this.busy;
      }
    }
  }
  cell(host,node,side,change,other,snapshot){
    const cell=host.createDiv({cls:'zettel-outline-history__cell'+(node?'':' is-blank')});
    if(!node)return;
    const modified=Object.values(change).some(Boolean);
    if(modified)cell.addClass(side==='left'?'is-before-change':'is-after-change');
    const line=cell.createDiv({cls:'zettel-outline-history__node'});line.style.paddingLeft=`${node.depth*20}px`;
    const hasChildren=snapshot.nodes.some(n=>n.segments.length>node.segments.length&&node.segments.every((v,i)=>n.segments[i]===v));
    const toggle=this.button(line,this.closed.has(node.id)?t(this.app,'tree.expandAll'):t(this.app,'tree.collapseAll'),()=>{
      const scroll=host.parentElement.scrollTop;
      if(this.closed.has(node.id))this.closed.delete(node.id);else this.closed.add(node.id);
      this.render();const scroller=this.contentEl.querySelector('.zettel-outline-history__scroll');if(scroller)scroller.scrollTop=scroll;
    },this.closed.has(node.id)?'chevron-right':'chevron-down');
    toggle.classList.add('zettel-outline-history__toggle');toggle.disabled=!hasChildren;if(!hasChildren)toggle.style.visibility='hidden';
    const counterpart=other.get(node.id);
    const number=line.createSpan({cls:'zettel-outline-history__number'});
    this.diffText(number,node.idKey??node.segments.join(snapshot.delimiter),counterpart?.idKey,side,change.number);
    const title=line.createSpan({cls:'zettel-outline-history__name'});
    this.diffText(title,node.title,counterpart?.title,side,change.title);
    if(change.moved)line.createSpan({cls:'zettel-outline-history__badge',text:t(this.app,'archive.moved')});
    if(change.added||change.removed)line.createSpan({cls:'zettel-outline-history__badge',text:t(this.app,change.added?'archive.added':'archive.removed')});
    if(modified&&node.path){const path=cell.createDiv({cls:'zettel-outline-history__path'});this.diffText(path,node.path,counterpart?.path,side,change.path);}
  }
  diffText(host,value,other,side,highlight){
    if(!highlight||other===undefined){host.createSpan({text:value});return;}
    const diff=side==='left'?textChanges(value,other):textChanges(other,value);
    host.createSpan({text:diff.prefix});host.createEl('mark',{text:side==='left'?diff.old:diff.next});host.createSpan({text:diff.suffix});
  }
}
