console.log('ADMIN-BUNDLES LOADED v3');
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
	initDeployControls();

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

function initDeployControls() {
	var btn = document.getElementById('deploy-changes-btn');
	if (!btn) return;
	btn.addEventListener('click', deployChanges);
}

function setDeployStatus(message, type) {
	var status = document.getElementById('deploy-status');
	if (!status) return;
	status.textContent = message;
	status.className = 'deploy-status' + (type ? ' ' + type : '');
}

async function deployChanges() {
	var btn = document.getElementById('deploy-changes-btn');
	if (!btn) return;
	btn.disabled = true;
	setDeployStatus('Deploying changes to live page...', 'working');

	try {
		await loadBundles();
		try {
			new BroadcastChannel('indscent_bundles').postMessage({ type: 'bundles-changed' });
		} catch (e) {}
		setDeployStatus('Changes deployed. Live page should now reflect the updates.', 'success');
	} catch (e) {
		setDeployStatus('Deploy failed. Please try again.', 'error');
	} finally {
		btn.disabled = false;
	}
}

function addItemRow() {
	var container = document.getElementById('items-container');
	var row = document.createElement('div');
	row.className = 'item-row';
	var select = document.createElement('select');
	select.className = 'item-select';
	PRODUCT_TYPES.forEach(function(p) {
		var opt = document.createElement('option');
		opt.value = p; opt.textContent = p; select.appendChild(opt);
	});
	var btn = document.createElement('button');
	btn.className = 'remove-btn';
	btn.textContent = 'Remove';
	btn.onclick = function() { this.parentElement.remove(); };
	row.appendChild(select);
	row.appendChild(btn);
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
	wrapper.className = 'bundles-wrapper';

	// Create header row
	var headerRow = document.createElement('div');
	headerRow.className = 'bundles-header';
	headerRow.innerHTML = 
		'<div class="hdr code">Code</div>' +
		'<div class="hdr name">Bundle Name</div>' +
		'<div class="hdr price">Price</div>' +
		'<div class="hdr status">Status</div>' +
		'<div class="hdr items">Items</div>' +
		'<div class="hdr actions">Actions</div>';
	wrapper.appendChild(headerRow);

	// Create bundle rows
	bundles.forEach(function(bundle) {
		var itemsArray = Array.isArray(bundle.items) ? bundle.items : [];
		var itemLabels = itemsArray.map(function(i) { return i.product_type || ''; });
		var isActive = bundle.active === 1;

		var row = document.createElement('div');
		row.className = 'bundle-row';
		if (isActive) row.style.background = '#f9f9f9';
		else row.style.background = '#f5f5f5';

		var codeDiv = document.createElement('div');
		codeDiv.className = 'bundle-code';
		codeDiv.innerHTML = '<span class="badge">' + bundle.bundle_id + '</span>';
		row.appendChild(codeDiv);

		var nameDiv = document.createElement('div');
		nameDiv.className = 'bundle-name';
		var nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.id = 'ename-' + bundle.bundle_id;
		nameInput.value = bundle.bundle_name;
		nameInput.className = 'bundle-input bundle-name-input';
		nameInput.placeholder = 'Bundle Name';
		nameDiv.appendChild(nameInput);
		row.appendChild(nameDiv);

		var priceDiv = document.createElement('div');
		priceDiv.className = 'bundle-price-cell';
		var priceInput = document.createElement('input');
		priceInput.type = 'number';
		priceInput.min = '0';
		priceInput.step = '1';
		priceInput.id = 'eprice-' + bundle.bundle_id;
		priceInput.value = bundle.price;
		priceInput.className = 'bundle-input bundle-price-input';
		priceInput.placeholder = 'Price';
		priceDiv.appendChild(priceInput);
		row.appendChild(priceDiv);

		var statusBtn = document.createElement('button');
		statusBtn.textContent = isActive ? 'Active' : 'Inactive';
		statusBtn.className = 'btn ' + (isActive ? 'active' : 'inactive');
		statusBtn.onclick = function() { toggleBundle(bundle.bundle_id, isActive ? 0 : 1, this); };
		var statusDiv = document.createElement('div');
		statusDiv.className = 'bundle-status';
		statusDiv.appendChild(statusBtn);
		row.appendChild(statusDiv);

		var itemsDiv = document.createElement('div');
		itemsDiv.className = 'bundle-items';
		itemLabels.forEach(function(label) {
			var chip = document.createElement('span');
			chip.className = 'bundle-item-chip';
			chip.textContent = label;
			itemsDiv.appendChild(chip);
		});
		row.appendChild(itemsDiv);

		var actionsDiv = document.createElement('div');
		actionsDiv.className = 'bundle-actions';

		var saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save';
		saveBtn.className = 'btn save';
		saveBtn.onclick = function() { saveBundle(bundle.bundle_id); };
		actionsDiv.appendChild(saveBtn);

		row.appendChild(actionsDiv);
		wrapper.appendChild(row);
	});

	container.innerHTML = '';
	container.appendChild(wrapper);
}

async function saveBundle(bundleId) {
	var name = document.getElementById('ename-' + bundleId).value.trim();
	var price = document.getElementById('eprice-' + bundleId).value;
	var msgEl = document.getElementById('save-msg-' + bundleId);
	if (!msgEl) {
		msgEl = document.createElement('div');
		msgEl.id = 'save-msg-' + bundleId;
		msgEl.className = 'save-msg';
		var row = document.getElementById('ename-' + bundleId).closest('.bundle-row');
		if (row) row.appendChild(msgEl);
	}

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
				btn.className = 'btn active';
				btn.setAttribute('onclick', 'toggleBundle(\'' + bundleId + '\',0,this)');
			} else {
				btn.textContent = 'Inactive';
				btn.className = 'btn inactive';
				btn.setAttribute('onclick', 'toggleBundle(\'' + bundleId + '\',1,this)');
			}
			try {
				var r = btn.closest('.bundle-row');
				if (r) r.style.background = newActive === 1 ? '#f9f9f9' : '#f5f5f5';
			} catch (e) {}
			// notify other tabs in same browser to refresh bundles
			try { new BroadcastChannel && new BroadcastChannel('indscent_bundles').postMessage({ type: 'bundles-changed' }); } catch(e) {}
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
