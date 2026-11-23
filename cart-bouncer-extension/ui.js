'use strict';
const DEFAULTS={enabled:true,sellerIds:['ADQRWGK1A469B'],brandNames:['AVIDLOVE'],keywords:[],deepCheck:true,minStars:0,hideUnrated:false,watchlistEnabled:false};
const $=id=>document.getElementById(id), fields=Object.keys(DEFAULTS);
let state={...DEFAULTS};
const sellerValid=value=>/^[A-Z0-9]{8,25}$/.test(value);
const allWatchlisted=Array.isArray(globalThis.ALF_WATCHLIST)?globalThis.ALF_WATCHLIST:[];
function parseSeller(raw){
  const input=String(raw??'').trim();if(!input)return null;
  if(/^https?:\/\//i.test(input)){
    try{const url=new URL(input);
      if(!/^(?:[a-z0-9-]+\.)*amazon\.(?:com|co\.uk|ca|de|fr|it|es|com\.au|co\.jp|in)$/i.test(url.hostname))return null;
      for(const key of ['seller','merchant','me']){
        const id=(url.searchParams.get(key)||'').toUpperCase();if(sellerValid(id))return id;
      }
    }catch{}return null;
  }
  const id=input.toUpperCase();return sellerValid(id)?id:null;
}
function normalize(raw){
  let ids=Array.isArray(raw.sellerIds)?raw.sellerIds.map(parseSeller).filter(Boolean):DEFAULTS.sellerIds;
  let brands=Array.isArray(raw.brandNames)?raw.brandNames.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):DEFAULTS.brandNames;
  if(ids.includes('AVIDLOVE')){ids=ids.filter(x=>x!=='AVIDLOVE');ids.push('ADQRWGK1A469B');brands.push('AVIDLOVE');}
  const dedupe=list=>[...new Map(list.map(x=>[x.toLocaleLowerCase(),x])).values()];
  return {
    enabled:raw.enabled!==false, deepCheck:raw.deepCheck!==false,
    sellerIds:[...new Set(ids)],brandNames:dedupe(brands),
    keywords:dedupe(Array.isArray(raw.keywords)?raw.keywords.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[]),
    minStars:[0,1,1.5,2,2.5,3,3.5,4,4.5].includes(Number(raw.minStars))?Number(raw.minStars):0,
    hideUnrated:raw.hideUnrated===true,watchlistEnabled:raw.watchlistEnabled===true
  };
}
function message(text,error=false){const target=$('message');if(!target)return;target.textContent=text;target.classList.toggle('error',error);}
function renderList(key,listId,countId){
  const target=$(listId);if(!target)return;
  target.replaceChildren();if($(countId))$(countId).textContent=`${state[key].length}`;
  if(!state[key].length){const li=document.createElement('li');li.className='empty';li.textContent='The list is blissfully empty.';target.append(li);return;}
  for(const value of state[key]){
    const li=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');
    name.textContent=value;remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${value}`);
    remove.addEventListener('click',async()=>{try{await chrome.storage.local.set({[key]:state[key].filter(x=>x!==value)});message(`Removed “${value}”.`);}catch{message('Could not save your change.',true);}});
    li.append(name,remove);target.append(li);
  }
}
function render(){
  for(const key of ['enabled','deepCheck','hideUnrated','watchlistEnabled'])if($(key))$(key).checked=state[key];
  if($('minStars'))$('minStars').value=String(state.minStars);
  renderList('brandNames','brandList','brandCount');renderList('sellerIds','sellerList','sellerCount');renderList('keywords','keywordList','keywordCount');
}
async function saveEntry(key,text){
  const value=String(text??'').trim();if(!value){message('Give me something to block first.',true);return false;}
  if(key==='sellerIds'){
    const id=parseSeller(value);
    if(!id){message('Seller IDs need 8–25 letters/digits, or an Amazon seller profile link.',true);return false;}
    if(id==='AVIDLOVE'){
      await chrome.storage.local.set({sellerIds:[...new Set([...state.sellerIds,'ADQRWGK1A469B'])],brandNames:[...new Set([...state.brandNames,'AVIDLOVE'])]});
      message('AVIDLOVE added as a brand with its known seller ID.');return true;
    }
    await chrome.storage.local.set({sellerIds:[...new Set([...state.sellerIds,id])]});
    message(`Seller ${id} has been shown the door.`);return true;
  }
  const item=state[key].filter(x=>x.toLocaleLowerCase()!==value.toLocaleLowerCase());
  await chrome.storage.local.set({[key]:[...item,value]});
  message(`“${value}” is off the guest list.`);return true;
}
function handleForm(formId,inputId,key){
  const form=$(formId);if(!form)return;
  form.addEventListener('submit',async event=>{
    event.preventDefault();try{if(await saveEntry(key,$(inputId).value))$(inputId).value='';}catch{message('Could not save the rule.',true);}
  });
}
handleForm('brandForm','brandInput','brandNames');handleForm('sellerForm','sellerInput','sellerIds');handleForm('keywordForm','keywordInput','keywords');
$('quickForm')?.addEventListener('submit',async event=>{
  event.preventDefault();try{if(await saveEntry($('quickType').value,$('quickInput').value))$('quickInput').value='';}catch{message('Could not save the rule.',true);}
});
$('quickType')?.addEventListener('change',()=>{$('quickInput').placeholder=({sellerIds:'e.g. A3EXAMPLESELLER',brandNames:'e.g. AVIDLOVE',keywords:'e.g. refurbished'})[$('quickType').value];});
for(const key of ['enabled','deepCheck','hideUnrated','watchlistEnabled']){
  $(key)?.addEventListener('change',async event=>{
    try{await chrome.storage.local.set({[key]:event.target.checked});message(key==='watchlistEnabled'?(event.target.checked?'Watchlist activated.':'Watchlist switched off.'):'Preference saved.');}
    catch{message('Could not save your preference.',true);}
  });
}
$('minStars')?.addEventListener('change',async event=>{
  try{await chrome.storage.local.set({minStars:Number(event.target.value)});message(Number(event.target.value)?`Below ${event.target.value} stars? No entry.`:'Rating filter is off.');}
  catch{message('Could not save rating limit.',true);}
});
for(const tab of document.querySelectorAll('[data-tab]'))tab.addEventListener('click',()=>{
  for(const other of document.querySelectorAll('[data-tab]')){const selected=other===tab;other.classList.toggle('active',selected);other.setAttribute('aria-selected',String(selected));}
  for(const panel of document.querySelectorAll('.tabpanel'))panel.hidden=panel.id!==`panel-${tab.dataset.tab}`;
});
$('options')?.addEventListener('click',()=>chrome.runtime.openOptionsPage());
function watchlistTable(){
  if($('watchlistCount'))$('watchlistCount').textContent=String(allWatchlisted.length);
  const holder=$('watchlistRows');if(!holder)return;
  for(const entry of allWatchlisted){
    const row=document.createElement('div');row.className='watchrow';
    const name=document.createElement('span'),pct=document.createElement('strong');
    name.textContent=entry.name;pct.textContent=`${entry.positive}% positive`;
    row.append(name,pct);holder.append(row);
  }
}
watchlistTable();
async function updateStats(){
  if(!$('statusText'))return;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id)throw Error('No active tab');
    const stats=await chrome.tabs.sendMessage(tab.id,{type:'ALF_STATS'});
    $('statusText').textContent=stats.enabled?`${stats.hidden} hidden · ${stats.reviewed} results checked`:'Bouncer is off duty';
  }catch{$('statusText').textContent='Open an Amazon search to see stats';}
}
$('recheck')?.addEventListener('click',async()=>{
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    await chrome.tabs.sendMessage(tab.id,{type:'ALF_RESCAN'});
    message('New guest-list check requested.');await updateStats();
  }catch{message('Open an Amazon search page first.',true);}
});
$('export')?.addEventListener('click',()=>{
  const file=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='cart-bouncer-rules.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);message('Rules exported. Packed lunch not included.');
});
$('import')?.addEventListener('click',()=>$('importFile')?.click());
$('importFile')?.addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{const raw=JSON.parse(await file.text());
    if(!raw||!Array.isArray(raw.sellerIds)||!Array.isArray(raw.keywords)||!Array.isArray(raw.brandNames))throw Error('Bad backup');
    await chrome.storage.local.set(normalize(raw));message('Imported rules. Previous personal lists replaced.');
  }catch{message('That JSON file is not a valid Cart Bouncer backup.',true);}
  event.target.value='';
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  for(const key of fields)if(key in changes)state[key]=changes[key].newValue===undefined?DEFAULTS[key]:changes[key].newValue;
  state=normalize(state);render();
  if('enabled' in changes)updateStats();
});
chrome.storage.local.get(DEFAULTS).then(raw=>{state=normalize(raw);render();updateStats();}).catch(()=>message('Unable to read Chrome extension storage.',true));
