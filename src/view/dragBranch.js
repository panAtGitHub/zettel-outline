export function dropParent(segments, sibling) {
  return sibling ? segments.slice(0,-1) : segments.slice();
}
export function projectDrop(segments, x, numberLeft, indent) {
  const width=Math.max(12,indent);
  const offset=(x-numberLeft)/width;
  const depth=Math.max(0,Math.min(segments.length,segments.length-1+Math.floor(offset+0.35)));
  const child=depth===segments.length;
  return {parent:segments.slice(0,depth),child,progress:Math.max(0,Math.min(1,(offset-0.15)/0.85))};
}
export function exceedsDragThreshold(start,x,y) { return Math.hypot(x-start.x,y-start.y)>=5; }
export function nearestDrop(candidates,x,y) {
  if(!candidates.length)return null;
  const distance=Math.min(...candidates.map(c=>Math.abs(c.y-y)));
  return candidates.filter(c=>Math.abs(c.y-y)<=distance+4).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
}
export function bindBranchDrag(tree, move, label, describe = () => "") {
  const viewport=tree.viewportEl,doc=viewport.ownerDocument,win=doc.defaultView;
  const line=tree.host.createDiv({cls:"zettel-outline__position-line"});
  const feedback=tree.host.createDiv({cls:"zettel-outline__drop-feedback"});
  let start=null,active=false,target=null,suppressUntil=0,frame=null,last=null;
  const end=()=>{
    if(active)suppressUntil=Date.now()+350;
    start=null;active=false;target=null;last=null;
    if(frame)win.cancelAnimationFrame(frame);frame=null;
    tree.draggingId=null;line.style.display="none";feedback.style.display="none";
    viewport.classList.remove("is-branch-dragging");
    for(const el of viewport.querySelectorAll(".is-drag-source,.is-drag-parent"))el.classList.remove("is-drag-source","is-drag-parent");
  };
  const candidates=()=>{
    const rect=viewport.getBoundingClientRect(),height=tree.indexService.getSettings().rowHeightPx;
    const font=parseFloat(win.getComputedStyle(viewport).fontSize)||16,indent=font*2;
    const origin=tree.listIndex.idIndex.get(start.id).segments;
    const rows=tree.visible;
    const result=[];
    for(let i=0;i<rows.length;i++){
      const row=rows[i],node=tree.listIndex.idIndex.get(row.idKey);
      if(origin.length<=node.segments.length&&origin.every((n,k)=>node.segments[k]===n))continue;
      let endIndex=i+1;while(endIndex<rows.length&&rows[endIndex].depth>row.depth)endIndex++;
      const x=rect.left+18+row.depth*indent;
      result.push({id:row.idKey,where:"before",x,y:rect.top+i*height-viewport.scrollTop,parent:node.segments.slice(0,-1)});
      result.push({id:row.idKey,where:"after",x,y:rect.top+endIndex*height-viewport.scrollTop,parent:node.segments.slice(0,-1)});
      result.push({id:row.idKey,where:"inside",x:x+indent,y:rect.top+endIndex*height-viewport.scrollTop,parent:node.segments});
    }
    return result.filter(c=>c.y>=rect.top-4&&c.y<=rect.bottom+4);
  };
  const update=(x,y)=>{
    const rect=viewport.getBoundingClientRect();
    if(x<rect.left-20||x>rect.right+20||y<rect.top-25||y>rect.bottom+25){target=null;line.style.display="none";feedback.style.display="none";return;}
    target=nearestDrop(candidates(),x,y);
    if(!target)return;
    line.style.display="block";line.style.left=target.x+"px";line.style.top=target.y+"px";line.style.width=Math.max(20,rect.right-target.x-8)+"px";
    const parent=tree.listIndex.idIndex.get(target.parent.join(tree.indexService.getSettings().idSegmentDelimiter));
    feedback.textContent=describe(target);
    feedback.style.display="block";
    for(const el of viewport.querySelectorAll(".is-drag-parent"))el.classList.remove("is-drag-parent");
    if(parent)for(const el of viewport.querySelectorAll("[data-outline-id]"))if(el.getAttribute("data-outline-id")===parent.idKey)el.classList.add("is-drag-parent");
  };
  const tick=()=>{
    if(!active||!last)return;
    const rect=viewport.getBoundingClientRect();
    const delta=last.y<rect.top+28?-8:last.y>rect.bottom-28?8:0;
    if(delta){viewport.scrollTop=Math.max(0,viewport.scrollTop+delta);update(last.x,last.y);}
    frame=win.requestAnimationFrame(tick);
  };
  const down=event=>{
    if(event.button!==0||tree.editing||tree.indexService.editBatch||tree.indexService.editHistory?.busy||event.target.closest("button,input"))return;
    if(!event.target.closest(".zettel-outline__tree-title,.zettel-outline__tree-number"))return;
    const row=event.target.closest("[data-outline-id]");if(!row)return;
    start={id:row.getAttribute("data-outline-id"),x:event.clientX,y:event.clientY};
  };
  const motion=event=>{
    if(!start)return;
    if(!active&&!exceedsDragThreshold(start,event.clientX,event.clientY))return;
    if(!active){
      active=true;viewport.classList.add("is-branch-dragging");
      const source=tree.listIndex.idIndex.get(start.id).segments;
      for(const row of viewport.querySelectorAll("[data-outline-id]")){
        const node=tree.listIndex.idIndex.get(row.getAttribute("data-outline-id"));
        if(node&&source.every((n,i)=>node.segments[i]===n))row.classList.add("is-drag-source");
      }
      frame=win.requestAnimationFrame(tick);
    }
    event.preventDefault();last={x:event.clientX,y:event.clientY};update(last.x,last.y);
  };
  const up=event=>{
    if(!start)return;
    if(!active){end();return;}
    event.preventDefault();update(event.clientX,event.clientY);
    const id=start.id,destination=target;end();
    if(destination)move(id,{target:destination.id,where:destination.where});
  };
  const key=event=>{if(active&&event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();end();}};
  const click=event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}};
  const native=event=>{if(start)event.preventDefault();};
  viewport.addEventListener("mousedown",down);viewport.addEventListener("dragstart",native);viewport.addEventListener("click",click,true);
  doc.addEventListener("mousemove",motion,true);doc.addEventListener("mouseup",up,true);win.addEventListener("keydown",key,true);win.addEventListener("blur",end);
  return ()=>{
    end();line.remove();feedback.remove();
    viewport.removeEventListener("mousedown",down);viewport.removeEventListener("dragstart",native);viewport.removeEventListener("click",click,true);
    doc.removeEventListener("mousemove",motion,true);doc.removeEventListener("mouseup",up,true);win.removeEventListener("keydown",key,true);win.removeEventListener("blur",end);
  };
}
