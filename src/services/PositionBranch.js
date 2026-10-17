import {makeTreeEdit} from "./TreeEdit.js";
export function makePositionCommand(app,service,id,target,where) {
  return makeTreeEdit(app,service,{type:'position',id,target,where});
}
