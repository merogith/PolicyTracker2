// Uses an explicit Playwright module path supplied by the workspace runtime.
const {chromium}=require(process.env.POLICY_PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),path=require('path');const {pathToFileURL}=require('url');
(async()=>{
 const root=path.resolve(__dirname,'..'),temp=path.resolve(root,'../..','tmp/pdfs/v3');fs.mkdirSync(temp,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'visuals/dashboard-preview.html')).href);
 if(!String(await page.locator('#headlines').innerText()).includes('64'))throw Error('National denominator absent');
 await page.screenshot({path:path.join(temp,'dashboard-country.png'),fullPage:true});
 await page.locator('#toggleContext').click();if(!await page.locator('#context').isVisible())throw Error('Detail toggle failed');
 await page.locator('#coverage').selectOption('missing');if(await page.locator('#coverageNumber').innerText()!=='0–100%')throw Error('Unknown coverage misrepresented');
 await page.locator('#coverage').selectOption('complete');if(await page.locator('#coverageNumber').innerText()!=='60%')throw Error('Exact coverage wrong');
 await page.locator('[data-tab="region"]').click();
 await page.locator('[data-u="1"]').click();if(!(await page.locator('#heatDetail').innerText()).includes('not a zero'))throw Error('Unresolved not explained');
 const response=await page.locator('#heatRows').innerText();await page.locator('#regionalMetric').selectOption('detail');
 if(response===await page.locator('#heatRows').innerText())throw Error('Metric switch does not change data');
 await page.screenshot({path:path.join(temp,'dashboard-region.png'),fullPage:true});
 await page.locator('[data-tab="documents"]').click();await page.screenshot({path:path.join(temp,'dashboard-documents.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 for(const tab of ['country','region','documents','method']){
   await page.locator(`[data-tab="${tab}"]`).click();
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow: '+tab);
 }
 await page.locator('[data-tab="country"]').click();await page.screenshot({path:path.join(temp,'dashboard-mobile.png'),fullPage:true});
 for(const [name,w,h] of [['process-simple',1100,615],['process-technical',1270,1020]]){
   const p=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});
   await p.setContent('<html><body style="margin:0">'+fs.readFileSync(path.join(root,'visuals',name+'.svg'),'utf8')+'</body></html>');
   const overflow=await p.evaluate(()=>[...document.querySelectorAll('text')].filter(x=>x.getBBox().x+x.getBBox().width>document.querySelector('svg').width.baseVal.value).map(x=>x.textContent));
   if(overflow.length)throw Error('Diagram text overflow: '+overflow.join(';'));
   await p.screenshot({path:path.join(root,'visuals',name+'.png'),fullPage:false});await p.close();
 }
 await browser.close();if(errors.length)throw Error(errors.join('\n'));
 console.log('Preview: national denominator, context, bounds, metric switch, all four mobile views and both diagrams passed.');
})().catch(e=>{console.error(e);process.exit(1)});
