(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const tabs = [...document.querySelectorAll('[data-slide]')];
  const previous = document.getElementById('previous-slide');
  const next = document.getElementById('next-slide');
  const position = document.getElementById('slide-position');
  const dialog = document.getElementById('sources-dialog');
  const mobile = window.matchMedia('(max-width: 800px)');
  let active = Math.max(0, slides.findIndex(slide => '#'+slide.id === location.hash));

  function select(index, updateUrl = true) {
    active = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => slide.classList.toggle('current', i === active));
    tabs.forEach((tab, i) => i === active ? tab.setAttribute('aria-current', 'step') : tab.removeAttribute('aria-current'));
    previous.disabled = active === 0;
    next.disabled = active === slides.length - 1;
    position.textContent = `${String(active + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    if (updateUrl) history.replaceState(null, '', '#'+slides[active].id);
  }
  function fit() {
    document.body.classList.toggle('mobile-deck', mobile.matches);
    document.documentElement.style.setProperty('--scale', String(Math.min((innerWidth-96)/1280, (innerHeight-152)/720)));
  }
  previous.addEventListener('click', () => select(active - 1));
  next.addEventListener('click', () => select(active + 1));
  tabs.forEach(tab => tab.addEventListener('click', () => select(Number(tab.dataset.slide))));
  window.addEventListener('keydown', event => {
    if (mobile.matches || dialog.open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {event.preventDefault();select(active + 1);}
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {event.preventDefault();select(active - 1);}
    if (event.key === 'Home') {event.preventDefault();select(0);}
    if (event.key === 'End') {event.preventDefault();select(slides.length - 1);}
  });
  window.addEventListener('resize', fit);
  document.querySelector('[data-open-sources]').addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  document.body.classList.add('deck-ready');fit();select(active, false);

  const canvas = document.getElementById('cell-map');
  const status = document.getElementById('map-status');
  const context = canvas.getContext('2d');
  let data;
  function draw() {
    if (!data || !context || !canvas.clientWidth) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width*dpr);canvas.height = Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);
    const bounds = data.points.reduce((a,[x,y]) => [Math.min(a[0],x),Math.max(a[1],x),Math.min(a[2],y),Math.max(a[3],y)], [Infinity,-Infinity,Infinity,-Infinity]);
    const scale = Math.min((width-34)/(bounds[1]-bounds[0]),(height-38)/(bounds[3]-bounds[2]));
    const ox = (width-(bounds[1]-bounds[0])*scale)/2, oy = (height-(bounds[3]-bounds[2])*scale)/2;
    const point = ([x,y]) => [ox+(x-bounds[0])*scale,height-oy-(y-bounds[2])*scale];
    const group = data.clusters.findIndex(c => c.id === '6');
    for (const entry of data.points) {
      const [x,y] = point(entry);context.beginPath();context.arc(x,y,Math.max(1.15,width/330),0,Math.PI*2);
      context.fillStyle = entry[2] === group ? '#1b5e32' : '#c9d3c8';context.fill();
    }
    canvas.setAttribute('aria-label','Original soybean UMAP: 7,496 nuclei in 12 source groups. Green highlights source group 6, containing 388 nuclei. These are measured groups, not validated cell identities.');
  }
  new ResizeObserver(draw).observe(canvas);
  fetch('/images/soybean-root-umap.json').then(response => {
    if (!response.ok) throw new Error('Map data unavailable');return response.json();
  }).then(result => {
    const group = result.clusters?.findIndex(c => c.id === '6');
    if (!context || result.points?.length !== 7496 || result.clusters?.length !== 12 || group < 0 || result.points.filter(p => p[2] === group).length !== 388) throw new Error('Unexpected map data');
    data = result;status.hidden = true;draw();
  }).catch(() => {status.textContent='The map could not load. Reload to try again.';canvas.setAttribute('aria-label','Cell map unavailable');});
})();
