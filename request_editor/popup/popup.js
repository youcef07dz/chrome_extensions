var tabId = parseInt(new URLSearchParams(window.location.search).get('tabId'));
var isOn = false;
var requestCount = 0;
var globalHeaders = [];
var autoFwdEnabled = false;
var autoFwdHeaders = [];

if (!tabId || isNaN(tabId)) {
  document.body.innerHTML = '<div style="padding:20px;color:#ef4444;font-size:14px;">Error: Invalid tab ID. Close this window and click the extension icon again.</div>';
  throw new Error('Invalid tabId');
}

function base64Encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

window.addEventListener('beforeunload', function () {
  if (isOn) {
    chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.disable', function () {});
  }
});

window.addEventListener('load', function () {
  document.getElementById('toggleIntercept').addEventListener('change', function () {
    if (this.checked) { enableInterception(); }
    else { disableInterception(); }
  });

  document.getElementById('clearBtn').addEventListener('click', clearAll);
  document.getElementById('urlFilter').addEventListener('input', filterRequests);

  document.getElementById('forwardAllBtn').addEventListener('click', forwardAllRequests);
  document.getElementById('dropAllBtn').addEventListener('click', dropAllRequests);

  document.getElementById('globalHeaderToggle').addEventListener('click', function () {
    var panel = document.getElementById('globalHeaderPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') {
      document.getElementById('globalHeaderInput').focus();
    }
  });

  document.getElementById('applyGlobalHeaders').addEventListener('click', function () {
    var text = document.getElementById('globalHeaderInput').value;
    globalHeaders = parseGlobalHeaders(text);
    var count = document.getElementById('globalHeaderCount');
    if (globalHeaders.length > 0) {
      count.textContent = globalHeaders.length + ' header(s) active';
      count.style.color = '#10b981';
    } else {
      count.textContent = '';
    }
  });

  document.getElementById('autoForwardToggle').addEventListener('click', function () {
    var panel = document.getElementById('autoForwardPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('applyAutoFwdHeaders').addEventListener('click', function () {
    var text = document.getElementById('autoFwdHeaderInput').value;
    autoFwdHeaders = parseGlobalHeaders(text);
    var count = document.getElementById('autoFwdHeaderCount');
    if (autoFwdHeaders.length > 0) {
      count.textContent = autoFwdHeaders.length + ' header(s)';
      count.style.color = '#10b981';
    } else {
      count.textContent = '';
    }
  });

  document.getElementById('autoFwdCheckbox').addEventListener('change', function () {
    autoFwdEnabled = this.checked;
    document.getElementById('autoForwardToggle').classList.toggle('active', this.checked);
    var emptyText = document.getElementById('emptyState').querySelector('p');
    if (autoFwdEnabled) {
      emptyText.textContent = 'Auto-forwarding is active';
    } else {
      emptyText.textContent = 'No requests intercepted yet';
    }
  });

  chrome.debugger.onEvent.addListener(onDebuggerEvent);
  chrome.debugger.onDetach.addListener(function () {
    isOn = false;
    document.getElementById('toggleIntercept').checked = false;
    document.getElementById('statusLabel').textContent = 'OFF';
  });
});

function enableInterception() {
  chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.enable', {
    patterns: [{ urlPattern: '*', requestStage: 'Request' }]
  }, function () {
    if (chrome.runtime.lastError) {
      document.getElementById('toggleIntercept').checked = false;
      document.getElementById('statusLabel').textContent = 'ERR';
      return;
    }
    isOn = true;
    document.getElementById('statusLabel').textContent = 'ON';
    document.getElementById('emptyState').querySelector('p').textContent = autoFwdEnabled ? 'Auto-forwarding is active' : 'No requests intercepted yet';
  });
}

function disableInterception() {
  chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.disable', {}, function () {
    isOn = false;
    document.getElementById('statusLabel').textContent = 'OFF';
  });
}

