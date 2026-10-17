export function flatSnapshot(snapshot) {
  const actual=new Map(snapshot.nodes.map(node=>[node.segments.join('/'),node]));
  const tree=new Map();
  for(const node of snapshot.nodes)for(let i=1;i<=node.segments.length;i++){
    const segments=node.segments.slice(0,i),key=segments.join('/'),real=actual.get(key);
    if(!tree.has(key))tree.set(key,real?{...real,depth:i-1,key:real.id}:{id:'gap:'+key,key:'gap:'+key,title:'',path:'',segments,depth:i-1,placeholder:true});
  }
  return [...tree.values()].sort((a,b)=>{
    for(let i=0;i<Math.min(a.segments.length,b.segments.length);i++)if(a.segments[i]!==b.segments[i])return a.segments[i]-b.segments[i];
    return a.segments.length-b.segments.length;
  });
}
// Unique stable IDs permit an O(n log n) alignment using increasing common anchors.
export function alignStructure(before,after) {
  const left=flatSnapshot(before),right=flatSnapshot(after);
  const rightIndex=new Map(right.map((node,i)=>[node.key,i]));
  const matches=left.map((node,i)=>({left:i,right:rightIndex.get(node.key)})).filter(item=>item.right!==undefined);
  const tails=[],tailIndices=[],previous=[];
  for(let i=0;i<matches.length;i++) {
    let low=0,high=tails.length;
    while(low<high){const mid=(low+high)>>1;if(tails[mid]<matches[i].right)low=mid+1;else high=mid;}
    previous[i]=low?tailIndices[low-1]:-1;tails[low]=matches[i].right;tailIndices[low]=i;
  }
  const anchors=[];let cursor=tailIndices[tails.length-1];
  while(cursor!==undefined&&cursor>=0){anchors.push(matches[cursor]);cursor=previous[cursor];}anchors.reverse();
  const pairs=[];let l=0,r=0;
  for(const anchor of [...anchors,{left:left.length,right:right.length}]){
    while(l<anchor.left||r<anchor.right){
      // Different entries retain their own tree order; moved notes appear on both sides.
      pairs.push({left:l<anchor.left?left[l++]:null,right:r<anchor.right?right[r++]:null});
    }
    if(l<left.length&&r<right.length)pairs.push({left:left[l++],right:right[r++]});
  }
  const originals=new Map(before.nodes.map(node=>[node.id,node])),updates=new Map(after.nodes.map(node=>[node.id,node]));
  const change=node=>{
    if(!node||node.placeholder)return {};
    const old=originals.get(node.id),next=updates.get(node.id);
    return {added:!old,removed:!next,title:!!old&&!!next&&old.title!==next.title,number:!!old&&!!next&&old.idKey!==next.idKey,path:!!old&&!!next&&old.path!==next.path,moved:!!old&&!!next&&old.segments.slice(0,-1).join('/')!==next.segments.slice(0,-1).join('/')};
  };
  return pairs.map(pair=>({...pair,leftChange:change(pair.left),rightChange:change(pair.right)}));
}
export function textChanges(oldText,newText) {
  let prefix=0;while(prefix<Math.min(oldText.length,newText.length)&&oldText[prefix]===newText[prefix])prefix++;
  let suffix=0;while(suffix<oldText.length-prefix&&suffix<newText.length-prefix&&oldText[oldText.length-1-suffix]===newText[newText.length-1-suffix])suffix++;
  return {prefix:oldText.slice(0,prefix),old:oldText.slice(prefix,oldText.length-suffix),next:newText.slice(prefix,newText.length-suffix),suffix:suffix?oldText.slice(-suffix):''};
}
