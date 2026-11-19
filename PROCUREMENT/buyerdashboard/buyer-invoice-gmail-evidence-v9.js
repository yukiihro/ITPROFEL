/* UniProcur v9: Gmail metadata assistance for the existing v7 discrepancy wizard.
 * This uses only the Gmail metadata already exposed by the v8 bell endpoint.
 * It never reads Gmail bodies, changes Inventory GR data, modifies invoice data,
 * or auto-confirms a 3-way match. */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.querySelector('dialog.disc-modal');
  const report = dialog && dialog.querySelector('#discMailPanel');
  if (!dialog || !report || document.getElementById('discGmailV9')) return;
  const subjectInput = report.querySelector('#discMailSubject');
  const senderInput = report.querySelector('#discMailSender');
  if (!subjectInput || !senderInput) return;

  const panel = document.createElement('section');
  panel.id = 'discGmailV9';
  panel.className = 'disc-gmail-v9';
  const title = document.createElement('strong');
  title.textContent = 'Find the matching Inventory email';
  const help = document.createElement('p');
  help.textContent = 'Select a connected Buyer Gmail notification to fill the email subject and sender. Open the original email to check dates, DR number, notes and delivered/accepted/rejected quantities.';
  const controls = document.createElement('div');
  controls.className = 'disc-gmail-v9-controls';
  const chooser = document.createElement('select');
  chooser.setAttribute('aria-label','Choose Inventory Gmail notification');
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'disc-gmail-v9-refresh';
  refresh.textContent = 'Refresh Gmail';
  const original = document.createElement('a');
  original.textContent = 'Open original email';
  original.target = '_blank';
  original.rel = 'noopener noreferrer';
  original.hidden = true;
  const status = document.createElement('p');
  status.className = 'disc-gmail-v9-status';
  status.setAttribute('role','status');
  controls.append(chooser,refresh,original);
  panel.append(title,help,controls,status);
  const fields = report.querySelector('.disc-edit-fields');
  report.insertBefore(panel,fields || report.firstChild);

  // Wording prevents the mistaken impression that Gmail metadata includes quantities.
  const legend = report.querySelector('legend');
  if (legend) legend.textContent = 'Inventory receiving report — choose email, verify actual quantities';
  let events = [];
  let lastLoaded = 0;
  const currentPO = () => String(document.getElementById('poReference')?.textContent || '').trim().replace(/\s/g,'');
  const addOption = (label,value) => {const option = document.createElement('option');option.textContent=label;option.value=value;chooser.append(option);};
  const isGmailUrl = u => typeof u==='string' && /^https:\/\/mail\.google\.com\/mail\//.test(u);
  async function reload() {
    refresh.disabled = true;
    status.textContent = 'Checking connected Buyer Gmail...';
    try {
      const r = await fetch('../database/buyer-gmail-notifications.php',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      const payload = await r.json().catch(()=>({}));
      if (!r.ok || !payload.success) throw new Error(payload.message || 'Gmail notification service unavailable');
      if (!payload.connected) {
        events=[];chooser.replaceChildren();addOption('Buyer Gmail is not connected','');
        status.textContent = 'Connect Gmail from the notification bell first.';
        original.hidden = true;
        return;
      }
      const reports=(Array.isArray(payload.notifications)?payload.notifications:[])
        .filter(n=>n.type==='gmail_inventory_report' && isGmailUrl(n.url));
      const po=currentPO().toLowerCase();
      // Matching PO first, without silently assuming unrelated messages belong to the invoice.
      events=reports.sort((a,b)=>{
        const aMatch=po && String(a.title+' '+a.message).toLowerCase().includes(po)?1:0;
        const bMatch=po && String(b.title+' '+b.message).toLowerCase().includes(po)?1:0;
        return bMatch-aMatch || (Date.parse(b.occurred_at||'')||0)-(Date.parse(a.occurred_at||'')||0);
      });
      chooser.replaceChildren();
      addOption('Select an Inventory email...','');
      for(let i=0;i<events.length;i++){
        const e=events[i];
        const match=po && String(e.title+' '+e.message).toLowerCase().includes(po);
        const display=(match?'[Matching PO] ':'')+String(e.title||'Inventory email').slice(0,115);
        addOption(display,String(i));
      }
      status.textContent = events.length
        ? 'Choose an email and compare it with this invoice. Quantities still require the original email or verified Inventory data.'
        : 'No matching Inventory email notifications found in the Buyer Gmail feed. Refresh after Inventory sends the report.';
      original.hidden=true;lastLoaded=Date.now();
    } catch (e) {
      status.textContent = 'Gmail lookup unavailable: '+String(e.message||e);
      chooser.replaceChildren();addOption('Gmail currently unavailable','');original.hidden=true;
    } finally {refresh.disabled=false;}
  }
  chooser.addEventListener('change',()=>{
    const i=chooser.value===''?NaN:Number(chooser.value);
    const n=Number.isInteger(i)?events[i]:null;
    if (!n) {original.hidden=true;return;}
    const fromMatch=String(n.message||'').match(/^From:\s*(.+?)(?:\s+·\s+|$)/);
    const from=fromMatch?fromMatch[1].trim():'';
    const bracketed=from.match(/<([^<>\s]+@[^<>\s]+)>/);
    const email=bracketed?bracketed[1]:from;
    if (n.title) subjectInput.value=String(n.title).slice(0,200);
    // Populate only an actual valid email; don't insert malformed display names.
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) senderInput.value=email;
    original.href=n.url;original.hidden=false;
    status.textContent='Email subject and sender filled. Check that the message relates to '+(currentPO()||'this invoice')+'. Read the original email for the true quantities; do not assume its date is the delivery date.';
    subjectInput.dispatchEvent(new Event('input',{bubbles:true}));
  });
  refresh.addEventListener('click',reload);
  const observer = new MutationObserver(() => {
    if (!dialog.open) return;
    if (!lastLoaded || Date.now()-lastLoaded>60000) reload();
  });
  observer.observe(dialog,{attributes:true,attributeFilter:['open']});
  addOption('Open discrepancy form to load Gmail','');
});