function onDebuggerEvent(debuggeeId, message, params) {
  if (debuggeeId.tabId !== tabId || message !== 'Fetch.requestPaused') return;

  var filterVal = document.getElementById('urlFilter').value.trim().toLowerCase();
  if (filterVal && params.request.url.toLowerCase().indexOf(filterVal) === -1) {
    chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.continueRequest', { requestId: params.requestId }, function () {});
    return;
  }

  if (autoFwdEnabled) {
    autoForwardRequest(params.requestId, params.request);
    return;
  }

  requestCount++;
  var reqId = params.requestId;
  var req = params.request;
  var list = document.getElementById('requestList');
  var empty = document.getElementById('emptyState');
  empty.style.display = 'none';

  var card = document.createElement('div');
  card.className = 'req-card';
  card.id = 'card_' + reqId;

  var methodBadge = req.method || 'GET';

  var info = document.createElement('div');
  info.className = 'req-info';

  var headerRow = document.createElement('div');
  headerRow.className = 'req-header';

  var methodSpan = document.createElement('span');
  methodSpan.className = 'method-badge method-' + methodBadge.toLowerCase();
  methodSpan.textContent = methodBadge;

  var urlSpan = document.createElement('span');
  urlSpan.className = 'req-url';
  urlSpan.title = req.url;
  urlSpan.textContent = req.url;

  var typeSpan = document.createElement('span');
  typeSpan.className = 'req-type';
  typeSpan.textContent = params.resourceType || '';

  headerRow.appendChild(methodSpan);
  headerRow.appendChild(urlSpan);
  headerRow.appendChild(typeSpan);

  var actions = document.createElement('div');
  actions.className = 'req-actions';

  var forwardBtn = document.createElement('button');
  forwardBtn.className = 'btn btn-forward';
  forwardBtn.textContent = 'Forward';
  forwardBtn.title = 'Forward this request with edits';
  forwardBtn.addEventListener('click', function () { forwardRequest(reqId); });

  var dropBtn = document.createElement('button');
  dropBtn.className = 'btn btn-drop';
  dropBtn.textContent = 'Drop';
  dropBtn.title = 'Drop (cancel) this request';
  dropBtn.addEventListener('click', function () { dropRequest(reqId); });

  var expandBtn = document.createElement('button');
  expandBtn.className = 'btn btn-expand';
  expandBtn.textContent = 'Edit';
  expandBtn.title = 'Edit request details (URL, method, headers, body)';
  expandBtn.addEventListener('click', function () { toggleExpand(reqId); });

  var curlBtn = document.createElement('button');
  curlBtn.className = 'btn btn-curl';
  curlBtn.textContent = 'cURL';
  curlBtn.title = 'Copy as cURL command';
  curlBtn.addEventListener('click', function () { copyCurl(reqId, req); });

  actions.appendChild(forwardBtn);
  actions.appendChild(dropBtn);
  actions.appendChild(expandBtn);
  actions.appendChild(curlBtn);

  info.appendChild(headerRow);
  info.appendChild(actions);

  var detail = document.createElement('div');
  detail.className = 'req-detail';
  detail.id = 'detail_' + reqId;
  detail.style.display = 'none';

  detail.appendChild(createField('URL', req.url, true));
  detail.appendChild(createMethodField(methodBadge));
  detail.appendChild(createHeadersField(req.headers));
  detail.appendChild(createBodyField(req));

  card.appendChild(info);
  card.appendChild(detail);
  list.appendChild(card);
}

function createField(label, value, fullWidth) {
  var div = document.createElement('div');
  div.className = 'detail-field';
  var lbl = document.createElement('div');
  lbl.className = 'field-label';
  lbl.textContent = label;
  div.appendChild(lbl);
  if (fullWidth) {
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'field-input field-full';
    input.value = value;
    input.dataset.field = 'url';
    div.appendChild(input);
  }
  return div;
}

function createMethodField(method) {
  var div = document.createElement('div');
  div.className = 'detail-field detail-field-sm';
  var lbl = document.createElement('div');
  lbl.className = 'field-label';
  lbl.textContent = 'Method';
  div.appendChild(lbl);
  var sel = document.createElement('select');
  sel.className = 'field-select';
  sel.dataset.field = 'method';
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].forEach(function (m) {
    var opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    if (m === method) opt.selected = true;
    sel.appendChild(opt);
  });
  div.appendChild(sel);
  return div;
}

