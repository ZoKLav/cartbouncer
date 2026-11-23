'use strict';
(() => {
  const DEFAULTS = {enabled:true,sellerIds:['ADQRWGK1A469B'],brandNames:['AVIDLOVE'],keywords:[],deepCheck:true,minStars:0,hideUnrated:false,watchlistEnabled:false};
  const PRODUCT = '[data-component-type="s-search-result"][data-asin], .s-main-slot .s-result-item[data-asin], .s-main-slot [data-component-type="sp-sponsored-result"]';
  const PROMO = '.s-main-slot .VIDEO_SINGLE_PRODUCT, .s-main-slot [data-csa-c-painter*="featured-brand"], .s-main-slot [cel_widget_id*="featured-brands"], .s-main-slot [id*="CardInstance"][class*="sb-desktop"]';
  const SELECTOR = `${PRODUCT}, ${PROMO}`;
  const list = Array.isArray(globalThis.ALF_WATCHLIST) ? globalThis.ALF_WATCHLIST : [];
  const fold = value => String(value??'').normalize('NFKC').toLocaleLowerCase();
  const sellerKey = value => fold(value).replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const validId = value => /^[A-Z0-9]{8,25}$/.test(String(value??''));
  const isProductPage = /\/(?:dp|gp\/product)\/[A-Z0-9]{10}/i.test(location.pathname);
  const states = new WeakMap();
  let config = DEFAULTS, epoch=0, scheduled=false;

  function normalize(raw) {
    const sellerIds = Array.isArray(raw.sellerIds) ? raw.sellerIds.filter(x=>typeof x==='string').map(x=>x.trim().toUpperCase()) : DEFAULTS.sellerIds;
    const oldBrand = sellerIds.includes('AVIDLOVE');
    return {
      enabled:raw.enabled!==false,
      deepCheck:raw.deepCheck!==false,
      sellerIds:[...new Set([...sellerIds.filter(x=>validId(x)&&x!=='AVIDLOVE'),...(oldBrand?['ADQRWGK1A469B']:[])])],
      brandNames:[...new Set([...(Array.isArray(raw.brandNames)?raw.brandNames:DEFAULTS.brandNames),...(oldBrand?['AVIDLOVE']:[])].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))],
      keywords:[...new Set((Array.isArray(raw.keywords)?raw.keywords:DEFAULTS.keywords).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))],
      minStars:[0,1,1.5,2,2.5,3,3.5,4,4.5].includes(Number(raw.minStars))?Number(raw.minStars):0,
      hideUnrated:raw.hideUnrated===true,
      watchlistEnabled:raw.watchlistEnabled===true
    };
  }
  function idFromURL(raw) {
    if (!raw) return null;
    try {
      const url = new URL(raw,location.href);
      for (const key of ['seller','merchant','me']) {
        const value=(url.searchParams.get(key)||'').toUpperCase();
        if (validId(value)) return value;
      }
    } catch {}
    return null;
  }
  function inlineSeller(card) {
    for (const attr of ['data-seller-id','data-merchant-id','data-seller','data-merchant']) {
      const id=(card.getAttribute(attr)||'').toUpperCase();
      if (validId(id)) return id;
    }
    for (const a of card.querySelectorAll('a[href*="seller="],a[href*="merchant="],a[href*="me="]')) {
      const id=idFromURL(a.getAttribute('href'));
      if(id) return id;
    }
    return null;
  }
  function inlineSellerName(card) {
    const attr=card.getAttribute('data-seller-name');
    if(attr) return attr.trim();
    const named=card.querySelector('a[id="sellerProfileTriggerId"], [data-cy="seller-name"]');
    if(named?.textContent?.trim()) return named.textContent.trim();
    const a=card.querySelector('a[href*="/sp?"],a[href*="seller="],a[href*="merchant="]');
    return a?.textContent?.trim()||null;
  }
  function titleText(card) {return card.querySelector('h2 a span, [data-cy="title-recipe"] h2, h2')?.textContent?.trim()||'';}
  function rating(card) {
    // Only recognized star-rating nodes, never prices/review counts/other numbers.
    const candidates=card.querySelectorAll('[aria-label*="out of 5"], [aria-label*="sur 5"], [aria-label*="von 5"], .a-icon-alt, [data-cy="reviews-block"] [aria-label]');
    for (const node of candidates) {
      const text=`${node.getAttribute('aria-label')||''} ${node.textContent||''}`;
      const m=/(?:^|\b)([0-5](?:[.,]\d)?)\s*(?:out of 5|sur 5|von 5|de 5|su 5|out of five)/i.exec(text);
      if (m) {
        const val=Number(m[1].replace(',','.'));
        if (val>=0&&val<=5) return val;
      }
    }
    return null;
  }
  function details(card) {
    const primaryTitle=titleText(card);
    const images=[...card.querySelectorAll('img[alt]')].slice(0,12).map(img=>img.getAttribute('alt')||'').filter(Boolean).join(' ');
    const stores=[...card.querySelectorAll('a[href*="/stores/"],a[href*="/sp?"],a[href*="merchant="]')].slice(0,10)
      .map(a=> {let path='';try{path=decodeURIComponent(new URL(a.getAttribute('href'),location.href).pathname);}catch{}return `${a.textContent} ${path}`;}).join(' ');
    const text=(card.textContent||'').slice(0,6000);
    const evidence=fold(`${primaryTitle} ${images} ${stores} ${text}`);
    const keywordText=fold(primaryTitle||(card.matches(PROMO)?`${text} ${images}`:images));
    const id=inlineSeller(card), sellerName=inlineSellerName(card), stars=rating(card);
    const asin=(card.getAttribute('data-asin')||'').toUpperCase();
    const href=card.querySelector('h2 a[href*="/dp/"],a[href*="/dp/"],a[href*="/gp/product/"]')?.getAttribute('href')||'';
    let link=null;
    if (href) {
      try {const u=new URL(href,location.href);if(u.protocol==='https:'&&u.hostname===location.hostname&&/\/(?:dp|gp\/product)\/[A-Z0-9]{10}/i.test(u.pathname)) link=u.href;} catch {}
    }
    if(!link&&/^[A-Z0-9]{10}$/.test(asin)) link=`https://${location.hostname}/dp/${asin}`;
    const ready=Boolean(primaryTitle||images||(card.matches(PROMO)&&text.trim()));
    const signature=`${evidence}|${id||''}|${sellerName||''}|${stars??'unrated'}|${href}|${asin}`;
    return {evidence,keywordText,id,sellerName,stars,link,ready,signature,promo:card.matches(PROMO)};
  }
  function containsAny(haystack,terms) {return terms.some(term=>haystack.includes(fold(term)));}
  function isWatchlisted(sellerName,sellerId) {
    if(!config.watchlistEnabled) return false;
    const key=sellerKey(sellerName);
    return list.some(entry=>(entry.sellerId&&entry.sellerId===sellerId)||(key&&sellerKey(entry.name)===key));
  }
  function isCurrent(card,stamp) {return card.isConnected&&states.get(card)===stamp&&stamp.epoch===epoch&&config.enabled;}
  function verdict(card,stamp,block,reason) {
    if(!isCurrent(card,stamp)) return;
    card.setAttribute('data-alf-reason',reason);
    card.setAttribute('data-alf-blocked',block?'yes':'no');
    card.setAttribute('data-alf-reviewed','yes');
  }
  function check(card,snap,stamp) {
    if (containsAny(snap.evidence,config.brandNames)) return verdict(card,stamp,true,'blocked brand/store');
    if (containsAny(snap.keywordText,config.keywords)) return verdict(card,stamp,true,'blocked keyword');
    if (snap.stars!==null&&config.minStars>0&&snap.stars<config.minStars) return verdict(card,stamp,true,'below minimum stars');
    if (snap.stars===null&&config.hideUnrated&&!snap.promo&&snap.ready) return verdict(card,stamp,true,'no rating');
    if (snap.id&&config.sellerIds.includes(snap.id)) return verdict(card,stamp,true,'blocked seller ID');
    if (isWatchlisted(snap.sellerName,snap.id)) return verdict(card,stamp,true,'optional seller watchlist');
    if(!snap.ready) {setTimeout(()=>verdict(card,stamp,false,'listing has no text yet'),1800);return;}
    if ((!config.sellerIds.length&&!config.watchlistEnabled)||!config.deepCheck||!snap.link) return verdict(card,stamp,false,'no matching rule');
    // Best-effort checks: avoid freezing results if seller info isn't available.
    setTimeout(()=>{if(isCurrent(card,stamp)&&card.getAttribute('data-alf-reviewed')!=='yes') verdict(card,stamp,false,'seller check pending');},1600);
    chrome.runtime.sendMessage({type:'ALF_LOOKUP',url:snap.link}).then(res=> {
      if(!isCurrent(card,stamp)) return;
      if(res?.sellerId&&config.sellerIds.includes(res.sellerId)) return verdict(card,stamp,true,'blocked seller lookup');
      if(isWatchlisted(res?.sellerName,res?.sellerId)) return verdict(card,stamp,true,'optional seller watchlist lookup');
      if(card.getAttribute('data-alf-reviewed')!=='yes') verdict(card,stamp,false,'seller not known / not blocked');
    }).catch(()=>verdict(card,stamp,false,'seller check unavailable'));
  }
  function scan() {
    scheduled=false;
    if(document.documentElement) document.documentElement.toggleAttribute('data-alf-disabled',!config.enabled);
    if(!config.enabled) return;
    for(const card of document.querySelectorAll(SELECTOR)) {
      if(card.parentElement?.closest(SELECTOR)) {
        // Outer sponsored container owns the decision; don't curtain its nested children.
        card.setAttribute('data-alf-reviewed','yes');
        continue;
      }
      const snap=details(card), old=states.get(card);
      if(old&&old.epoch===epoch&&old.signature===snap.signature) continue;
      const stamp={epoch,signature:snap.signature};
      states.set(card,stamp);
      card.removeAttribute('data-alf-reviewed');card.removeAttribute('data-alf-blocked');
      check(card,snap,stamp);
    }
  }
  function schedule(){if(!scheduled){scheduled=true;queueMicrotask(scan);}}
  function apply(raw) {
    config=normalize(raw); epoch++;
    document.documentElement?.toggleAttribute('data-alf-disabled',!config.enabled);
    if(!config.enabled){
      for(const card of document.querySelectorAll('[data-alf-blocked],[data-alf-reviewed]')) {
        card.removeAttribute('data-alf-blocked');card.setAttribute('data-alf-reviewed','yes');
      }
    }
    schedule();
    if(isProductPage) checkProductPage();
  }
  function stats(){
    const reviewed=[...document.querySelectorAll('[data-alf-reviewed="yes"]')].filter(c=>c.matches(SELECTOR)&&!c.parentElement?.closest(SELECTOR));
    return {hidden:reviewed.filter(c=>c.getAttribute('data-alf-blocked')==='yes').length,reviewed:reviewed.length,enabled:config.enabled};
  }
  chrome.runtime.onMessage.addListener((message,_sender,respond)=> {
    if(message?.type==='ALF_STATS'){respond(stats());return false;}
    if(message?.type==='ALF_RESCAN'){epoch++;schedule();respond({ok:true});return false;}
    return false;
  });
  chrome.storage.local.get(DEFAULTS).then(apply).catch(()=>apply(DEFAULTS));
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!Object.keys(DEFAULTS).some(key=>key in changes))return;
    const next={...config};
    for(const key of Object.keys(DEFAULTS))if(key in changes)next[key]=changes[key].newValue===undefined?DEFAULTS[key]:changes[key].newValue;
    apply(next);
  });
  new MutationObserver(schedule).observe(document,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['alt','title','aria-label','href','data-asin','data-brand','data-seller-name']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  function checkProductPage(){
    if(!isProductPage)return;
    const previous=document.getElementById('alf-product-warning');
    if(!config.enabled){previous?.remove();return;}
    const seller=document.querySelector('#sellerProfileTriggerId, #merchant-info a[href*="seller="], #shipsFromSoldBy_feature_div a[href*="seller="]');
    const id=idFromURL(seller?.getAttribute('href'));
    const byline=fold(`${document.querySelector('#bylineInfo')?.textContent||''} ${document.querySelector('#productTitle')?.textContent||''}`);
    const blockedBrand=containsAny(byline,config.brandNames);
    const blockedSeller=id&&config.sellerIds.includes(id);
    const watched=isWatchlisted(seller?.textContent,id);
    const avg=document.querySelector('#acrPopover .a-icon-alt')?.textContent||'';
    const ratingMatch=/([0-5](?:[.,]\d)?)\s*out of 5/i.exec(avg);
    const lowRated=ratingMatch&&config.minStars>0&&Number(ratingMatch[1].replace(',','.'))<config.minStars;
    const reason=blockedBrand?'brand/store':blockedSeller?'seller':watched?'watchlist seller':lowRated?'product rating':null;
    if(!reason){previous?.remove();return;}
    if(previous)return;
    const banner=document.createElement('div');banner.id='alf-product-warning';
    banner.textContent=`Cart Bouncer: this ${reason} matches a filter. The bouncer has concerns.`;
    banner.style.cssText='position:sticky;top:0;z-index:2147483647;background:#172235;color:#fff;padding:12px 18px;font:600 14px system-ui;text-align:center';
    (document.body||document.documentElement)?.prepend(banner);
  }
  if(isProductPage){
    new MutationObserver(checkProductPage).observe(document,{childList:true,subtree:true,characterData:true});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',checkProductPage,{once:true});
    else checkProductPage();
  }
})();
