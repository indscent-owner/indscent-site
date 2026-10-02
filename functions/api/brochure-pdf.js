import { jsPDF } from 'jspdf';
import qrcode from 'qrcode-generator';

const MAX_UPLOAD_BYTES = 1_000_000;

function toBase64(bytes) {
  let binary = '';
  const array = new Uint8Array(bytes);
  array.forEach(function(byte) {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function hasValidManagementKey(request, expectedKey) {
  if (!expectedKey) return false;
  const authorization = request.headers.get('Authorization') || '';
  const suppliedKey = authorization.indexOf('Bearer ') === 0 ? authorization.slice(7) : '';
  const expectedBytes = new TextEncoder().encode(expectedKey);
  const suppliedBytes = new TextEncoder().encode(suppliedKey);
  let difference = expectedBytes.length ^ suppliedBytes.length;
  const maxLength = Math.max(expectedBytes.length, suppliedBytes.length);
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (expectedBytes[index] || 0) ^ (suppliedBytes[index] || 0);
  }
  return difference === 0;
}

function pdfResponse(bytes, filename, disposition) {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition + '; filename="' + filename + '"',
      'Cache-Control': 'no-store'
    }
  });
}

function addQrBlock(doc, url, x, y, size) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const moduleCount = qr.getModuleCount();
  const cell = size / moduleCount;
  doc.setFillColor(255, 255, 255);
  doc.rect(x - 1.5, y - 1.5, size + 3, size + 3, 'F');
  doc.setFillColor(0, 0, 0);
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        doc.rect(x + col * cell, y + row * cell, cell, cell, 'F');
      }
    }
  }
}

async function ensureHistoryTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS brochures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      brochure_name TEXT,
      pdf_base64 TEXT
    )
  `).run();
}

async function ensureCurrentBrochureCopy(env, request) {
  const current = await env.DB.prepare(`
    SELECT id FROM brochures ORDER BY id DESC LIMIT 1
  `).first();
  if (current) return;

  const response = await fetch(new URL('/assets/fragrances.pdf', request.url));
  if (!response.ok || !(response.headers.get('Content-Type') || '').includes('application/pdf')) return;
  const bytes = new Uint8Array(await response.arrayBuffer());
  await env.DB.prepare(`
    INSERT INTO brochures (brochure_name, pdf_base64)
    VALUES (?, ?)
  `).bind('fragrances.pdf', toBase64(bytes)).run();
}

async function ensureLocalCatalog(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS fragrances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      gender TEXT,
      active INTEGER DEFAULT 1
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      volume_female TEXT,
      volume_male TEXT,
      price INTEGER,
      active INTEGER DEFAULT 1
    )
  `).run();

  const fragrances = await env.DB.prepare(`SELECT COUNT(*) AS count FROM fragrances`).first();
  if (!fragrances.count) {
    await env.DB.prepare(`
      INSERT INTO fragrances (name, gender, active) VALUES
      ('Demo Floral Fragrance', 'female', 1),
      ('Demo Fresh Fragrance', 'female', 1),
      ('Demo Woody Fragrance', 'male', 1),
      ('Demo Citrus Fragrance', 'male', 1)
    `).run();
  }

  const products = await env.DB.prepare(`SELECT COUNT(*) AS count FROM products`).first();
  if (!products.count) {
    await env.DB.prepare(`
      INSERT INTO products (name, volume_female, volume_male, price, active) VALUES
      ('Standard Perfume', '50ml', '60ml', 150, 1),
      ('Mini Perfume', '30ml', '30ml', 120, 1),
      ('Perfume Pen', '10ml', '10ml', 90, 1),
      ('Hand Lotion', '50ml', '50ml', 110, 1),
      ('Liquid Soap', '250ml', '250ml', 140, 1)
    `).run();
  }
}

