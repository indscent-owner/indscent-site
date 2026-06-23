console.log('ADMIN-BUNDLES LOADED v2');
var existingIds = [];

var PRODUCT_TYPES = [
  'Standard Perfume', 'Mini Perfume', 'Perfume Pen', 'Shower Gel',
  'Body Lotion', 'Body Powder', 'Hand Lotion', 'Liquid Soap',
  'Roll-On Deodorant', 'Hand Wash', 'Perfume Sample'
];

document.addEventListener('DOMContentLoaded', function() {
  if (sessionStorage.getItem('admin_auth') !== 'true') {
    window.location.href = '/admin/login/';
    return;
  }
  document.getElementById('logout-btn').addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.removeItem('admin_auth');
    window.location.href = '/admin/login/';
  });

  loadBundles();
  addItemRow();

  var idSelect = document.getElementById('new-bundle-id');
  idSelect.addEventListener('change', function() {
    var num = parseInt(this.value.replace('B', ''));
    document.getElementById('new-bundle-name').value = 'Bundle_' + num;
  });
});

function generateIdOptions(usedIds) {
  var select = document.getElementById('new-bundle-id');
  select.innerHTML = '';
  for (var i = 1; i <= 99; i++) {
    var id = 'B' + (i < 10 ? '0' + i : i);
    if (!usedIds.includes(id)) {
      var opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      select.appendChild(opt);
    }
  }
  if (select.options.length > 0) {
    var num = parseInt(select.options[0].value.replace('B', ''));
    document.getElementById('new-bundle-name').value = 'Bundle_' + num;
  }
}

function addItemRow() {
  var container = document.getElementById('items-container');
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem;';
  row.innerHTML = '<select style="flex:1;padding:0.4rem;border:1px solid #ccc;font-size:0.85rem;background:white;">' +
    PRODUCT_TYPES.map(function(p) {
      return '<option value="' + p + '">' + p + '</option>';
    }).join('') +
    '</select>' +
    '<button onclick="this.parentElement.remove()" style="background:#c0392b;color:white;border:none;padding:0.3rem 0.7rem;cursor:pointer;font-size:0.8rem;border-radius:3px;">Remove</button>';
  container.appendChild(row);
}

async function createBundle() {
  var bundleId = document.getElementById('new-bundle-id').value;
  var bundleName = document.getElementById('new-bundle-name').value.trim();
  var price = document.getElementById('new-bundle-price').value;
  var successMsg = document.getElementById('create-success');
  var errorMsg = document.getElementById('create-error');
  successMsg.style.display = 'none';
  errorMsg.style.display = 'none';

  if (!bundleId || !bundleName || !price) {
    errorMsg.textContent = 'Please fill in all fields.';
    errorMsg.style.display = 'block';
    return;
  }

  var itemRows = document.querySelectorAll('#items-container div');
  if (itemRows.length === 0) {
    errorMsg.textContent = 'Please add at least one product line.';
    errorMsg.style.display = 'block';
    return;
  }

  var items = Array.from(itemRows).map(function(row) {
    return { product_type: row.querySelector('select').value };
  });

  try {
    var res = await fetch('/api/manage-bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        bundle_id: bundleId,
        bundle_name: bundleName,
        price: parseInt(price),
        items: items
      })
    });
    var data = await res.json();
    if (data.success) {
      successMsg.textContent = data.message;
      successMsg.style.display = 'block';
      document.getElementById('new-bundle-price').value = '';
      document.getElementById('items-container').innerHTML = '';
      addItemRow();
      loadBundles();
    } else {
      errorMsg.textContent = data.error || 'Something went wrong.';
      errorMsg.style.display = 'block';
    }
  } catch(e) {
    errorMsg.textContent = 'Request failed: ' + e.message;
    errorMsg.style.display = 'block';
  }
}

async function loadBundles() {
  try {
    var res = await fetch('/api/get-bundles?all=true');
    var bundles = await res.json();
    existingIds = bundles.map(function(b) { return b.bundle_id; });
    generateIdOptions(existingIds);
    renderBundles(bundles);
  } catch(e) {
    document.getElementById('bundles-list').innerHTML = '<p class="empty-msg">Could not load bundles.</p>';
  }
}

