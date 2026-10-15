import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const target=process.env.OBSIDIAN_PLUGIN_DIR?.trim() || (process.platform==='win32' ? 'C:/iWork/obsidian/.obsidian/plugins/zettel-outline' : '');
if(!target) throw new Error('Set OBSIDIAN_PLUGIN_DIR to the full vault plugin directory.');
await mkdir(target,{recursive:true});
for(const file of ['main.js','manifest.json','styles.css']) await copyFile(resolve(root,'dist',file),join(target,file));
console.log('Synced runtime files to '+target);
