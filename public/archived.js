var _archivedOrders = [];

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
  loadOrders();
});

function gBadge(gender) {
  if (gender === 'female') return '<span class="badge badge-f">F</span>';
  return '<span class="badge badge-m">M</span>';
}

function loadOrders() {
  fetch('/api/get-orders?status=archived&admin=true')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var container = document.getElementById('orders-container');
      if (!data.orders || data.orders.length === 0) {
        container.innerHTML = '<p class="empty-msg">No archived orders found.</p>';
        document.getElementById('order-count').textContent = '0 orders';
        return;
      }

      var grouped = {};
      data.orders.forEach(function(row) {
        var key = row.name + ' ' + row.surname + '||' + row.order_date;
        if (!grouped[key]) {
          grouped[key] = {
            name: row.name + ' ' + row.surname,
            contact: row.contact || '',
            email: row.email || '',
            date: row.order_date,
            device_id: row.device_id,
            invoice: row.supplier_invoice || 'N/A',
            delivered: row.delivered || 0,
            items: [],
            total: 0
          };
        }
        grouped[key].items.push(row);
        if (row.fragrance_name === 'BUNDLE_TOTAL') {
          grouped[key].total += row.price;
        } else if (!row.bundle_id || row.bundle_id === '') {
          grouped[key].total += row.price * row.quantity;
        }
      });

      _archivedOrders = Object.values(grouped);
      document.getElementById('order-count').textContent = _archivedOrders.length + ' orders';

      var rows = _archivedOrders.map(function(order, idx) {
        var itemList = order.items
          .filter(function(i) { return i.fragrance_name !== 'BUNDLE_TOTAL'; })
          .map(function(i) {
            return gBadge(i.gender) + i.fragrance_name + ' - ' + i.product_name + ' x' + i.quantity;
          }).join('<br>');

        var isDelivered = order.delivered === 1;
        var btnClass = isDelivered ? 'delivered-btn delivered' : 'delivered-btn undelivered';
        var btnLabel = isDelivered ? 'Delivered' : 'Undelivered';

        return '<tr>' +
          '<td>' + order.date + '</td>' +
          '<td>' + order.name + '<br><small>' + order.contact + '</small><br><small>' + order.email + '</small></td>' +
          '<td style="line-height:1.8;">' + itemList + '</td>' +
          '<td>R' + order.total + '</td>' +
          '<td style="font-weight:bold;">' + order.invoice + '</td>' +
          '<td><button class="' + btnClass + '" onclick="toggleDelivered(' + idx + ',this)">' + btnLabel + '</button></td>' +
        '</tr>';
      }).join('');

      container.innerHTML = '<table class="admin-table"><thead><tr>' +
        '<th>Date</th><th>Name & Contact</th><th>Items</th><th>Total</th><th>Invoice</th><th>Delivery</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
    })
    .catch(function() {
      document.getElementById('orders-container').innerHTML = '<p class="empty-msg">Could not load archives.</p>';
    });
}

function toggleDelivered(idx, btn) {
  var order = _archivedOrders[idx];
  var newValue = order.delivered === 1 ? 0 : 1;

  fetch('/api/toggle-delivered', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_date: order.date,
      device_id: order.device_id,
      delivered: newValue === 1
    })
  }).then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      order.delivered = newValue;
      if (newValue === 1) {
        btn.textContent = 'Delivered';
        btn.className = 'delivered-btn delivered';
      } else {
        btn.textContent = 'Undelivered';
        btn.className = 'delivered-btn undelivered';
      }
    }
  });
}