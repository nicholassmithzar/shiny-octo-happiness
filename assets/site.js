// Titan website: remembers where a visitor came from (?ref=google, ?ref=flyer-preschool, ?ref=parents-<school>, ...)
// and sends the enquiry form to hello@ through Web3Forms. No cookies or trackers: the ref stays in this browser for 30 days.
(function () {
  var KEY = 'titan_ref', MAX_AGE = 30 * 864e5;
  var clean = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40); };
  var params = new URLSearchParams(location.search);
  var ref = clean(params.get('ref'));
  try {
    if (ref) localStorage.setItem(KEY, JSON.stringify({ ref: ref, at: Date.now() }));
    else {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && Date.now() - saved.at < MAX_AGE) ref = clean(saved.ref);
    }
  } catch (e) {}
  if (!ref && document.referrer) {
    var from = '';
    try { from = new URL(document.referrer).hostname; } catch (e) {}
    if (/(^|\.)google\./.test(from)) ref = 'google';
    else if (/(^|\.)(facebook|fb)\./.test(from)) ref = 'facebook';
  }

  // WhatsApp messages carry the ref too, so chats can be attributed when they're logged with /lead.
  if (ref) Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://wa.me/"]'), function (a) {
    try {
      var u = new URL(a.href);
      u.searchParams.set('text', (u.searchParams.get('text') || 'Hi Titan Hygiene') + ' (ref: ' + ref + ')');
      a.href = u.toString();
    } catch (e) {}
  });

  var form = document.getElementById('enquiry-form');
  if (!form) return;
  var key = form.getAttribute('data-key') || '';
  // No form key yet: hide the form; the WhatsApp, phone and email links below it still work.
  if (!key || key.indexOf('__') === 0) { form.hidden = true; return; }
  var status = document.getElementById('form-status');
  var type = form.querySelector('[name=type]');
  if (type && params.get('type')) type.value = params.get('type');

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = new FormData(form);
    var val = function (k) { return String(d.get(k) || '').trim(); };
    if (val('botcheck')) return;
    if (!val('name') || !val('suburb')) { status.textContent = 'Please add your name and suburb.'; return; }
    if (!val('email') && !val('phone')) { status.textContent = 'Please give us an email address or a phone number.'; return; }
    if (!val('consent')) { status.textContent = 'Please tick the box so we may contact you about your enquiry.'; return; }
    // The [ref= seg= pref=] tags in the subject tell the inbox where the enquiry came from.
    var tags = (ref ? ['ref=' + ref] : []).concat(['seg=' + (val('type') || 'preschool'), 'pref=' + (val('pref') || 'any')]);
    var data = { access_key: key, from_name: 'Titan website', subject: 'Website enquiry: ' + val('name').slice(0, 60) + ' [' + tags.join(' ') + ']' };
    d.forEach(function (v, k) { if (k !== 'botcheck') data[k] = v; });
    if (val('email')) data.replyto = val('email');
    data.ref = ref || 'none';
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    status.textContent = 'Sending…';
    fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.success) throw new Error(j.message || 'not sent');
        form.reset();
        status.textContent = "Thank you! We'll get back to you within one working day.";
      })
      .catch(function () { status.textContent = "Sorry, that didn't send. Please WhatsApp or call us on 073 233 7503."; })
      .then(function () { btn.disabled = false; });
  });
})();