function createHeadersField(headers) {
  var div = document.createElement('div');
  div.className = 'detail-field';
  var lbl = document.createElement('div');
  lbl.className = 'field-label';
  lbl.textContent = 'Headers';
  div.appendChild(lbl);
  var container = document.createElement('div');
  container.className = 'headers-container';
  container.dataset.field = 'headers';
  if (headers) {
    for (var name in headers) {
      var row = createHeaderRow(name, headers[name]);
      container.appendChild(row);
    }
  }
  var addBtn = document.createElement('button');
  addBtn.className = 'btn btn-xs btn-add-hdr';
  addBtn.textContent = '+ Add Header';
  addBtn.title = 'Add a new header';
  addBtn.addEventListener('click', function () {
    container.insertBefore(createHeaderRow('', ''), addBtn);
  });
  container.appendChild(addBtn);

  var pasteBtn = document.createElement('button');
  pasteBtn.className = 'btn btn-xs btn-paste-hdr';
  pasteBtn.textContent = 'Paste Headers';
  pasteBtn.title = 'Paste multiple headers at once';
  pasteBtn.addEventListener('click', function () {
    var existing = container.querySelector('.paste-area');
    if (existing) { existing.remove(); return; }
    var area = document.createElement('div');
    area.className = 'paste-area';
    var ta = document.createElement('textarea');
    ta.className = 'paste-textarea';
    ta.placeholder = 'Origin: https://example.com\nAuthorization: Bearer token\nContent-Type: application/json';
    ta.rows = 4;
    var applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-xs';
    applyBtn.textContent = 'Apply';
    applyBtn.title = 'Apply pasted headers';
    applyBtn.style.cssText = 'background:#10b981;margin-top:4px;';
    applyBtn.addEventListener('click', function () {
      var lines = ta.value.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var sep = line.indexOf(':');
        if (sep === -1) continue;
        var n = line.substring(0, sep).trim();
        var v = line.substring(sep + 1).trim();
        if (n) container.insertBefore(createHeaderRow(n, v), addBtn);
      }
      area.remove();
    });
    area.appendChild(ta);
    area.appendChild(applyBtn);
    container.insertBefore(area, addBtn);
    ta.focus();
  });
  container.appendChild(pasteBtn);
  div.appendChild(container);
  return div;
}

function createHeaderRow(name, value) {
  var row = document.createElement('div');
  row.className = 'hdr-row';
  var nInput = document.createElement('input');
  nInput.type = 'text';
  nInput.className = 'hdr-name';
  nInput.value = name;
  nInput.placeholder = 'Name';
  var vInput = document.createElement('input');
  vInput.type = 'text';
  vInput.className = 'hdr-value';
  vInput.value = value;
  vInput.placeholder = 'Value';
  var rmBtn = document.createElement('button');
  rmBtn.className = 'btn-rm-hdr';
  rmBtn.textContent = '\u00D7';
  rmBtn.title = 'Remove this header';
  rmBtn.addEventListener('click', function () { row.remove(); });
  row.appendChild(nInput);
  row.appendChild(vInput);
  row.appendChild(rmBtn);
  return row;
}

function createBodyField(req) {
  var div = document.createElement('div');
  div.className = 'detail-field';
  var lbl = document.createElement('div');
  lbl.className = 'field-label';
  lbl.textContent = 'Body';
  div.appendChild(lbl);
  var textarea = document.createElement('textarea');
  textarea.className = 'field-textarea';
  textarea.dataset.field = 'body';
  textarea.placeholder = '(no body)';
  textarea.rows = 4;
  if (req.postData) {
    try {
      textarea.value = decodeURIComponent(Array.prototype.map.call(atob(req.postData), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) {
      textarea.value = req.postData;
    }
  }
  div.appendChild(textarea);
  return div;
}

function toggleExpand(reqId) {
  var detail = document.getElementById('detail_' + reqId);
  detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
}

function collectChanges(reqId) {
  var detail = document.getElementById('detail_' + reqId);
  var url = detail.querySelector('[data-field="url"]').value.trim();
  var method = detail.querySelector('[data-field="method"]').value;
  var headers = [];
  detail.querySelectorAll('.hdr-row').forEach(function (row) {
    var name = row.querySelector('.hdr-name').value.trim();
    var value = row.querySelector('.hdr-value').value;
    if (name) headers.push({ name: name, value: value });
  });
  var body = detail.querySelector('[data-field="body"]').value;
  return { url: url, method: method, headers: headers, body: body, hasBody: body.length > 0 };
}

function forwardRequest(reqId) {
  var changes = collectChanges(reqId);
  var params = { requestId: reqId };
  if (changes.url) params.url = changes.url;
  if (changes.method) params.method = changes.method;

  var headerMap = {};
  for (var i = 0; i < globalHeaders.length; i++) {
    headerMap[globalHeaders[i].name] = globalHeaders[i].value;
  }
  for (var i = 0; i < changes.headers.length; i++) {
    headerMap[changes.headers[i].name] = changes.headers[i].value;
  }
  var mergedHeaders = [];
  for (var name in headerMap) {
    mergedHeaders.push({ name: name, value: headerMap[name] });
  }
  if (mergedHeaders.length > 0) params.headers = mergedHeaders;

  if (changes.hasBody && changes.method !== 'GET' && changes.method !== 'HEAD') {
    params.postData = base64Encode(changes.body);
  }
  chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.continueRequest', params, function () {
    removeCard(reqId);
  });
}

