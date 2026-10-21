(() => {
  'use strict';
  const {schools,photos}=window.PHOTO_EDITORIAL;
  const items=Object.values(photos).sort((a,b)=>{const aa=a.id.split('-').map(Number),bb=b.id.split('-').map(Number);return aa[0]-bb[0]||aa[1]-bb[1];}), storageKey='2604-caption-review-v1';
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let saved={};
  try { saved=JSON.parse(localStorage.getItem(storageKey)||'{}'); } catch { /* A new review remains available without saved drafts. */ }
  const drafts=Object.fromEntries(items.map(p=>[p.id,{caption:saved[p.id]?.caption??(p.caption||p.proposedCaption),schoolId:saved[p.id]?.schoolId??p.schoolId??'',confirmed:saved[p.id]?.confirmed??(p.status==='confirmed'),confirmedAt:saved[p.id]?.confirmedAt??null}]));
  const filter=document.querySelector('#activity-filter'), message=document.querySelector('#message');
  document.querySelector('.schools').innerHTML=schools.map(s=>`<a class="school" href="${escape(s.sourceUrl)}" target="_blank" rel="noopener noreferrer"><img src="../../${escape(s.logo)}" alt="${escape(s.name)}校徽"><span>${s.name}</span></a>`).join('');
  const activities=new Map(items.map(p=>[p.boardId,p.activityTitle]));
  filter.innerHTML='<option value="all">全部59张照片</option>'+[...activities].map(([id,title])=>`<option value="${id}">${id} ${escape(title)}</option>`).join('');
  filter.value='all';
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(drafts));}catch{message.textContent='浏览器无法保存草稿，请及时下载确认文件。';}}
  function progress(){const n=items.filter(p=>drafts[p.id].confirmed).length;document.querySelector('#progress').textContent=`已确认 ${n} / ${items.length} 张`;}
  function render(){
    document.querySelector('#photos').innerHTML=items.filter(p=>filter.value==='all'||p.boardId===filter.value).map(p=>{
      const draft=drafts[p.id], schoolField=p.boardId==='02'?`<label>这张照片归入哪所学校<select data-field="schoolId"><option value="">请逐张指定学校</option>${schools.map(s=>`<option value="${s.id}"${s.id===draft.schoolId?' selected':''}>${s.name}</option>`).join('')}</select></label>`:'';
      return `<article class="photo" data-id="${p.id}" data-confirmed="${draft.confirmed}"><div class="photo-head"><h2>照片 ${p.id}</h2><p>${escape(p.activityTitle)}</p></div><button type="button" class="image-button" aria-label="放大照片${p.id}"><img src="../../${escape(p.src.replace('assets/photos/','assets/previews/').replace(/\.[^.]+$/,'.webp'))}" alt="${escape(p.proposedCaption)}" loading="lazy"></button><div class="fields">${schoolField}<label>注释文字<textarea data-field="caption">${escape(draft.caption)}</textarea></label><label class="confirm"><input type="checkbox" data-field="confirmed"${draft.confirmed?' checked':''}>${p.boardId==='02'?'这张的注释与学校均已确认':'这张注释已确认'}</label></div></article>`;
    }).join('');progress();
  }
  filter.addEventListener('change',render);
  document.querySelector('#photos').addEventListener('input',e=>{
    const card=e.target.closest('.photo'),field=e.target.dataset.field;if(!card||!field)return;
    const id=card.dataset.id,draft=drafts[id];
    if(field==='confirmed'){
      if(e.target.checked&&(!draft.caption.trim()||(photos[id].boardId==='02'&&!draft.schoolId))){e.target.checked=false;message.textContent=`照片${id}需要先填写注释${photos[id].boardId==='02'?'并指定学校':''}。`;return;}
      draft.confirmed=e.target.checked;draft.confirmedAt=draft.confirmed?new Date().toISOString():null;
    }else{draft[field]=e.target.value;draft.confirmed=false;draft.confirmedAt=null;card.querySelector('[data-field="confirmed"]').checked=false;}
    card.dataset.confirmed=String(draft.confirmed);persist();progress();
  });
  const zoom=document.querySelector('#zoom');
  document.querySelector('#photos').addEventListener('click',e=>{const button=e.target.closest('.image-button');if(!button)return;const p=photos[button.closest('.photo').dataset.id];zoom.querySelector('img').src='../../'+p.src;zoom.querySelector('img').alt=p.proposedCaption;zoom.querySelector('p').textContent=`照片 ${p.id} · ${drafts[p.id].caption}`;zoom.showModal();});
  document.querySelector('#close-zoom').addEventListener('click',()=>zoom.close());
  document.querySelector('#export').addEventListener('click',()=>{
    const confirmed=items.filter(p=>drafts[p.id].confirmed).map(p=>({id:p.id,src:p.src,caption:drafts[p.id].caption.trim(),schoolId:drafts[p.id].schoolId||null,status:'confirmed',confirmedAt:drafts[p.id].confirmedAt}));
    if(!confirmed.length){message.textContent='请先逐张核对并勾选确认，再下载。';return;}
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,photos:confirmed},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='2604-confirmed-captions.json';link.click();URL.revokeObjectURL(url);message.textContent=`已导出${confirmed.length}张已确认注释。`;
  });
  render();
})();
