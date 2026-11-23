'use strict';
const HOST = /^(?:[a-z0-9-]+\.)*amazon\.(?:com|co\.uk|ca|de|fr|it|es|com\.au|co\.jp|in)$/i;
const isSellerId = value => /^[A-Z0-9]{8,25}$/.test(String(value ?? ''));
const DEFAULTS = {enabled:true, sellerIds:['ADQRWGK1A469B'], brandNames:['AVIDLOVE'], keywords:[], deepCheck:true, minStars:0, hideUnrated:false, watchlistEnabled:false};
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const stored = await chrome.storage.local.get(null);
    const changes = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (!(key in stored)) changes[key] = value;
    }
    if (Array.isArray(stored.sellerIds) && stored.sellerIds.some(v => String(v).toUpperCase() === 'AVIDLOVE')) {
      changes.sellerIds = [...new Set([...stored.sellerIds.filter(v => String(v).toUpperCase() !== 'AVIDLOVE'), 'ADQRWGK1A469B'])];
      changes.brandNames = [...new Set([...(Array.isArray(stored.brandNames) ? stored.brandNames : []), 'AVIDLOVE'])];
    }
    if (Object.keys(changes).length) await chrome.storage.local.set(changes);
  } catch (error) { console.warn('Cart Bouncer settings migration:', error); }
});

// Only ever fetch canonical product pages on the same Amazon host as the sender.
function parseProductUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !HOST.test(url.hostname)) return null;
    const match = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (!match) return null;
    const asin = match[1].toUpperCase();
    return {url:`https://${url.hostname}/dp/${asin}`, key:`${url.hostname}:${asin}`};
  } catch { return null; }
}
function decodeEntities(text) {
  return text.replace(/&#x([a-f\d]+);/gi, (_,n) => String.fromCodePoint(parseInt(n,16)))
    .replace(/&#(\d+);/g, (_,n) => String.fromCodePoint(parseInt(n,10)))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_,n) => ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n.toLowerCase()]);
}
const strip = html => decodeEntities(String(html).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).slice(0,200);
function findSeller(html) {
  let id = null, name = null;
  // Prefer the explicit featured seller anchor, keeping the ID and name tied
  // to the same element instead of accidentally identifying a secondary offer.
  const featured = /<a\b(?=[^>]*\bid\s*=\s*["']sellerProfileTriggerId["'])[^>]*>[\s\S]{0,450}?<\/a>/i.exec(html);
  if (featured) {
    const tag = featured[0].slice(0, featured[0].indexOf('>') + 1);
    const match = /(?:[?&](?:seller|merchant|me)=)([A-Z0-9]{8,25})/i.exec(decodeEntities(tag));
    if (match && isSellerId(match[1].toUpperCase())) id = match[1].toUpperCase();
    const candidate = strip(featured[0].slice(tag.length, -4));
    if (candidate && !/^(?:seller|details|contact|about|visit the store)$/i.test(candidate)) name = candidate;
  }
  const blocks = [];
  for (const marker of ['sellerProfileTriggerId', 'merchant-info', 'shipsFromSoldBy_feature_div', 'desktop_buybox']) {
    const pos = html.indexOf(marker);
    if (pos >= 0) blocks.push(html.slice(Math.max(0,pos-250),pos+7500));
  }
  for (const part of [...blocks, html]) {
    if (!id) {
      const m = /href=["'][^"']*(?:[?&](?:seller|merchant|me)=)([A-Z0-9]{8,25})/i.exec(part)
        || /["'](?:merchantID|merchantId|sellerID|sellerId)["']\s*[:=]\s*["']([A-Z0-9]{8,25})["']/i.exec(part);
      if (m && isSellerId(m[1].toUpperCase())) id = m[1].toUpperCase();
    }
    if (!name) {
      // A named featured-offer anchor is much safer than an arbitrary shop link.
      const m = /<a\b(?=[^>]*\bid\s*=\s*["']sellerProfileTriggerId["'])[^>]*>([\s\S]{0,450}?)<\/a>/i.exec(part)
        || /<a\b(?=[^>]*\bhref\s*=\s*["'][^"']*\/(?:sp\?|gp\/help\/seller\/))[^>]*>([\s\S]{0,250}?)<\/a>/i.exec(part);
      if (m) {
        const candidate = strip(m[1]);
        if (candidate && !/^(?:seller|details|contact|about|visit the store)$/i.test(candidate)) name = candidate;
      }
    }
    if (id && name) break;
  }
  return {sellerId:id, sellerName:name};
}
const cache = new Map(), inFlight = new Map(), queue = [];
const TTL = 2*60*60*1000, MAX_ACTIVE = 3;
let active = 0;
function processQueue() {
  while (active < MAX_ACTIVE && queue.length) {
    const {job,resolve} = queue.shift(); active++;
    Promise.resolve().then(job).then(resolve, () => resolve({sellerId:null,sellerName:null}))
      .finally(() => {active--;processQueue();});
  }
}
function schedule(job) {return new Promise(resolve => {queue.push({job,resolve});processQueue();});}
async function getSeller(product) {
  const hit = cache.get(product.key);
  if (hit && Date.now()-hit.time<TTL) return hit.value;
  if (inFlight.has(product.key)) return inFlight.get(product.key);
  const task = schedule(async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),5000);
    try {
      const response = await fetch(product.url,{credentials:'include',signal:controller.signal,redirect:'follow'});
      if (!response.ok || !HOST.test(new URL(response.url).hostname)) return {sellerId:null,sellerName:null};
      const html = await response.text();
      if (/captcha|robot check|enter the characters you see below/i.test(html.slice(0,15000))) return {sellerId:null,sellerName:null};
      const value = findSeller(html);
      cache.set(product.key,{value,time:Date.now()});
      if (cache.size>500) cache.delete(cache.keys().next().value);
      return value;
    } catch {return {sellerId:null,sellerName:null};}
    finally {clearTimeout(timeout);}
  });
  inFlight.set(product.key,task);
  try {return await task;} finally {inFlight.delete(product.key);}
}
chrome.runtime.onMessage.addListener((message,sender,respond) => {
  if (message?.type!=='ALF_LOOKUP') return false;
  let senderHost;
  try {senderHost = new URL(sender.url).hostname;} catch {senderHost='';}
  const product = parseProductUrl(message.url);
  if (!product || !HOST.test(senderHost) || new URL(product.url).hostname!==senderHost) {
    respond({sellerId:null,sellerName:null});return false;
  }
  getSeller(product).then(respond,() => respond({sellerId:null,sellerName:null}));
  return true;
});
