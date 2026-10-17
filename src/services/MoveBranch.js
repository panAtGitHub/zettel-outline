import {makeTreeEdit} from "./TreeEdit.js";
export function makeMoveCommand(app,service,id,direction) {
  if(Array.isArray(direction)) {
    const delimiter=service.getSettings().idSegmentDelimiter;
    return makeTreeEdit(app,service,{type:'position',id,target:direction.length?direction.join(delimiter):null,where:direction.length?'inside':'after'});
  }
  return makeTreeEdit(app,service,{type:direction,id});
}
