const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});
 try {
 const p=await b.newPage({viewport:{width:1200,height:600}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://xel92.github.io/**',async r=>{
   const url=new URL(r.request().url());
   const relative=url.pathname.replace('/my-first-project/','') || 'index.html';
   const file=path.resolve(relative);
   if(!file.startsWith(process.cwd()+path.sep)) return r.abort();
   await r.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'});
 });
 await p.route('https://widget.test/**',r=>r.fulfill({contentType:'text/html',body:'<style>'+fs.readFileSync('StreamElements-Live/CSS.txt','utf8')+'</style>'+fs.readFileSync('StreamElements-Live/HTML.txt','utf8')+'<script>'+fs.readFileSync('StreamElements-Live/JS.txt','utf8')+'</script>'}));
 await p.goto('https://widget.test/');
 await p.evaluate(()=>window.dispatchEvent(new CustomEvent('onWidgetLoad',{detail:{fieldData:{testName:'LIVE_TEST',nicknameColor:'#ff0000',greetingText:'Проверка подключения',soundVolume:0}}})));
 const frame=p.frameLocator('#dragon-live');
 await frame.locator('.greeting').getByText('Проверка подключения').waitFor();
 await p.evaluate(()=>window.dispatchEvent(new CustomEvent('onEventReceived',{detail:{listener:'widget-button',event:{field:'testFollower'}}})));
 await frame.locator('#widget.is-alert').waitFor();
 assert.equal(await frame.locator('#nickname').textContent(),'LIVE_TEST');
 assert.equal(await frame.locator('#nickname').evaluate(e=>getComputedStyle(e).color),'rgb(255, 0, 0)');
 assert.equal(await frame.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 await frame.locator('#widget.is-sleeping').waitFor();
 await p.evaluate(()=>window.dispatchEvent(new CustomEvent('onEventReceived',{detail:{listener:'follower-latest',event:{name:'EmulatedFollower'}}})));
 await frame.locator('#widget.is-alert').waitFor();
 assert.equal(await frame.locator('#nickname').textContent(),'EmulatedFollower');
 assert.deepEqual(errors,[]);
 console.log('PASS: iframe handshake, Fields, test event, nickname, greeting, color, transparent body, full cycle; local HTTP interception, not deployed Pages.');
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
