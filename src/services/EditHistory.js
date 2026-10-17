export class EditHistory {
  constructor(limit = 100, archive = null) { this.archive=archive; this.limit=limit; this.undoStack=[]; this.redoStack=[]; this.busy=false; }
  async run(action) {
    if (this.busy) throw new Error("history.busy");
    this.busy=true;
    try { return await action(); } finally { this.busy=false; }
  }
  async perform(command,direction,label) {
    const token=this.archive ? await this.archive.begin(label,command.kind==='restore') : null;
    try {await command[direction]();}
    catch(error){if(token)await this.archive.finish(token,'failed');throw error;}
    if(token)await this.archive.finish(token);
  }
  execute(command) {
    return this.run(async () => {
      await this.perform(command,"redo",command.kind ?? "edit");
      this.undoStack.push(command);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack=[];
      return command;
    });
  }
  undo() {
    return this.run(async () => {
      const command=this.undoStack.at(-1); if (!command) return;
      await this.perform(command,"undo","undo"); this.undoStack.pop(); this.redoStack.push(command); return command;
    });
  }
  redo() {
    return this.run(async () => {
      const command=this.redoStack.at(-1); if (!command) return;
      await this.perform(command,"redo","redo"); this.redoStack.pop(); this.undoStack.push(command); return command;
    });
  }
}
