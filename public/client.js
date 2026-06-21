var products = [];
var femaleFragrances = [];
var maleFragrances = [];
var currentGender = 'female';
var cart = [];

var volumeMap = {
  'Perfume Pen': '10ml', 'Hand Lotion': '50ml', 'Standard Perfume': '50ml',
  'Mini Perfume': '30ml', 'Shower Gel': '250ml', 'Body Lotion': '250ml',
  'Body Powder': '250ml', 'Roll-On': '80ml', 'Hand Wash': '250ml',
  'Liquid Soap': '250ml', 'Roll-On Deodorant': '80ml', 'Perfume Sample': '5ml'
};

function getVolume(productName, gender) {
  if (productName === 'Standard Perfume' && (gender === 'male' || gender === 'M')) return '60ml';
  return volumeMap[productName] || '';
}

function getOrCreateDeviceId() {
  var id = localStorage.getItem('indscent_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('indscent_device_id', id);
  }
  return id;
}

function setGender(gender) {
  currentGender = gender;
  document.getElementById('btn-female').classList.toggle('active', gender === 'female');
  document.getElementById('btn-male').classList.toggle('active', gender === 'male');
  document.getElementById('fragrance-select').value = '';
  populateFragrances();
  renderProducts(null);
}

function populateFragrances() {
  var list = currentGender === 'female' ? femaleFragrances : maleFragrances;
  var sel = document.getElementById('fragrance-select');
  sel.innerHTML = '<option value="">-- Choose a fragrance --</option>';
  list.forEach(function(f) {
    var opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    sel.appendChild(opt);
  });
}

function renderProducts(fragrance) {
  var tbody = document.getElementById('product-tbody');
  if (!fragrance) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">Select a fragrance first</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(function(p) {
    var isMale = currentGender === 'male';
    var vol = isMale ? p.volume_male : p.volume_female;
    return '<tr>' +
      '<td>' + p.name + '</td>' +
      '<td>' + vol + '</td>' +
      '<td>R' + p.price + '</td>' +
      '<td><button class="add-btn" onclick="addToCart(\'' + fragrance.replace(/'/g, "\\'") + '\',\'' + p.name + '\',\'' + vol + '\',' + p.price + ')">Add</button></td>' +
      '</tr>';
  }).join('');
}

function addToCart(fragrance, productName, volume, price) {
  var key = fragrance + '||' + productName;
  var existing = cart.find(function(i) { return i.key === key; });
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key: key,
      fragrance: fragrance,
      productName: productName,
      volume: volume,
      price: price,
      gender: currentGender,
      qty: 1
    });
  }
  localStorage.setItem('indscent_individual_cart', JSON.stringify(cart));
  renderCombinedCart();
}

function removeFromCart(key) {
  var item = cart.find(function(i) { return i.key === key; });
  if (!item) return;
  if (item.qty > 1) { item.qty -= 1; }
  else { cart = cart.filter(function(i) { return i.key !== key; }); }
  localStorage.setItem('indscent_individual_cart', JSON.stringify(cart));
  renderCombinedCart();
}

function removeBundleFromCart(index) {
  var bundleCart = JSON.parse(localStorage.getItem('bundleCart') || '[]');
  bundleCart.splice(index, 1);
  localStorage.setItem('bundleCart', JSON.stringify(bundleCart));
  renderCombinedCart();
}

