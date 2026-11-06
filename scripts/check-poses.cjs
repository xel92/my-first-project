const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
 try {
 const p = await browser.newPage({viewport:{width:1200,height:800}});
 await p.setContent(fs.readFileSync('/workspace/dragon-follower-widget-demo.html','utf8'));
 await p.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()));window.seen=[];new MutationObserver(()=>seen.push(document.querySelector('#widget').dataset.pose)).observe(document.querySelector('#widget'),{attributes:true,attributeFilter:['data-pose']});});
 await p.fill('#name','DragonFriend'); await p.click('button');
 await p.waitForTimeout(15000);
 const result=await p.evaluate(()=>({seen, state:document.querySelector('#widget').className,images:[...document.images].every(i=>i.complete&&i.naturalWidth)}));
 assert.deepEqual(result.seen,[]);
 assert.equal(await p.locator('.dragon-rig .rig-head').count(),1);
 assert.equal(await p.locator('img.dragon').count(),0);
 assert.equal(result.state,'widget is-sleeping');assert(result.images);
 console.log(JSON.stringify(result));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
