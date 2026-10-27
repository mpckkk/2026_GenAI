(() => {
  const canvas = document.getElementById('cell-map');
  const status = document.getElementById('map-status');
  const caption = document.getElementById('map-caption');
  const buttons = [...document.querySelectorAll('[data-map-mode]')];
  const context = canvas.getContext('2d');
  let data;
  let mode = 'groups';

  function draw() {
    if (!data) return;
    const {width, height} = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const padding = width < 400 ? 28 : 38;
    const bounds = data.points.reduce((a,[x,y])=>[Math.min(a[0],x), Math.max(a[1],x), Math.min(a[2],y), Math.max(a[3],y)], [Infinity,-Infinity,Infinity,-Infinity]);
    const scale = Math.min((width-padding*2)/(bounds[1]-bounds[0]), (height-padding*2)/(bounds[3]-bounds[2]));
    const offsetX = (width-(bounds[1]-bounds[0])*scale)/2;
    const offsetY = (height-(bounds[3]-bounds[2])*scale)/2;
    const point = ([x,y])=>[offsetX+(x-bounds[0])*scale, height-offsetY-(y-bounds[2])*scale];
    const selected = data.clusters.findIndex(c=>c.id==='6');
    const radius = Math.max(1.05, Math.min(1.9,width/320));
    for (const entry of data.points) {
      const [x,y] = point(entry);
      context.beginPath(); context.arc(x,y,radius,0,Math.PI*2);
      context.fillStyle = mode==='candidate' ? (entry[2]===selected?'#245c35':'#e0e6dd') : '#aabbab';
      context.fill();
    }
    const labels = mode==='candidate' ? [selected] : data.clusters.map((_,i)=>i);
    for (const i of labels) {
      const group = data.points.filter(p=>p[2]===i);
      const xs=group.map(p=>p[0]).sort((a,b)=>a-b), ys=group.map(p=>p[1]).sort((a,b)=>a-b);
      const [x,y]=point([xs[Math.floor(xs.length/2)],ys[Math.floor(ys.length/2)]]);
      const label=mode==='candidate'?'Root hair?':data.clusters[i].id;
      context.font = (mode==='candidate'?'600 ':'')+(width<400?11:12)+'px Arial, sans-serif';
      const w=context.measureText(label).width+16;
      const lx=Math.min(width-w/2-2,Math.max(w/2+2,x));
      const ly=Math.max(14,Math.min(height-14,y));
      context.fillStyle='#fff'; context.fillRect(lx-w/2,ly-11,w,22);
      context.strokeStyle=mode==='candidate'?'#245c35':'#dbe2d9';context.lineWidth=.7;context.strokeRect(lx-w/2,ly-11,w,22);
      context.fillStyle='#245c35';context.textAlign='center';context.textBaseline='middle';context.fillText(label,lx,ly);
    }
    context.strokeStyle='#81917c';context.lineWidth=1;context.beginPath();context.moveTo(12,height-45);context.lineTo(12,height-17);context.lineTo(40,height-17);context.stroke();
    context.font='9px Arial, sans-serif';context.fillStyle='#606b61';context.textAlign='left';context.fillText('UMAP 1',12,height-5);
    context.save();context.translate(5,height-19);context.rotate(-Math.PI/2);context.fillText('UMAP 2',0,0);context.restore();
    caption.textContent=mode==='candidate'?'388 nuclei. A root-hair candidate to investigate.':'7,496 nuclei. 12 groups to investigate.';
    canvas.setAttribute('aria-label',mode==='candidate'?'Real soybean UMAP highlighting the 388 nuclei in source group 6. Root hair is a provisional suggestion from the recorded annotation.':'Real soybean UMAP showing all 7,496 nuclei and 12 numbered source groups.');
  }
  for (const button of buttons) button.addEventListener('click',()=>{
    mode=button.dataset.mapMode;
    for(const item of buttons)item.setAttribute('aria-pressed',String(item===button));
    draw();
  });
  new ResizeObserver(draw).observe(canvas);
  fetch('/images/soybean-root-umap.json').then(response=>{
    if(!response.ok)throw new Error('Dataset could not be loaded');
    return response.json();
  }).then(result=>{
    if (!context || result.points?.length!==7496 || result.clusters?.length!==12) throw new Error('Unexpected map data');
    const index=result.clusters.findIndex(c=>c.id==='6');
    if(index<0 || result.points.filter(p=>p[2]===index).length!==388)throw new Error('Group membership mismatch');
    data=result;status.hidden=true;for(const button of buttons)button.disabled=false;draw();
  }).catch(()=>{
    status.textContent='The cell map could not be loaded. Reload the page to try again.';
    canvas.setAttribute('aria-label','Cell map unavailable');
  });
})();
