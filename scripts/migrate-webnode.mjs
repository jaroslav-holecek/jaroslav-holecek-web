import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';

const ROOT = process.cwd();
const BOOK_DIR = path.join(ROOT, 'src', 'content', 'books');
const MEDIA_DIR = path.join(ROOT, 'src', 'media');
const BASE = 'https://jaroslav-holecek.webnode.cz';

const sections = [
  
  ['Hinduismus', '/hinduismus/'],
  ['Taoismus', '/taoismus/'],
  ['Astrologie', '/astrologie/'],
  ['Rámakrišna', '/ramakrisnovo-evangelium/'],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = s => String(s || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
const slugify = s => clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const abs = u => new URL(u, BASE).href;

async function get(url, binary=false) {
  const r = await fetch(url, {headers:{'user-agent':'Mozilla/5.0 (compatible; JH-Webnode-Migration/1.0)'}});
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
}

function textLines($) {
  const lines = [];
  $('p,h1,h2,h3,li').each((_, el) => {
    const t = clean($(el).text());
    if (t) lines.push(t);
  });
  return [...new Set(lines)];
}
function parseDate(text) {
  const m = text.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';
}
function parsePages(text) {
  const m = text.match(/\b(\d{1,4})\s*\.?\s*stran(?:y|a)?\b/i);
  return m ? Number(m[1]) : undefined;
}
function pickCredits(lines) {
  return lines.find(x => /(přeložil|přeložila|překlad|digitaliz|sestavil|sestavila|upravil|upravila|revitalizace|do češtiny)/i.test(x) && x.length < 280) || '';
}
function pickAuthor(lines, title) {
  for (const x of lines) {
    if (x === title || x.length > 180) continue;
    const m = x.match(/^([^:]{2,70}):\s+/);
    if (m && !/(volně ke stažení|překlad|digitalizace|sestavil|upravil)/i.test(m[1])) return clean(m[1]);
  }
  return '';
}
function imageUrl($) {
  const attrs = ['src','data-src','data-original','data-srcset'];
  let best='';
  $('img').each((_, el) => {
    for (const a of attrs) {
      let u=$(el).attr(a)||'';
      if (!u) continue;
      u=u.split(/\s+/)[0];
      if (/cbaul-cdnwnd\.com|cdnwnd\.com/i.test(u) && !/logo|icon|favicon/i.test(u)) {
        if (!best || /cover/i.test(u)) best=abs(u);
      }
    }
  });
  return best;
}
function fileExt(url, contentType='') {
  const p = new URL(url).pathname.toLowerCase();
  if (p.endsWith('.png') || contentType.includes('png')) return '.png';
  if (p.endsWith('.webp') || contentType.includes('webp')) return '.webp';
  if (p.endsWith('.gif') || contentType.includes('gif')) return '.gif';
  return '.jpg';
}
async function saveImage(url, stem) {
  if (!url) return '';
  const r = await fetch(url, {headers:{'user-agent':'Mozilla/5.0'}});
  if (!r.ok) throw new Error(`image ${r.status}: ${url}`);
  const ext=fileExt(url, r.headers.get('content-type')||'');
  const name=`${stem}${ext}`;
  await fs.writeFile(path.join(MEDIA_DIR,name), Buffer.from(await r.arrayBuffer()));
  return `/media/${name}`;
}

async function existing(slug) {
  try { return JSON.parse(await fs.readFile(path.join(BOOK_DIR,`${slug}.json`),'utf8')); } catch { return {}; }
}

async function detail(url, category) {
  const html = await get(url);
  const $ = load(html);
  $('script,style,header,nav,footer,form').remove();
  const title = clean($('h1').first().text()) || clean($('title').text()).replace(/\s*::.*$/,'');
  const slug = new URL(url).pathname.split('/').filter(Boolean).pop() || slugify(title);
  const main = $('main').length ? $('main') : $('body');
  const allText = clean(main.text());
  const lines = textLines($);
  const date = parseDate(allText);
  const pages = parsePages(allText);
  const credits = pickCredits(lines);
  const author = pickAuthor(lines, title);
  const links = {pdf:'',epub:'',mobi:''};
  $('a[href]').each((_,a)=>{
    const href=$(a).attr('href')||'';
    if (!/webshare\.cz/i.test(href)) return;
    const label=clean($(a).text()).toLowerCase();
    if (/pdf/.test(label)) links.pdf=abs(href);
    else if (/epub/.test(label)) links.epub=abs(href);
    else if (/mobi/.test(label)) links.mobi=abs(href);
  });
  const skip = new RegExp(`^(${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}|\\d{1,2}\\.\\d{1,2}\\.\\d{4}|Jaroslav Holeček|Více|Menu|Obrázky poskytl.*|Vytvořeno službou.*|Volně ke stažení.*)$`,'i');
  const useful = lines.filter(x => !skip.test(x) && !/^PDF$|^EPUB$|^MOBI$/i.test(x));
  const narrative = useful.filter(x => x.length > 80 && x !== credits);
  const summary = narrative[0] || useful.find(x=>x.length>35 && x!==credits) || '';
  const body = narrative.slice(summary ? 1 : 0).join('\n\n');
  const old = await existing(slug);
  let cover = old.cover && String(old.cover).startsWith('/media/') ? old.cover : '';
  const remoteCover = imageUrl($);
  if (!cover && remoteCover) {
    try { cover = await saveImage(remoteCover, slug); } catch(e) { console.warn('Cover failed:', title, e.message); cover=remoteCover; }
  }
  return {
    title: title || old.title || slug,
    slug,
    category,
    date: date || old.date || '',
    author: author || old.author || '',
    pages: pages ?? old.pages,
    credits: credits || old.credits || '',
    cover: cover || old.cover || '',
    pdf: links.pdf || old.pdf || '',
    epub: links.epub || old.epub || '',
    mobi: links.mobi || old.mobi || '',
    summary: summary || old.summary || '',
    body: body || old.body || '',
    source_url: url
  };
}

async function collectDetailLinks(sectionUrl) {
  const html=await get(abs(sectionUrl));
  const $=load(html);
  const urls=[];
  $('a[href]').each((_,a)=>{
    const href=$(a).attr('href')||'';
    try {
      const u=new URL(href,BASE);
      if (u.hostname==='jaroslav-holecek.webnode.cz' && /^\/l\/[^/]+\/?$/.test(u.pathname)) urls.push(u.href);
    } catch {}
  });
  return [...new Set(urls)];
}

function digitalTitle($, img) {
  const bad=/^(Image|Jaroslav Holeček|Menu|Úvod|Informace|Buddhismus|Hinduismus|Taoismus|Astrologie|Digitalizace|Kontakt)$/i;
  let node=$(img);
  for(let depth=0; depth<6; depth++) {
    const parent=node.parent();
    if (!parent.length) break;
    const text=clean(parent.clone().find('img,script,style').remove().end().text());
    if (text && text.length<=180 && !bad.test(text) && !/Vytvořeno službou|Používáme cookies|Obrázky poskytl/i.test(text)) return text;
    node=parent;
  }
  const next=clean($(img).parent().next().text());
  return next && next.length<180 && !bad.test(next) ? next : '';
}

async function migrateDigitalizace() {
  const html=await get(`${BASE}/digitalizace/`);
  const $=load(html);
  let current='';
  const catMap={'Astrologie':'Astrologie','Buddhismus':'Buddhismus','Hinduismus':'Hinduismus','Taoismus':'Taoismus'};
  const entries=[];
  // Associate each cover with the nearest previous h1/h2 heading.
  $('h1,h2,img').each((_,el)=>{
    if (/^h[12]$/i.test(el.tagName)) {
      const t=clean($(el).text()); if (catMap[t]) current=t;
    } else if (current) {
      const src=$(el).attr('src')||$(el).attr('data-src')||$(el).attr('data-original')||'';
      if (!/cbaul-cdnwnd\.com|cdnwnd\.com/i.test(src) || /logo|icon|favicon/i.test(src)) return;
      const title=digitalTitle($,el);
      if (title) entries.push({title,source:abs(src),subcat:current});
    }
  });
  const seen=new Set(); let count=0;
  for (const e of entries) {
    const key=e.subcat+'|'+e.title; if(seen.has(key)) continue; seen.add(key);
    const slug='digitalizace-'+slugify(e.title);
    let cover='';
    const old=await existing(slug);
    if (old.cover && String(old.cover).startsWith('/media/')) cover=old.cover;
    if (!cover) { try { cover=await saveImage(e.source,slug); } catch(err){ console.warn('Digital cover failed:',e.title,err.message); cover=e.source; } }
    const data={title:e.title,slug,category:'Digitalizace',date:'',author:'',credits:`Digitalizace – ${e.subcat}`,cover,pdf:'',epub:'',mobi:'',summary:'',body:'',source_url:`${BASE}/digitalizace/`};
    await fs.writeFile(path.join(BOOK_DIR,`${slug}.json`),JSON.stringify(data,null,2)+'\n'); count++;
  }
  return count;
}

await fs.mkdir(BOOK_DIR,{recursive:true});
await fs.mkdir(MEDIA_DIR,{recursive:true});
let migrated=0, failed=0;
for (const [category, section] of sections) {
  console.log(`\n== ${category} ==`);
  let links=[];
  try { links=await collectDetailLinks(section); } catch(e) { console.error('Section failed:', section, e.message); failed++; continue; }
  console.log(`${links.length} detail pages found`);
  for (const url of links) {
    try {
      const b=await detail(url,category);
      await fs.writeFile(path.join(BOOK_DIR,`${b.slug}.json`),JSON.stringify(b,null,2)+'\n');
      console.log('OK',b.title);
      migrated++;
    } catch(e) { console.error('FAIL',url,e.message); failed++; }
    await sleep(120);
  }
}
let digital=0;
try { digital=await migrateDigitalizace(); console.log(`\nDigitalizace: ${digital} cover entries`); } catch(e) { console.error('Digitalizace failed:',e); failed++; }
console.log(`\nDONE: ${migrated} publications + ${digital} digitalization entries; ${failed} failures.`);
if (failed) process.exitCode=2;