function drawPageHeader(doc, logoBytes) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 13;
  doc.addImage(logoBytes, 'JPEG', margin, 8, 25, 25);

  doc.setTextColor(165, 28, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('InDscent Fragrances', 43, 19);
  doc.setTextColor(35, 35, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Your Signature Identity In Every Drop', 43, 25);

  doc.setFontSize(6.5);
  doc.text([
    'Scan the barcode to access the website.',
    'This will allow you to order directly.',
    'This is a closed private group.',
    'Right to admission applies.'
  ], 139, 11, { align: 'center', lineHeightFactor: 1.25 });
  addQrBlock(doc, 'https://indscent.pages.dev/', pageWidth - margin - 26, 8, 23);
  doc.setFontSize(5.5);
  doc.text('indscent.pages.dev', pageWidth - margin - 26, 34, { align: 'center' });

  doc.setDrawColor(25, 25, 25);
  doc.setLineWidth(0.35);
  doc.line(margin, 40, pageWidth - margin, 40);
}

function drawSectionTitleRow(doc, title, price, description, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const width = pageWidth - margin * 2;
  doc.setDrawColor(145, 145, 145);
  doc.setLineWidth(0.18);
  doc.setFillColor(247, 247, 247);
  doc.rect(margin, y, width, 7, 'FD');
  doc.setTextColor(165, 28, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(title + '     ' + price + '     ' + description, pageWidth / 2, y + 4.7, {
    align: 'center',
    maxWidth: width - 4
  });
}

function makeGridRows(doc, items, columns, columnWidth, fontSize) {
  const rowCount = Math.ceil(items.length / columns);
  return Array.from({ length: rowCount }, function(_, rowIndex) {
    const cells = Array.from({ length: columns }, function(_, columnIndex) {
      const item = items[rowIndex * columns + columnIndex];
      if (!item) return null;
      let size = fontSize;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      let lines = doc.splitTextToSize(item, columnWidth - 1.4);
      while (lines.length > 2 && size > 4.2) {
        size -= 0.2;
        doc.setFontSize(size);
        lines = doc.splitTextToSize(item, columnWidth - 1.4);
      }
      return {
        lines: lines.slice(0, 2),
        fontSize: size,
        lineHeight: size * 0.3528 * 1.18
      };
    });
    const lineCount = Math.max(1, ...cells.filter(Boolean).map(function(cell) { return cell.lines.length; }));
    const lineHeight = Math.max(1.2, fontSize * 0.3528 * 1.18);
    return {
      cells: cells,
      height: Math.max(2.5, lineCount * lineHeight + 0.45)
    };
  });
}

function drawCellGrid(doc, items, topY, availableHeight, preferredFontSize) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const columns = 5;
  const contentWidth = pageWidth - margin * 2;
  const columnWidth = contentWidth / columns;
  let fontSize = preferredFontSize;
  let rows = makeGridRows(doc, items, columns, columnWidth, fontSize);
  const totalHeight = function() {
    return rows.reduce(function(total, row) { return total + row.height; }, 0);
  };
  while (totalHeight() > availableHeight && fontSize > 4.2) {
    fontSize -= 0.2;
    rows = makeGridRows(doc, items, columns, columnWidth, fontSize);
  }

  let y = topY;
  for (let row = 0; row < rows.length; row += 1) {
    const rowLayout = rows[row];
    for (let column = 0; column < columns; column += 1) {
      const cell = rowLayout.cells[column];
      doc.setDrawColor(165, 165, 165);
      doc.setLineWidth(0.14);
      doc.setFillColor(row % 2 === 0 ? 255 : 249, row % 2 === 0 ? 255 : 249, row % 2 === 0 ? 255 : 249);
      doc.rect(margin + column * columnWidth, y, columnWidth, rowLayout.height, 'FD');
      if (cell) {
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(cell.fontSize);
        doc.text(cell.lines, margin + column * columnWidth + 0.7, y + cell.lineHeight + 0.05, {
          lineHeightFactor: 1.0
        });
      }
    }
    y += rowLayout.height;
  }

  return topY + totalHeight();
}

function drawProductsTitle(doc, y) {
  const margin = 10;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setDrawColor(145, 145, 145);
  doc.setLineWidth(0.18);
  doc.setFillColor(247, 247, 247);
  doc.rect(margin, y, width, 7, 'FD');
  doc.setTextColor(165, 28, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('Products', margin + 1, y + 4.7);
}

function buildBrochurePdf(femaleNames, maleNames, productRows, logoBytes) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const titleY = 42;
  const listTop = 50;
  const contentBottom = pageHeight - 10;
  const standardPerfume = productRows.find(function(item) {
    return item.name.toLowerCase() === 'standard perfume';
  });
  const femaleVolume = standardPerfume && standardPerfume.volume_female || '50ml';
  const maleVolume = standardPerfume && standardPerfume.volume_male || '60ml';
  const standardPrice = 'R' + (standardPerfume && standardPerfume.price || 150);

  drawPageHeader(doc, logoBytes);
  drawSectionTitleRow(doc, 'Female Fragrances', standardPrice, femaleVolume + ' Standard Perfume', titleY);
  drawCellGrid(doc, femaleNames, listTop, contentBottom - listTop, 6.0);

  doc.addPage();
  drawPageHeader(doc, logoBytes);
  drawSectionTitleRow(doc, 'Male Fragrances', standardPrice, maleVolume + ' Standard Perfume', titleY);

  const productRowsPerColumn = Math.ceil(productRows.length / 5);
  const productSpace = productRows.length ? 9 + productRowsPerColumn * 3.2 : 0;
  const maleEnd = drawCellGrid(doc, maleNames, listTop, contentBottom - listTop - productSpace, 6.0);

  if (productRows.length) {
    const productsTitleY = maleEnd + 2;
    drawProductsTitle(doc, productsTitleY);
    const productNames = productRows.map(function(item) {
      const volumes = Array.from(new Set([item.volume_female, item.volume_male].filter(Boolean)));
      const volumeText = volumes.length ? ' - ' + volumes.join('/') : '';
      return item.name + volumeText + ' - R' + item.price;
    });
    drawCellGrid(doc, productNames, productsTitleY + 7, contentBottom - productsTitleY - 7, 6.0);
  }

  return doc.output('arraybuffer');
}

export async function onRequest(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const isUpload = request.method === 'POST' && (request.headers.get('Content-Type') || '').toLowerCase().includes('multipart/form-data');

    if (request.method === 'POST') {
      if (!env.BROCHURE_UPLOAD_TOKEN) {
        return jsonResponse({ error: 'Brochure management key is not configured.' }, 503);
      }
      if (!hasValidManagementKey(request, env.BROCHURE_UPLOAD_TOKEN)) {
        return jsonResponse({ error: 'Unauthorized brochure management request.' }, 401);
      }
    }

    await ensureHistoryTable(env);
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      await ensureLocalCatalog(env);
    }

    if (request.method === 'GET') {
      await ensureCurrentBrochureCopy(env, request);
      const versions = await env.DB.prepare(`
        SELECT * FROM brochures ORDER BY id DESC LIMIT 2
      `).all();
      const row = url.searchParams.get('previous') === '1'
        ? versions.results[1] || versions.results[0] || null
        : versions.results[0] || null;
      if (!row) {
        return jsonResponse({ error: 'No brochure PDF found.' }, 404);
      }
      const filename = url.searchParams.get('previous') === '1'
        ? 'indscent-previous-brochure.pdf'
        : 'indscent-brochure.pdf';
      return pdfResponse(fromBase64(row.pdf_base64), filename, 'attachment');
    }

    if (request.method === 'POST') {
      await ensureCurrentBrochureCopy(env, request);

      if (isUpload) {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file.arrayBuffer !== 'function') {
          return jsonResponse({ error: 'Choose a PDF file to upload.' }, 400);
        }
        if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
          return jsonResponse({ error: 'PDF must be between 1 byte and 1 MB.' }, 413);
        }

        const pdfBytes = new Uint8Array(await file.arrayBuffer());
        const signature = String.fromCharCode.apply(null, Array.from(pdfBytes.slice(0, 5)));
        if (signature !== '%PDF-') {
          return jsonResponse({ error: 'The selected file is not a valid PDF.' }, 400);
        }

        await env.DB.prepare(`
          INSERT INTO brochures (brochure_name, pdf_base64)
          VALUES (?, ?)
        `).bind(file.name || 'uploaded-brochure.pdf', toBase64(pdfBytes)).run();

        return jsonResponse({ success: true, message: 'Uploaded PDF is now the live brochure.' }, 200);
      }

      const payload = await request.json().catch(function() { return {}; });
      const forcePrevious = payload.action === 'previous';
      const fragranceResult = await env.DB.prepare(`
        SELECT name, gender FROM fragrances WHERE active = 1 ORDER BY name ASC
      `).all();

      const productResult = await env.DB.prepare(`
        SELECT name, price, volume_female, volume_male FROM products WHERE active = 1 ORDER BY id ASC
      `).all();

      const femaleNames = fragranceResult.results.filter(function(item) { return String(item.gender).toLowerCase() === 'female'; }).map(function(item) { return item.name; });
      const maleNames = fragranceResult.results.filter(function(item) { return String(item.gender).toLowerCase() === 'male'; }).map(function(item) { return item.name; });
      const productRows = productResult.results.map(function(item) {
        return {
          name: item.name,
          price: item.price || 0,
          volume_female: item.volume_female || '',
          volume_male: item.volume_male || ''
        };
      });

      if (forcePrevious) {
        const existing = await env.DB.prepare(`
          SELECT * FROM brochures ORDER BY id DESC LIMIT 2
        `).all();
        const row = existing.results[1] || existing.results[0] || null;
        if (!row) {
          return new Response(JSON.stringify({ error: 'No previous brochure PDF found.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return pdfResponse(fromBase64(row.pdf_base64), 'indscent-previous-brochure.pdf', 'attachment');
      }

      const logoResponse = await fetch(new URL('/assets/logo.jpg', request.url));
      if (!logoResponse.ok) throw new Error('Unable to load the brochure logo.');
      const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
      const pdfArrayBuffer = buildBrochurePdf(femaleNames, maleNames, productRows, logoBytes);
      const pdfBytes = new Uint8Array(pdfArrayBuffer);
      const encoded = toBase64(pdfBytes);

      await env.DB.prepare(`
        INSERT INTO brochures (brochure_name, pdf_base64)
        VALUES (?, ?)
      `).bind('indscent-brochure.pdf', encoded).run();

      return pdfResponse(pdfBytes, 'indscent-brochure.pdf', 'attachment');
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
