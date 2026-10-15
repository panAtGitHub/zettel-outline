import * as esbuild from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
const options = {entryPoints:['src/main.js'],bundle:true,format:'cjs',platform:'browser',target:'es2020',external:['obsidian'],outfile:'dist/main.js',sourcemap:false,logLevel:'info'};
await mkdir('dist',{recursive:true});
for(const file of ['manifest.json','styles.css']) await copyFile(file,'dist/'+file);
if(process.argv.includes('--watch')) { const context=await esbuild.context(options); await context.watch(); } else { await esbuild.build(options); await copyFile('dist/main.js','main.js'); }
