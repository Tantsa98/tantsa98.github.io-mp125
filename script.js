// script.js
// Мінімалістична логіка: завантажує BK.csv та media-index.json і рендерить фільтри + галерею.
// Очікує, що BK.csv і media-index.json знаходяться в корені репо, а файли медіа — в папці /Media/

const CSV_PATH = './BK.csv';
const MEDIA_INDEX_PATH = './media-index.json';
const MEDIA_FOLDER = './Media/';

let items = [];         // parsed CSV rows
let mediaFiles = [];    // list of filenames in Media (from media-index.json)
let activeTypes = new Set();
let activeAffs = new Set();

document.addEventListener('DOMContentLoaded', init);

async function init(){
  try {
    const [csvText, mediaJson] = await Promise.all([
      fetchText(CSV_PATH),
      fetchJson(MEDIA_INDEX_PATH)
    ]);
    items = parseCSV(csvText);
    mediaFiles = Array.isArray(mediaJson) ? mediaJson : [];
    renderFilters();
    renderGallery();
    attachResetButtons();
    attachModalHandlers();
  } catch (err) {
    console.error(err);
    document.getElementById('gallery').innerHTML = `<div class="no-results">Помилка завантаження даних. Перевір шляхи до BK.csv та media-index.json в репозиторії.</div>`;
  }
}

async function fetchText(path){
  const r = await fetch(path);
  if(!r.ok) throw new Error('Fetch failed: ' + path);
  return await r.text();
}
async function fetchJson(path){
  const r = await fetch(path);
  if(!r.ok) throw new Error('Fetch failed: ' + path);
  return await r.json();
}

function parseCSV(text){
  // Простий CSV-парсер (коми, лапки підтримано мінімально)
  const lines = text.split(/\r?\n/).filter(l=>l.trim()!=='');
  if(lines.length < 1) return [];
  const headers = splitCSVLine(lines[0]).map(h=>h.trim());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cells = splitCSVLine(lines[i]);
    if(cells.length === 0) continue;
    const obj = {};
    for(let j=0;j<headers.length;j++){
      obj[headers[j]] = (cells[j] ?? '').trim();
    }
    rows.push(obj);
  }
  return rows;
}
function splitCSVLine(line){
  const res = [];
  let cur = '';
  let inQuotes = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"' ) { inQuotes = !inQuotes; continue; }
    if(ch === ',' && !inQuotes){ res.push(cur); cur=''; continue; }
    cur += ch;
  }
  if(cur !== '') res.push(cur);
  return res;
}

function uniqueValues(field){
  const s = new Set();
  items.forEach(it=>{
    const v = (it[field] ?? '').trim();
    if(v) s.add(v);
  });
  return Array.from(s).sort((a,b)=>a.localeCompare(b,'uk'));
}

function renderFilters(){
  const types = uniqueValues('Type');
  const affs = uniqueValues('Affiliation');

  const typeRoot = document.getElementById('filter-type');
  const affRoot = document.getElementById('filter-aff');

  typeRoot.innerHTML = '';
  affRoot.innerHTML = '';

  types.forEach(t=>{
    const id = `ft-${safeId(t)}`;
    const el = createCheckbox(id, t, ()=>toggleType(t));
    typeRoot.appendChild(el);
  });

  affs.forEach(a=>{
    const id = `fa-${safeId(a)}`;
    const el = createCheckbox(id, a, ()=>toggleAff(a));
    affRoot.appendChild(el);
  });
}

function createCheckbox(id, labelText, onChange){
  const wrapper = document.createElement('label');
  wrapper.className = 'filter-item';
  wrapper.innerHTML = `<input type="checkbox" id="${id}"> <span>${escapeHtml(labelText)}</span>`;
  const input = wrapper.querySelector('input');
  input.addEventListener('change', onChange);
  return wrapper;
}

function toggleType(value){
  const chk = document.querySelector(`#ft-${safeId(value)}`);
  if(chk.checked) activeTypes.add(value); else activeTypes.delete(value);
  renderGallery();
}

function toggleAff(value){
  const chk = document.querySelector(`#fa-${safeId(value)}`);
  if(chk.checked) activeAffs.add(value); else activeAffs.delete(value);
  renderGallery();
}

function attachResetButtons(){
  document.getElementById('resetType').addEventListener('click', ()=>{
    activeTypes.clear();
    document.querySelectorAll('#filter-type input[type=checkbox]').forEach(i=>i.checked=false);
    renderGallery();
  });
  document.getElementById('resetAff').addEventListener('click', ()=>{
    activeAffs.clear();
    document.querySelectorAll('#filter-aff input[type=checkbox]').forEach(i=>i.checked=false);
    renderGallery();
  });
}

function renderGallery(){
  const gallery = document.getElementById('gallery');
  const noResults = document.getElementById('no-results');
  gallery.innerHTML = '';

  const filtered = items.filter(it=>{
    const matchType = (activeTypes.size === 0) || activeTypes.has(it.Type);
    const matchAff = (activeAffs.size === 0) || activeAffs.has(it.Affiliation);
    return matchType && matchAff;
  });

  if(filtered.length === 0){
    noResults.hidden = false;
    return;
  }
  noResults.hidden = true;

  filtered.forEach(it=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="title">${escapeHtml(it.Name)}</div>
      <div class="type">${escapeHtml(it.Type)}</div>
    `;
    card.addEventListener('click', ()=>openModalFor(it));
    card.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') openModalFor(it); });
    gallery.appendChild(card);
  });
}

function openModalFor(item){
  document.getElementById('modalTitle').textContent = item.Name;
  document.getElementById('modalType').textContent = item.Type;
  document.getElementById('modalAff').textContent = item.Affiliation;
  document.getElementById('modalDesc').textContent = item.Desc || '';

  const mg = document.getElementById('mediaGallery');
  mg.innerHTML = '';

  // find media files that startWith imgId
  const prefix = item.imgId || '';
  if(prefix){
    const matches = mediaFiles.filter(f => f.toLowerCase().startsWith(prefix.toLowerCase()));
    if(matches.length === 0){
      mg.innerHTML = '<div class="no-results">Медіафайлів не знайдено.</div>';
    } else {
      matches.forEach(fname=>{
        const ext = fname.split('.').pop().toLowerCase();
        const wrapper = document.createElement('div');
        wrapper.className = 'media-item';
        if(['mp4','webm','ogg'].includes(ext)){
          const v = document.createElement('video');
          v.src = MEDIA_FOLDER + fname;
          v.controls = true;
          v.preload = 'metadata';
          wrapper.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = MEDIA_FOLDER + fname;
          img.alt = fname;
          wrapper.appendChild(img);
        }
        mg.appendChild(wrapper);
      });
    }
  } else {
    mg.innerHTML = '<div class="no-results">Не вказано imgId для цього запису.</div>';
  }

  document.getElementById('overlay').hidden = false;
}

function attachModalHandlers(){
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('closeModal');
  closeBtn.addEventListener('click', ()=> overlay.hidden = true);
  overlay.addEventListener('click', (e)=> {
    if(e.target === overlay) overlay.hidden = true;
  });
  document.addEventListener('keydown', (e)=> {
    if(e.key === 'Escape') overlay.hidden = true;
  });
}

/* Utilities */
function safeId(s){ return s.replace(/\s+/g,'_').replace(/[^\w\-]/g,'').toLowerCase(); }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); }); }