function autoForwardRequest(reqId, req) {
  var params = { requestId: reqId };

  var headerMap = {};
  for (var i = 0; i < autoFwdHeaders.length; i++) {
    headerMap[autoFwdHeaders[i].name] = autoFwdHeaders[i].value;
  }
  for (var i = 0; i < globalHeaders.length; i++) {
    headerMap[globalHeaders[i].name] = globalHeaders[i].value;
  }
  var mergedHeaders = [];
  for (var name in headerMap) {
    mergedHeaders.push({ name: name, value: headerMap[name] });
  }
  if (mergedHeaders.length > 0) params.headers = mergedHeaders;

  chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.continueRequest', params, function () {});
}

function forwardAllRequests() {
  var cards = document.querySelectorAll('.req-card');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].style.display !== 'none') {
      forwardRequest(cards[i].id.replace('card_', ''));
    }
  }
}

function dropAllRequests() {
  var cards = document.querySelectorAll('.req-card');
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].style.display !== 'none') {
      dropRequest(cards[i].id.replace('card_', ''));
    }
  }
}

function parseGlobalHeaders(text) {
  var result = [];
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var sep = line.indexOf(':');
    if (sep === -1) continue;
    var n = line.substring(0, sep).trim();
    var v = line.substring(sep + 1).trim();
    if (n) result.push({ name: n, value: v });
  }
  return result;
}

function dropRequest(reqId) {
  chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.failRequest', {
    requestId: reqId,
    errorReason: 'Aborted'
  }, function () {
    removeCard(reqId);
  });
}

function removeCard(reqId) {
  var card = document.getElementById('card_' + reqId);
  if (card) {
    card.remove();
    checkEmpty();
  }
}

function clearAll() {
  if (isOn) {
    chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.disable', {}, function () {
      document.getElementById('requestList').innerHTML = '';
      checkEmpty();
      chrome.debugger.sendCommand({ tabId: tabId }, 'Fetch.enable', {
        patterns: [{ urlPattern: '*', requestStage: 'Request' }]
      }, function () {});
    });
  } else {
    document.getElementById('requestList').innerHTML = '';
    checkEmpty();
  }
}

function checkEmpty() {
  var list = document.getElementById('requestList');
  var empty = document.getElementById('emptyState');
  empty.style.display = list.children.length === 0 ? 'block' : 'none';
}

function buildCurl(method, url, headers, body) {
  var parts = ['curl -X ' + method + ' ' + JSON.stringify(url)];
  if (headers) {
    for (var name in headers) {
      parts.push('  -H ' + JSON.stringify(name + ': ' + headers[name]));
    }
  }
  if (body && method !== 'GET' && method !== 'HEAD') {
    parts.push('  --data-raw ' + JSON.stringify(body));
  }
  return parts.join(' \\\n');
}

function copyCurl(reqId, req) {
  var bodyStr = '';
  if (req.postData) {
    try {
      bodyStr = decodeURIComponent(Array.prototype.map.call(atob(req.postData), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) { bodyStr = req.postData; }
  }
  var curl = buildCurl(req.method, req.url, req.headers, bodyStr);
  navigator.clipboard.writeText(curl);
  var btn = document.querySelector('#card_' + reqId + ' .btn-curl');
  if (btn) {
    var orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#10b981';
    setTimeout(function () { btn.textContent = orig; btn.style.background = ''; }, 1500);
  }
}

function filterRequests() {
  var filterVal = document.getElementById('urlFilter').value.trim().toLowerCase();
  var cards = document.querySelectorAll('.req-card');
  cards.forEach(function (card) {
    var urlEl = card.querySelector('.req-url');
    if (urlEl) {
      var url = urlEl.textContent.toLowerCase();
      card.style.display = (!filterVal || url.indexOf(filterVal) !== -1) ? '' : 'none';
    }
  });
}
