<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificate Verification</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#3B2E26; --ink-2:#4E3B2F; --base:#FFFFFF; --nude:#F4E9DC; --nude-2:#EAD9C4;
    --line:#D9C4AA; --verified:#5F6E4C; --verified-dim:#4a5639; --void:#AD5F41; --gold:#C8A578; --ash:#8B7C6C;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{background:var(--base);color:var(--ink);font-family:'Inter',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}
  .ink-field{position:relative;overflow:hidden;background:radial-gradient(1200px 500px at 50% -10%, rgba(200,165,120,0.16), transparent 60%),linear-gradient(180deg, var(--nude) 0%, var(--base) 100%);}
  .ink-field::before{content:"";position:absolute; inset:0;background-image:url('data:image/png;base64,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');background-size:130px 150px;background-repeat:repeat;opacity:.5;mask-image:radial-gradient(900px 500px at 50% 10%, black, transparent 75%);pointer-events:none;}
  header.hero{padding:64px 24px 40px;text-align:center;position:relative;}
  .eyebrow{font-family:'IBM Plex Mono',monospace;letter-spacing:.22em;text-transform:uppercase;font-size:11px;color:var(--gold);margin-bottom:18px;}
  .eyebrow::before, .eyebrow::after{content:"— ";}
  .eyebrow::after{content:" —";}
  h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(30px,5vw,48px);line-height:1.08;margin:0 0 14px;letter-spacing:-0.01em;color:var(--ink);}
  header.hero p.sub{max-width:520px;margin:0 auto;color:#7C6C5C;font-size:15px;line-height:1.6;}
  .search-wrap{max-width:620px;margin:36px auto 0;padding:0 24px;position:relative;z-index:2;}
  .search-box{display:flex;align-items:center;gap:0;background:var(--base);border-radius:3px;box-shadow:0 20px 50px -25px rgba(59,46,38,.35), 0 0 0 1px var(--line);}
  .search-box input{flex:1;border:none;background:transparent;padding:18px 18px;font-family:'IBM Plex Mono',monospace;font-size:15px;color:var(--ink);outline:none;letter-spacing:.02em;}
  .search-box input::placeholder{color:#B0A08C;}
  .search-box button{border:none;background:var(--ink);color:var(--nude);font-family:'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;font-size:12px;padding:0 26px;height:58px;cursor:pointer;border-radius:0 3px 3px 0;transition:background .15s ease;}
  .search-box button:hover{background:var(--ink-2);}
  .search-hint{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#A69683;text-align:center;margin-top:12px;letter-spacing:.03em;}
  main{max-width:720px;margin:0 auto;padding:56px 24px 100px;min-height:340px;}
  .cert-card{background:var(--nude);color:var(--ink);border-radius:3px;position:relative;padding:38px 32px 32px;box-shadow:0 30px 60px -30px rgba(59,46,38,.35);animation:rise .5s cubic-bezier(.2,.8,.2,1);overflow:hidden;}
  @keyframes rise{from{opacity:0; transform:translateY(14px);}to{opacity:1; transform:translateY(0);}}
  .cert-card::before{content:"";position:absolute; inset:10px;border:1px solid var(--line);pointer-events:none;}
  .cert-card::after{content:"";position:absolute; inset:14px;border:1px solid var(--line);opacity:.6;pointer-events:none;}
  .cert-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;position:relative;z-index:1;}
  .cert-meta .label{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ash);margin-bottom:4px;}
  .cert-meta .name{font-family:'Fraunces',serif;font-size:24px;font-weight:500;margin:0 0 10px;line-height:1.15;color:var(--ink);}
  .cert-meta .sku{font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.03em;color:#6B5B4B;}
  .stamp{width:96px; height:96px;border-radius:50%;display:flex; align-items:center; justify-content:center;flex-shrink:0;transform:rotate(-9deg);animation:stampIn .45s .1s cubic-bezier(.35,1.6,.5,1) both;}
  @keyframes stampIn{from{transform:rotate(-9deg) scale(1.5); opacity:0;}to{transform:rotate(-9deg) scale(1); opacity:1;}}
  .stamp.verified{background:radial-gradient(circle, transparent 56%, var(--verified) 58% 62%, transparent 64%);color:var(--verified);border:2px solid var(--verified);box-shadow:inset 0 0 0 4px rgba(95,110,76,.12);}
  .stamp.void{color:var(--void);border:2px solid var(--void);box-shadow:inset 0 0 0 4px rgba(173,95,65,.1);}
  .stamp .stamp-text{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.06em;text-align:center;text-transform:uppercase;font-weight:600;line-height:1.25;}
  .cert-divider{height:1px;background:repeating-linear-gradient(90deg, var(--line) 0 6px, transparent 6px 11px);margin:26px 0 22px;position:relative;z-index:1;}
  .cert-image-frame{position:relative;z-index:1;border:1px solid var(--line);background:#fff;padding:8px;cursor:zoom-in;}
  .cert-image-frame img{display:block;width:100%;height:auto;}
  .cert-footnote{display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--ash);letter-spacing:.03em;position:relative; z-index:1;}
  .cert-footnote a{color:var(--ink); text-decoration:underline; cursor:pointer;}
  .not-found{background:var(--nude);color:var(--ink);border-radius:3px;padding:40px 32px;text-align:center;animation:rise .4s cubic-bezier(.2,.8,.2,1);position:relative;overflow:hidden;}
  .not-found::before{content:"";position:absolute; inset:10px; border:1px solid var(--line); pointer-events:none;}
  .not-found .stamp{margin:0 auto 18px;}
  .not-found h2{font-family:'Fraunces',serif;font-size:20px;font-weight:500;margin:0 0 8px;color:var(--void);}
  .not-found p{font-size:13.5px;color:#7C6C5C;max-width:380px;margin:0 auto;line-height:1.6;}
  .idle{text-align:center;padding:40px 20px;color:#8B7C6C;}
  .idle .glyph{width:52px; height:52px;margin:0 auto 18px;opacity:.55;}
  .idle p{font-size:13.5px; line-height:1.7; max-width:360px; margin:0 auto;}
  footer{text-align:center;padding:26px 24px 40px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em;color:#B0A08C;}
  .lightbox{position:fixed; inset:0;background:rgba(59,46,38,.75);display:none;align-items:center;justify-content:center;z-index:50;padding:40px 20px;cursor:zoom-out;}
  .lightbox.open{display:flex;}
  .lightbox img{max-width:min(720px,92vw);max-height:86vh;box-shadow:0 30px 80px rgba(59,46,38,.4);border-radius:2px;}
  @media (max-width:480px){.cert-top{flex-direction:row;}.stamp{width:76px; height:76px;}.search-box{flex-direction:column;}.search-box button{width:100%; height:48px; border-radius:0 0 3px 3px;}.search-box input{padding:16px;}}
</style>
</head>
<body>
<div class="ink-field">
  <header class="hero">
    <img src="data:image/png;base64,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" alt="Zupazupazuu logo" style="height:64px; width:auto; margin-bottom:22px;">
    <div class="eyebrow">Certificate Registry</div>
    <h1>Verify a Certificate of&nbsp;Authenticity</h1>
    <p class="sub">Enter the product's SKU or name exactly as printed on your item. We'll match it against our registry and display the certificate on file.</p>
  </header>
  <div class="search-wrap">
    <div class="search-box">
      <input id="searchInput" type="text" placeholder="e.g. 1 or product name" autocomplete="off">
      <button id="searchBtn">Verify</button>
    </div>
    <div class="search-hint">Search matches SKU or product name · not case sensitive</div>
  </div>
</div>
<main id="resultArea">
  <div class="idle" id="idleState">
    <svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="#8B7C6C" stroke-width="1.4">
      <circle cx="24" cy="20" r="14"/>
      <path d="M24 13v14M18 20h12" stroke-linecap="round"/>
      <path d="M14 33 8 44M34 33l6 11" stroke-linecap="round"/>
    </svg>
    <p>No certificate looked up yet. Type a SKU or product name above and press Verify.</p>
  </div>
</main>
<footer>REGISTRY LOOKUP VIA REGISTERED CERTIFICATE BACKEND</footer>
<div class="lightbox" id="lightbox">
  <img id="lightboxImg" src="" alt="Certificate full view">
</div>
<script>
const BACKEND_URL = 'https://backend-sertifikat-production.up.railway.app';
const input = document.getElementById('searchInput');
const btn = document.getElementById('searchBtn');
const resultArea = document.getElementById('resultArea');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
function normalize(s){ return (s || "").trim().toLowerCase(); }
async function findCertificate(query){
  const q = normalize(query);
  if(!q) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/certificates/search?q=${encodeURIComponent(q)}`);
    const matches = await res.json();
    return (matches && matches.length) ? matches[0] : null;
  } catch (err) { console.error('Lookup failed', err); return null; }
}
function renderVerified(cert){
  resultArea.innerHTML = `
    <div class="cert-card">
      <div class="cert-top">
        <div class="cert-meta">
          <div class="label">Registered Product</div>
          <p class="name">${cert.product_name}</p>
          <div class="sku">${cert.sku}</div>
        </div>
        <div class="stamp verified"><div class="stamp-text">Verified<br>Genuine</div></div>
      </div>
      <div class="cert-divider"></div>
      <div class="cert-image-frame" id="certImageFrame">
        <img src="${cert.photo_url}" alt="Certificate of authenticity for ${cert.product_name}">
      </div>
      <div class="cert-footnote">
        <span>Certificate on file · Registry Lookup</span>
        <a id="expandLink">View full size ↗</a>
      </div>
    </div>`;
  document.getElementById('certImageFrame').addEventListener('click', () => openLightbox(cert.photo_url));
  document.getElementById('expandLink').addEventListener('click', () => openLightbox(cert.photo_url));
}
function renderNotFound(query){
  resultArea.innerHTML = `
    <div class="not-found">
      <div class="stamp void" style="margin:0 auto 18px;"><div class="stamp-text">Not<br>Found</div></div>
      <h2>No certificate matched "${escapeHtml(query)}"</h2>
      <p>Double-check the SKU or product name against your item, or contact us if you believe this item should be registered.</p>
    </div>`;
}
function renderSearching(){ resultArea.innerHTML = `<div class="idle"><p>Searching…</p></div>`; }
function escapeHtml(s){ const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
async function doSearch(){
  const q = input.value;
  if(!normalize(q)){ return; }
  renderSearching();
  const cert = await findCertificate(q);
  if(cert){ renderVerified(cert); } else { renderNotFound(q); }
}
btn.addEventListener('click', doSearch);
input.addEventListener('keydown', e => { if(e.key === 'Enter') doSearch(); });
function openLightbox(src){ lightboxImg.src = src; lightbox.classList.add('open'); }
lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
</script>
</body>
</html>