function renderCombinedCart() {
  var bundleCart = JSON.parse(localStorage.getItem('bundleCart') || '[]');
  var hasIndividual = cart.length > 0;
  var hasBundle = bundleCart.length > 0;

  var indArea = document.getElementById('individual-cart-area');
  var bundleArea = document.getElementById('bundle-cart-area');
  var grandTotalEl = document.getElementById('grand-total');
  var detailsTitle = document.getElementById('details-title');

  var indTotal = 0;
  var bundleTotal = 0;

  if (hasIndividual) {
    var indRows = cart.map(function(i) {
      var sub = i.qty * i.price;
      indTotal += sub;
      var gBadge = i.gender === 'female'
        ? '<span class="cart-badge cart-badge-f">F</span>'
        : '<span class="cart-badge cart-badge-m">M</span>';
      return '<tr>' +
        '<td>' + gBadge + ' <strong>' + i.fragrance + '</strong><br>' +
          '<span style="font-size:0.85rem;color:#555;">' + i.productName + ' (' + i.volume + ')</span>' +
        '</td>' +
        '<td>' + i.qty + '</td>' +
        '<td>R' + sub + '</td>' +
        '<td><button class="remove-btn" onclick="removeFromCart(\'' + i.key.replace(/'/g, "\\'") + '\')">Remove</button></td>' +
      '</tr>';
    }).join('');

    indArea.innerHTML =
      '<div class="cart-sub-title">INDIVIDUAL ITEMS</div>' +
      '<table class="cart-table">' +
        '<thead><tr><th>Item</th><th>Qty</th><th>Subtotal</th><th>Remove</th></tr></thead>' +
        '<tbody>' + indRows + '</tbody>' +
      '</table>' +
      '<div class="cart-subtotal">Item Total: R' + indTotal + '</div>';
  } else {
    indArea.innerHTML =
      '<div class="cart-sub-title">INDIVIDUAL ITEMS</div>' +
      '<div style="padding:1rem;"><span class="empty-msg">No individual items in cart</span></div>';
  }

  if (hasBundle) {
    var bundleRows = bundleCart.map(function(bundle, bundleIndex) {
      bundleTotal += bundle.price;
      var itemLines = bundle.items.map(function(item) {
        var vol = getVolume(item.product_type, item.gender);
        var gBadge = item.gender === 'F'
          ? '<span class="cart-badge cart-badge-f">F</span>'
          : '<span class="cart-badge cart-badge-m">M</span>';
        return '<tr>' +
          '<td>' + gBadge + ' <strong>' + item.fragrance + '</strong><br>' +
            '<span style="font-size:0.85rem;color:#555;">' + item.product_type + (vol ? ' (' + vol + ')' : '') + '</span>' +
          '</td>' +
          '<td>1</td>' +
          '<td><span class="bundled-label">Bundled</span></td>' +
          '<td>-</td>' +
        '</tr>';
      }).join('');
      return '<div class="bundle-section-header">' +
          '<span class="bundle-section-name">' + bundle.bundle_name + '</span>' +
          '<span>' +
            '<span class="bundle-section-price">R' + bundle.price + '</span>' +
            '<button class="bundle-remove-btn" onclick="removeBundleFromCart(' + bundleIndex + ')">Remove</button>' +
          '</span>' +
        '</div>' +
        '<table class="cart-table">' +
          '<thead><tr><th>Item</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>' +
          '<tbody>' + itemLines + '</tbody>' +
        '</table>';
    }).join('');

    bundleArea.innerHTML =
      '<div class="cart-sub-title">BUNDLE ITEMS</div>' +
      bundleRows +
      '<div class="cart-subtotal">Bundle Total: R' + bundleTotal + '</div>';
  } else {
    bundleArea.innerHTML = '';
  }

  var grandTotal = indTotal + bundleTotal;
  if (grandTotal > 0) {
    grandTotalEl.style.display = 'block';
    grandTotalEl.textContent = 'Grand Total: R' + grandTotal;
  } else {
    grandTotalEl.style.display = 'none';
  }

  detailsTitle.textContent = hasBundle ? '5. YOUR DETAILS' : '4. YOUR DETAILS';
}

async function submitOrder() {
  var bundleCart = JSON.parse(localStorage.getItem('bundleCart') || '[]');
  var hasIndividual = cart.length > 0;
  var hasBundle = bundleCart.length > 0;

  if (!hasIndividual && !hasBundle) {
    alert('Your cart is empty!');
    return;
  }

  var firstName = document.getElementById('firstName').value.trim();
  var surname = document.getElementById('surname').value.trim();
  var phone = document.getElementById('phone').value.trim().replace(/\s/g, '');
  var email = document.getElementById('email').value.trim();

  if (!firstName || !surname || !phone || !email) {
    alert('Please fill in all your details.');
    return;
  }

  document.getElementById('submit-btn').disabled = true;
  document.getElementById('processing-msg').style.display = 'block';

  var device_id = getOrCreateDeviceId();
  localStorage.setItem('indscent_contact', JSON.stringify({
    firstName: firstName, surname: surname, phone: phone, email: email
  }));

  try {
    var res = await fetch('/api/submit-combined-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: device_id,
        firstName: firstName,
        surname: surname,
        phone: phone,
        email: email,
        items: hasIndividual ? cart : [],
        bundles: hasBundle ? bundleCart : []
      })
    });

    if (res.ok) {
      document.getElementById('processing-msg').style.display = 'none';
      document.getElementById('submit-btn').disabled = false;
      document.getElementById('msg-success').style.display = 'block';
      document.getElementById('msg-error').style.display = 'none';
      cart = [];
      localStorage.removeItem('bundleCart');
      localStorage.removeItem('indscent_individual_cart');
      renderCombinedCart();
      document.getElementById('fragrance-select').value = '';
      renderProducts(null);
    } else {
      document.getElementById('processing-msg').style.display = 'none';
      document.getElementById('submit-btn').disabled = false;
      document.getElementById('msg-error').style.display = 'block';
    }
  } catch(e) {
    document.getElementById('processing-msg').style.display = 'none';
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('msg-error').style.display = 'block';
  }
}

async function loadData() {
  try {
    var fragRes = await fetch('/api/get-fragrances');
    var fragData = await fragRes.json();
    femaleFragrances = fragData.female || [];
    maleFragrances = fragData.male || [];

    var prodRes = await fetch('/api/get-products');
    var prodData = await prodRes.json();
    products = prodData.products || [];

    populateFragrances();

    var savedCart = localStorage.getItem('indscent_individual_cart');
    if (savedCart) {
      try { cart = JSON.parse(savedCart); } catch(e) { cart = []; }
    }

    var saved = JSON.parse(localStorage.getItem('indscent_contact') || '{}');
    if (saved.firstName) document.getElementById('firstName').value = saved.firstName;
    if (saved.surname) document.getElementById('surname').value = saved.surname;
    if (saved.phone) document.getElementById('phone').value = saved.phone;
    if (saved.email) document.getElementById('email').value = saved.email;

    renderCombinedCart();
  } catch(e) {
    console.error('Failed to load data:', e);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btn-female').addEventListener('click', function() { setGender('female'); });
  document.getElementById('btn-male').addEventListener('click', function() { setGender('male'); });
  document.getElementById('fragrance-select').addEventListener('change', function() { renderProducts(this.value); });
  document.getElementById('submit-btn').addEventListener('click', submitOrder);
  loadData();
});