function renderBundles(bundles) {
  var container = document.getElementById('bundles-list');
  document.getElementById('bundle-count').textContent = bundles.length + ' bundles';

  if (!bundles.length) {
    container.innerHTML = '<p class="empty-msg">No bundles found.</p>';
    return;
  }

  // Create a wrapper with horizontal scroll
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'overflow-x:auto;padding:0.5rem 0;';

  // Create header row
  var headerRow = document.createElement('div');
  headerRow.style.cssText = 'display:flex;gap:1rem;margin-bottom:0.8rem;min-width:min-content;padding:0 0.5rem;font-weight:bold;font-size:0.9rem;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:0.5rem;';
  headerRow.innerHTML = 
    '<div style="min-width:60px;">Code</div>' +
    '<div style="min-width:140px;">Bundle Name</div>' +
    '<div style="min-width:80px;">Price</div>' +
    '<div style="min-width:100px;">Status</div>' +
    '<div style="min-width:300px;">Items</div>' +
    '<div style="min-width:200px;">Actions</div>';
  wrapper.appendChild(headerRow);

  // Create bundle rows
  bundles.forEach(function(bundle) {
    var itemList = bundle.items.map(function(i) { return i.product_type; }).join(', ');
    var isActive = bundle.active === 1;

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:1rem;align-items:center;padding:0.8rem 0.5rem;border-bottom:1px solid #e0e0e0;min-width:min-content;background:' + (isActive ? '#f9f9f9' : '#f5f5f5') + ';';

    // Code column
    var codeDiv = document.createElement('div');
    codeDiv.style.cssText = 'min-width:60px;';
    codeDiv.innerHTML = '<span style="background:#1a1a2e;color:#c9a84c;font-family:monospace;font-size:0.85rem;padding:0.3rem 0.6rem;border-radius:3px;font-weight:bold;">' + bundle.bundle_id + '</span>';
    row.appendChild(codeDiv);

    // Bundle Name column
    var nameDiv = document.createElement('div');
    nameDiv.style.cssText = 'min-width:140px;font-weight:600;color:#111;';
    nameDiv.textContent = bundle.bundle_name;
    row.appendChild(nameDiv);

    // Price column
    var priceDiv = document.createElement('div');
    priceDiv.style.cssText = 'min-width:80px;font-weight:bold;color:#c9a84c;background:#111;padding:0.3rem 0.6rem;border-radius:3px;text-align:center;';
    priceDiv.textContent = 'R' + bundle.price;
    row.appendChild(priceDiv);

    // Status column
    var statusBtn = document.createElement('button');
    statusBtn.textContent = isActive ? 'Active' : 'Inactive';
    statusBtn.style.cssText = 'min-width:100px;border:none;padding:0.4rem 0.8rem;font-size:0.85rem;font-weight:bold;cursor:pointer;border-radius:3px;background:' + (isActive ? '#27ae60' : '#c0392b') + ';color:white;';
    statusBtn.onclick = function() { toggleBundle(bundle.bundle_id, isActive ? 0 : 1, this); };
    var statusDiv = document.createElement('div');
    statusDiv.appendChild(statusBtn);
    row.appendChild(statusDiv);

    // Items column
    var itemsDiv = document.createElement('div');
    itemsDiv.style.cssText = 'min-width:300px;font-size:0.85rem;color:#555;';
    itemsDiv.textContent = itemList;
    row.appendChild(itemsDiv);

    // Actions column
    var actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'min-width:200px;display:flex;gap:0.4rem;';

    var editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.style.cssText = 'background:#1a1a2e;color:#c9a84c;border:none;padding:0.4rem 0.8rem;font-size:0.85rem;font-weight:bold;cursor:pointer;border-radius:3px;';
    editBtn.onclick = function() { toggleEdit(bundle.bundle_id); };
    actionsDiv.appendChild(editBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.cssText = 'background:#c0392b;color:white;border:none;padding:0.4rem 0.8rem;font-size:0.85rem;font-weight:bold;cursor:pointer;border-radius:3px;';
    deleteBtn.onclick = function() { if(confirm('Delete this bundle?')) deleteBundle(bundle.bundle_id); };
    actionsDiv.appendChild(deleteBtn);

    row.appendChild(actionsDiv);

    // Edit section (hidden by default)
    var editSection = document.createElement('div');
    editSection.id = 'edit-' + bundle.bundle_id;
    editSection.style.cssText = 'display:none;grid-column:1/-1;padding:0.8rem 0.5rem;background:#f0f0f0;border-top:1px solid #ddd;';

    var editForm = document.createElement('div');
    editForm.style.cssText = 'display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'ename-' + bundle.bundle_id;
    nameInput.value = bundle.bundle_name;
    nameInput.style.cssText = 'flex:1;min-width:140px;padding:0.4rem;border:1px solid #ccc;font-size:0.9rem;';
    nameInput.placeholder = 'Bundle Name';
    editForm.appendChild(nameInput);

    var priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.id = 'eprice-' + bundle.bundle_id;
    priceInput.value = bundle.price;
    priceInput.style.cssText = 'flex:0.5;min-width:80px;padding:0.4rem;border:1px solid #ccc;font-size:0.9rem;';
    priceInput.placeholder = 'Price';
    editForm.appendChild(priceInput);

    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'background:#27ae60;color:white;border:none;padding:0.4rem 1rem;font-weight:bold;cursor:pointer;font-size:0.85rem;border-radius:3px;';
    saveBtn.onclick = function() { saveBundle(bundle.bundle_id); };
    editForm.appendChild(saveBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'background:#666;color:white;border:none;padding:0.4rem 1rem;font-weight:bold;cursor:pointer;font-size:0.85rem;border-radius:3px;';
    cancelBtn.onclick = function() { toggleEdit(bundle.bundle_id); };
    editForm.appendChild(cancelBtn);

    editSection.appendChild(editForm);

    var msgEl = document.createElement('div');
    msgEl.id = 'emsg-' + bundle.bundle_id;
    msgEl.style.cssText = 'display:none;margin-top:0.5rem;padding:0.4rem 0.8rem;border-radius:3px;font-size:0.85rem;font-weight:bold;';
    editSection.appendChild(msgEl);

    wrapper.appendChild(row);
    wrapper.appendChild(editSection);
  });

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function toggleEdit(bundleId) {
  var el = document.getElementById('edit-' + bundleId);
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function saveBundle(bundleId) {
  var name = document.getElementById('ename-' + bundleId).value.trim();
  var price = document.getElementById('eprice-' + bundleId).value;
  var msgEl = document.getElementById('emsg-' + bundleId);

  if (!name || !price) {
    msgEl.textContent = 'Name and price are required.';
    msgEl.style.cssText = 'display:block;margin-top:0.5rem;padding:0.4rem 0.8rem;border-radius:3px;font-size:0.85rem;font-weight:bold;background:#f8d7da;color:#721c24;';
    return;
  }

  try {
    var res = await fetch('/api/manage-bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        bundle_id: bundleId,
        bundle_name: name,
        price: parseInt(price)
      })
    });
    var data = await res.json();
    if (data.success) {
      msgEl.textContent = 'Saved!';
      msgEl.style.cssText = 'display:block;margin-top:0.5rem;padding:0.4rem 0.8rem;border-radius:3px;font-size:0.85rem;font-weight:bold;background:#d4edda;color:#155724;';
      setTimeout(function() {
        msgEl.style.display = 'none';
        document.getElementById('edit-' + bundleId).style.display = 'none';
        loadBundles();
      }, 1500);
    } else {
      msgEl.textContent = data.error || 'Update failed.';
      msgEl.style.cssText = 'display:block;margin-top:0.5rem;padding:0.4rem 0.8rem;border-radius:3px;font-size:0.85rem;font-weight:bold;background:#f8d7da;color:#721c24;';
    }
  } catch(e) {
    msgEl.textContent = 'Request failed.';
    msgEl.style.cssText = 'display:block;margin-top:0.5rem;padding:0.4rem 0.8rem;border-radius:3px;font-size:0.85rem;font-weight:bold;background:#f8d7da;color:#721c24;';
  }
}

async function toggleBundle(bundleId, newActive, btn) {
  try {
    var res = await fetch('/api/manage-bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle',
        bundle_id: bundleId,
        active: newActive === 1
      })
    });
    var data = await res.json();
    if (data.success) {
      if (newActive === 1) {
        btn.textContent = 'Active';
        btn.style.background = '#27ae60';
        btn.setAttribute('onclick', 'toggleBundle(\'' + bundleId + '\',0,this)');
      } else {
        btn.textContent = 'Inactive';
        btn.style.background = '#c0392b';
        btn.setAttribute('onclick', 'toggleBundle(\'' + bundleId + '\',1,this)');
      }
      btn.closest('div[style]').style.background = newActive === 1 ? '#f9f9f9' : '#f0f0f0';
    }
  } catch(e) {
    alert('Toggle failed.');
  }
}

async function deleteBundle(bundleId) {
  try {
    var res = await fetch('/api/manage-bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        bundle_id: bundleId
      })
    });
    var data = await res.json();
    if (data.success) {
      alert('Bundle deleted successfully.');
      loadBundles();
    } else {
      alert(data.error || 'Delete failed.');
    }
  } catch(e) {
    alert('Delete request failed.');
  }
}