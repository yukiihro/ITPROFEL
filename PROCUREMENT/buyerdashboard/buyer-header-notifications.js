/* UNIPROCUR_BUYER_GMAIL_BELL_V8: Added Gmail metadata notifications without changing Finance/Inventory actions. */
/* UniProcur Buyer bell notifications v1.
   Uses ONLY stored Finance decision audit rows and actual local Inventory GR rows.
   Does not generate demo events or call Finance approval/Inventory receiving actions. */
'use strict';
(() => {
  if (window.__uniProcurBuyerNotifications) return;
  window.__uniProcurBuyerNotifications = true;
  const ENDPOINT = '../database/buyer-notifications.php';
  const GMAIL_ENDPOINT = '../database/buyer-gmail-notifications.php';
  const GMAIL_MANAGE = '../database/buyer-gmail-connect.php?action=status';
  const state = { notifications:[], unread:0, csrf:'', gmailCsrf:'',gmailConnected:false,gmailConfigured:false,gmailAccount:'',busy:false, opened:false, error:'', warnings:[], sources:{} };
  let trigger, panel, badge, list, status, markAll, heading, gmailBar, pending;
  const make = (tag, cls, value) => {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (value !== undefined) element.textContent = String(value);
    return element;
  };
  function prettyDate(value) {
    const raw = String(value || '').trim();
    const dt = new Date(raw.replace(' ', 'T'));
    return Number.isNaN(dt.getTime()) ? raw : dt.toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  }
  function setBadge() {
    if (!badge) return;
    badge.hidden = !state.unread;
    badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
    if (trigger) trigger.setAttribute('aria-label', state.unread ? `Notifications, ${state.unread} unread` : 'Notifications, no unread messages');
  }
  function setPosition() {
    if (!trigger || !panel) return;
    const box = trigger.getBoundingClientRect();
    const width = Math.min(380, Math.max(280, window.innerWidth - 22));
    const left = Math.max(11, Math.min(window.innerWidth - width - 11, box.right - width));
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.min(window.innerHeight - 80, box.bottom + 12)}px`;
  }
  function render() {
    if (!list || !heading) return;
    heading.textContent = state.unread ? `Notifications (${state.unread} unread)` : 'Notifications';
    list.replaceChildren();
    markAll.disabled = state.busy || !state.notifications.some(n => !n.read);
    gmailBar.replaceChildren();
    const gmailText = state.gmailConnected
      ? `Buyer Gmail connected: ${state.gmailAccount}`
      : state.gmailConfigured ? 'Buyer Gmail not connected — sign in with Google to show Inbox alerts.'
                              : 'Buyer Gmail not set up — configure Google OAuth first.';
    gmailBar.append(make('span','uni-gmail-status',gmailText));
    const manage = make('a','uni-gmail-manage',state.gmailConnected ? 'Manage Gmail' : 'Connect Gmail');
    manage.href = GMAIL_MANAGE;
    gmailBar.append(manage);
    if (state.error) list.append(make('p','uni-notif-error',state.error));
    if (!state.notifications.length) {
      list.append(make('p','uni-notif-empty','No matching Gmail messages or saved Finance/Inventory notifications.'));
    } else {
      state.notifications.forEach(n => {
        const card = make('article','uni-notif-item' + (n.read ? '' : ' is-unread'));
        const top = make('div','uni-notif-item-top');
        const category = make('span','uni-notif-category',n.category);
        const when = make('time','uni-notif-time',prettyDate(n.occurred_at));
        top.append(category,when);
        const title = make('strong','uni-notif-title',n.title);
        const body = make('p','uni-notif-message',n.message);
        const actions = make('div','uni-notif-item-actions');
        const open = make('a','uni-notif-open','View details');
        // Only server-provided same-directory relative URLs are allowed.
        const gmailLink = n.type === 'gmail_inventory_report' && typeof n.url === 'string'
          && /^https:\/\/mail\.google\.com\/mail\//.test(n.url);
        if (gmailLink) {
          open.href=n.url;
          open.target='_blank';open.rel='noopener noreferrer';
          open.textContent='Open in Gmail';
        } else if (typeof n.url === 'string' && /^(?:award-confirmation|comparison-matrix|buyer-real-goods-receipts|buyer-view-purchase-order)\.html\?/.test(n.url)) {
          open.href=n.url;
        } else { open.href='buyer-dashboard.html'; }
        open.addEventListener('click', async e => {
          if (n.read) return;
          if (gmailLink) {
            // Open Gmail immediately; reading the notification does not change Gmail mail state.
            markRead([n.key]).catch(err=>console.warn('Mark Gmail notification read:',err));
            return;
          }
          e.preventDefault();
          const dest=open.href;
          try { await markRead([n.key]); } catch (err) { console.warn('Mark read before navigation:',err); }
          window.location.assign(dest);
        });
        actions.append(open);
        if (!n.read) {
          const read = make('button','uni-notif-mark','Mark read');
          read.type='button';
          read.addEventListener('click',async()=>{
            read.disabled=true;
            try { await markRead([n.key]); } catch(e) { state.error=e.message;render(); }
          });
          actions.append(read);
        }
        card.append(top,title,body,actions);
        list.append(card);
      });
    }
    if (state.warnings.length) {
      const wrapper=make('div','uni-notif-warnings');
      state.warnings.forEach(w=>wrapper.append(make('p','',w)));
      list.append(wrapper);
    }
  }
  async function fetchSource(url) {
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.success) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  }
  async function load() {
    if (pending || document.hidden) return;
    pending=true;
    try {
      const [native, gmail]=await Promise.allSettled([fetchSource(ENDPOINT),fetchSource(GMAIL_ENDPOINT)]);
      const merged=[];
      const warnings=[];
      if (native.status==='fulfilled') {
        const data=native.value;
        merged.push(...(Array.isArray(data.notifications)?data.notifications:[]));
        state.csrf=data.csrf_token||'';
        state.sources=data.source_status||{};
        warnings.push(...(Array.isArray(data.warnings)?data.warnings:[]));
      } else warnings.push('Original Finance / Inventory notification API is unavailable: '+native.reason.message);
      if (gmail.status==='fulfilled') {
        const data=gmail.value;
        merged.push(...(Array.isArray(data.notifications)?data.notifications:[]));
        state.gmailConnected=data.connected===true;
        state.gmailConfigured=data.configured===true;
        state.gmailAccount=data.account||'prbuyer026@gmail.com';
        state.gmailCsrf=data.csrf_token||'';
      } else warnings.push('Gmail notifications are temporarily unavailable: '+gmail.reason.message);
      merged.sort((a,b)=>{
        const aDate=Date.parse(String(a.occurred_at||'').replace(' ','T'))||0;
        const bDate=Date.parse(String(b.occurred_at||'').replace(' ','T'))||0;
        return bDate-aDate;
      });
      state.notifications=merged.slice(0,120);
      state.unread=state.notifications.filter(n=>!n.read).length;
      state.warnings=warnings;
      state.error=native.status==='rejected'&&gmail.status==='rejected' ? 'Both notification services are unavailable.' : '';
    } catch (err) {
      state.error=err.message||'Notifications could not be loaded.';
      console.warn('Buyer notifications:',err);
    } finally {
      pending=false;
      setBadge();
      if (state.opened) render();
    }
  }
  async function markRead(keys) {
    const nativeKeys=keys.filter(k=>!String(k).startsWith('gmail:'));
    const gmailKeys=keys.filter(k=>String(k).startsWith('gmail:'));
    const jobs=[];
    async function postKeys(endpoint,csrf,selected) {
      if (!selected.length) return;
      if (!csrf) throw new Error('Notification session unavailable. Reload this page.');
      const response=await fetch(endpoint,{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-Token':csrf},
        body:JSON.stringify({keys:selected})
      });
      const data=await response.json().catch(()=>({}));
      if (!response.ok||!data.success) throw new Error(data.message||'Could not mark notifications as read.');
    }
    if (nativeKeys.length) jobs.push(postKeys(ENDPOINT,state.csrf,nativeKeys));
    if (gmailKeys.length) jobs.push(postKeys(GMAIL_ENDPOINT,state.gmailCsrf,gmailKeys));
    await Promise.all(jobs);
    const readSet=new Set(keys);
    state.notifications.forEach(n=>{if(readSet.has(n.key)) n.read=true;});
    state.unread=state.notifications.reduce((sum,n)=>sum+(n.read?0:1),0);
    state.error='';
    setBadge();render();
  }
  function toggle(force) {
    state.opened=typeof force==='boolean'?force:!state.opened;
    panel.hidden=!state.opened;
    trigger.setAttribute('aria-expanded',String(state.opened));
    if(state.opened){setPosition();render();load();}
  }
  function init() {
    // Small style addon, without editing existing dashboard HTML.
    if (!document.querySelector('link[data-uniprocur-gmail-style]')) {
      const css=document.createElement('link');
      css.rel='stylesheet';css.href='buyer-gmail-bell-addon.css?v=8';
      css.dataset.uniprocurGmailStyle='1';
      document.head.append(css);
    }
    // Existing Figma headers vary: button, icon button, and non-interactive span.
    const header=document.querySelector('header');
    if(!header) return;
    let bell=header.querySelector('button#notificationButton, button#bellButton, button.notification-button, button.bell-button, button.br-bell, button.bell, .notification-button, .bell-button, .br-bell, .bell');
    if(!bell) return;
    if(bell.tagName.toLowerCase()!=='button') {
      const replacement=make('button',bell.className);
      replacement.type='button';
      replacement.classList.add('uni-notif-from-span');
      while (bell.firstChild) replacement.appendChild(bell.firstChild);
      replacement.setAttribute('aria-label','Notifications');
      bell.replaceWith(replacement);
      bell=replacement;
    }
    trigger=bell;
    trigger.type='button';
    trigger.classList.add('uni-notif-trigger');
    trigger.setAttribute('aria-haspopup','true');
    trigger.setAttribute('aria-expanded','false');
    trigger.removeAttribute('aria-hidden');
    trigger.removeAttribute('data-toast');
    // Existing hardcoded bell toast handlers must not run.
    trigger.addEventListener('click', e=>{
      e.preventDefault();e.stopImmediatePropagation();toggle();
    },true);
    badge=make('span','uni-notif-badge');
    badge.hidden=true;
    badge.setAttribute('aria-hidden','true');
    trigger.append(badge);

    panel=make('section','uni-notif-panel');
    panel.setAttribute('aria-label','Buyer notifications');
    panel.hidden=true;
    const head=make('div','uni-notif-head');
    heading=make('h2','uni-notif-heading','Notifications');
    const close=make('button','uni-notif-close','×');
    close.type='button';close.setAttribute('aria-label','Close notifications');
    close.addEventListener('click',()=>toggle(false));
    head.append(heading,close);
    status=make('p','uni-notif-subtitle','Finance, Manager, Inventory receipts and Buyer Gmail');
    gmailBar=make('div','uni-notif-gmailbar');
    list=make('div','uni-notif-list');
    markAll=make('button','uni-notif-mark-all','Mark all as read');
    markAll.type='button';markAll.disabled=true;
    markAll.addEventListener('click',async()=>{
      const keys=state.notifications.filter(n=>!n.read).map(n=>n.key);
      if (!keys.length) return;
      markAll.disabled=true;
      try { await markRead(keys); } catch(e) { state.error=e.message;render(); }
    });
    const foot=make('div','uni-notif-footer');foot.append(markAll);
    panel.append(head,status,gmailBar,list,foot);
    document.body.append(panel);
    document.addEventListener('click',e=>{
      if (state.opened && !panel.contains(e.target) && !trigger.contains(e.target)) toggle(false);
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.opened){toggle(false);trigger.focus();}});
    window.addEventListener('resize',()=>{if(state.opened)setPosition();});
    window.addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
    load();
    window.setInterval(load,30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
