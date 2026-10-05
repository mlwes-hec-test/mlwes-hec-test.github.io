'use strict';
// Diagnostic preload: bounded aggregate only; no application data or retained snapshots.
const fs=require('node:fs'),path=require('node:path');
const start=process.memoryUsage(),peak={...start};let samples=0;
const timer=setInterval(()=>{const now=process.memoryUsage();samples++;for(const k of Object.keys(now))peak[k]=Math.max(peak[k],now[k]);},1000);timer.unref();
process.on('exit',()=>{if(!process.env.HEC_RESOURCE_DIRECTORY)return;const end=process.memoryUsage();for(const k of Object.keys(end))peak[k]=Math.max(peak[k],end[k]);fs.mkdirSync(process.env.HEC_RESOURCE_DIRECTORY,{recursive:true});fs.writeFileSync(path.join(process.env.HEC_RESOURCE_DIRECTORY,process.pid+'.json'),JSON.stringify({argv:process.argv,start,end,peak,samples,usage:process.resourceUsage()},null,2));});
