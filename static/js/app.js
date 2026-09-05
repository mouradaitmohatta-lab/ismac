// ISMAC Logistics & Document Automation Frontend Engine

let inventory = [];
let beneficiaries = [];
let basket = {}; // { id: { ...item, quantity: 1, observations: '' } }
let currentDocType = 'audiovisuel';
let currentCategory = 'all';

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  // Set default date to today YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date-input').value = today;

  await loadInitialData();
  renderCatalog();
  renderBasket();
  loadHistory();
});

// Switch Tabs
function switchTab(tab) {
  const viewCatalog = document.getElementById('view-catalog');
  const viewAnalytics = document.getElementById('view-analytics');
  const btnCatalog = document.getElementById('tab-btn-catalog');
  const btnAnalytics = document.getElementById('tab-btn-analytics');

  if (tab === 'catalog') {
    viewCatalog.classList.remove('hidden');
    viewAnalytics.classList.add('hidden');
    btnCatalog.className = "px-3.5 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 flex items-center gap-1.5 transition";
    btnAnalytics.className = "px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition";
  } else {
    viewCatalog.classList.add('hidden');
    viewAnalytics.classList.remove('hidden');
    btnCatalog.className = "px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition";
    btnAnalytics.className = "px-3.5 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 flex items-center gap-1.5 transition";
    loadHistory();
  }
}

// Select Document Type
function selectDocType(type) {
  currentDocType = type;
  const types = ['audiovisuel', 'informatique', 'detaillee', 'pv_affectation'];
  
  types.forEach(t => {
    const card = document.getElementById(`doctype-${t}`);
    const check = card.querySelector('.active-check');
    if (t === type) {
      card.className = "doc-card border-2 border-indigo-600 bg-indigo-50/50 rounded-2xl p-4 cursor-pointer card-hover transition relative";
      check.classList.remove('hidden');
    } else {
      card.className = "doc-card border border-slate-200 bg-white rounded-2xl p-4 cursor-pointer card-hover transition relative";
      check.classList.add('hidden');
    }
  });

  // Smart default category suggestion based on doc type
  if (type === 'audiovisuel' || type === 'detaillee') {
    setCategoryFilter('audiovisuel');
  } else if (type === 'informatique') {
    setCategoryFilter('informatique');
  }
}

// Set Category Filter
function setCategoryFilter(category) {
  currentCategory = category;
  const pills = ['all', 'audiovisuel', 'informatique', 'bureau'];
  pills.forEach(p => {
    const pill = document.getElementById(`cat-pill-${p}`);
    if (p === category) {
      pill.className = "cat-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white transition";
    } else {
      pill.className = "cat-pill px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition";
    }
  });
  renderCatalog();
}

// Load Initial Data
async function loadInitialData() {
  try {
    const resInv = await fetch('/api/inventory');
    inventory = await resInv.json();
    
    const resBen = await fetch('/api/beneficiaries');
    beneficiaries = await resBen.json();
    
    // Populate beneficiaries datalist
    const dl = document.getElementById('beneficiaries-list');
    dl.innerHTML = '';
    beneficiaries.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.name;
      opt.label = `${b.name} (${b.role} - ${b.department})`;
      dl.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

// Render Catalog Cards
function renderCatalog() {
  const query = document.getElementById('catalog-search').value.toLowerCase();
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = '';

  const filtered = inventory.filter(item => {
    const matchCat = (currentCategory === 'all') || (item.category === currentCategory);
    const matchQuery = (
      item.name.toLowerCase().includes(query) ||
      (item.subcategory && item.subcategory.toLowerCase().includes(query)) ||
      (item.serial_number && item.serial_number.toLowerCase().includes(query)) ||
      (item.inventory_number && item.inventory_number.toLowerCase().includes(query))
    );
    return matchCat && matchQuery;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <p class="text-sm font-semibold">Aucun article ne correspond à votre recherche.</p>
        <p class="text-xs mt-1">Essayez un autre mot-clé ou ajoutez un nouvel article.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const inBasket = basket[item.id];
    const qtyInBasket = inBasket ? inBasket.quantity : 0;

    const card = document.createElement('div');
    card.className = "bg-white border border-slate-200 rounded-2xl overflow-hidden card-hover shadow-sm flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <!-- Image with Category Badge -->
        <div class="h-36 w-full bg-slate-100 relative overflow-hidden group">
          <img src="${item.image_url}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-slate-900/80 backdrop-blur-sm text-white">
            ${item.subcategory || item.category}
          </span>
          <span class="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${item.stock > 0 ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'} backdrop-blur-sm">
            ${item.stock > 0 ? `Stock: ${item.stock}` : 'Rupture'}
          </span>
        </div>

        <!-- Info -->
        <div class="p-3.5">
          <h4 class="font-bold text-slate-900 text-xs leading-snug line-clamp-2">${item.name}</h4>
          <div class="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
            <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${item.inventory_number || 'N/A'}</span>
            ${item.serial_number && item.serial_number !== 'N/A' ? `<span class="truncate max-w-[120px]" title="${item.serial_number}">S/N: ${item.serial_number}</span>` : ''}
          </div>
          <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${item.description || ''}</p>
        </div>
      </div>

      <!-- Action Button -->
      <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        ${qtyInBasket > 0 ? `
          <div class="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-xl w-full justify-between">
            <button onclick="decrementBasket('${item.id}')" class="w-6 h-6 rounded-lg bg-white text-indigo-700 font-bold flex items-center justify-center hover:bg-indigo-100 text-xs shadow-sm">-</button>
            <span class="text-xs font-bold text-indigo-900">${qtyInBasket} ajouté${qtyInBasket > 1 ? 's' : ''}</span>
            <button onclick="incrementBasket('${item.id}')" class="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center hover:bg-indigo-700 text-xs shadow-sm">+</button>
          </div>
        ` : `
          <button onclick="addToBasket('${item.id}')" class="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Ajouter</span>
          </button>
        `}
      </div>
    `;
    grid.appendChild(card);
  });
}

// Basket Handlers
function addToBasket(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  if (!basket[id]) {
    basket[id] = { ...item, quantity: 1, observations: '' };
  } else {
    basket[id].quantity += 1;
  }
  renderCatalog();
  renderBasket();
}

function incrementBasket(id) {
  if (basket[id]) {
    basket[id].quantity += 1;
    renderCatalog();
    renderBasket();
  }
}

function decrementBasket(id) {
  if (basket[id]) {
    basket[id].quantity -= 1;
    if (basket[id].quantity <= 0) {
      delete basket[id];
    }
    renderCatalog();
    renderBasket();
  }
}

function removeFromBasket(id) {
  delete basket[id];
  renderCatalog();
  renderBasket();
}

function updateItemObservation(id, text) {
  if (basket[id]) {
    basket[id].observations = text;
  }
}

// Render Basket Sidebar
function renderBasket() {
  const container = document.getElementById('basket-items-container');
  const countBadge = document.getElementById('basket-count-badge');
  const totalQtySpan = document.getElementById('basket-total-qty');

  const items = Object.values(basket);
  const totalItemsCount = items.length;
  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);

  countBadge.textContent = `${totalItemsCount} article${totalItemsCount > 1 ? 's' : ''}`;
  totalQtySpan.textContent = totalUnits;

  if (totalItemsCount === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-400 text-xs">
        Aucun article sélectionné pour l'instant.<br>Cliquez sur <span class="font-semibold text-indigo-600">+ Ajouter</span> sur les cartes à gauche.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = "pt-2 flex flex-col gap-1.5";
    div.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2">
          <img src="${it.image_url}" class="w-8 h-8 rounded-lg object-cover border border-slate-200">
          <div>
            <h5 class="font-bold text-slate-900 text-xs leading-tight">${it.name}</h5>
            <span class="text-[10px] text-slate-400 font-mono">${it.inventory_number || ''}</span>
          </div>
        </div>
        <button onclick="removeFromBasket('${it.id}')" class="text-slate-400 hover:text-red-600 text-xs p-1">✕</button>
      </div>

      <div class="flex items-center justify-between mt-1">
        <input type="text" placeholder="Observation..." value="${it.observations || ''}" oninput="updateItemObservation('${it.id}', this.value)" class="text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg w-3/5 focus:bg-white focus:outline-none">
        <div class="flex items-center gap-1.5">
          <button onclick="decrementBasket('${it.id}')" class="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">-</button>
          <span class="text-xs font-bold w-4 text-center">${it.quantity}</span>
          <button onclick="incrementBasket('${it.id}')" class="w-5 h-5 rounded bg-slate-900 hover:bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">+</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Generate Real DOCX
async function generateDocx() {
  const beneficiary = document.getElementById('beneficiary-input').value.trim();
  const dateStr = document.getElementById('date-input').value;
  const motif = document.getElementById('motif-input').value.trim();
  const lieu = document.getElementById('lieu-input').value.trim();
  const items = Object.values(basket);

  if (!beneficiary) {
    alert("Veuillez saisir ou sélectionner le nom du bénéficiaire (RÉCUPÉRÉ PAR).");
    document.getElementById('beneficiary-input').focus();
    return;
  }

  if (items.length === 0) {
    alert("Veuillez ajouter au moins un article au panier avant de générer la décharge.");
    return;
  }

  const payload = {
    doc_type: currentDocType,
    beneficiary: beneficiary,
    date: formatDateFr(dateStr),
    motif: motif,
    lieu: lieu,
    items: items
  };

  try {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
      <span>Génération en cours...</span>
    `;

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Erreur serveur lors de la génération");

    const data = await res.json();
    
    // Trigger download
    const dlLink = document.createElement('a');
    dlLink.href = data.file_url;
    dlLink.download = data.filename;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);

    btn.disabled = false;
    btn.innerHTML = originalText;

    // Refresh history
    loadHistory();
    alert(`Document généré avec succès !\nFichier : ${data.filename}`);

  } catch (err) {
    alert("Une erreur est survenue lors de la génération du document.");
    console.error(err);
  }
}

// Instant Print & Clean Preview
function previewAndPrint() {
  const beneficiary = document.getElementById('beneficiary-input').value.trim() || 'BÉNÉFICIAIRE';
  const dateStr = formatDateFr(document.getElementById('date-input').value);
  const items = Object.values(basket);

  if (items.length === 0) {
    alert("Veuillez ajouter au moins un article pour générer l'aperçu.");
    return;
  }

  let docTitle = "BON DE DÉCHARGE DE MATÉRIEL AUDIOVISUEL";
  if (currentDocType === 'informatique') docTitle = "BON DE DÉCHARGE DE FOURNITURE INFORMATIQUE";
  if (currentDocType === 'detaillee') docTitle = "BON DE DÉCHARGE DU MATÉRIEL";
  if (currentDocType === 'pv_affectation') docTitle = "PROCÈS-VERBAL D'AFFECTATION MATÉRIEL";

  const rowsHtml = items.map(it => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 8px; font-size: 13px;">${it.name}</td>
      <td style="padding: 8px; text-align: center; font-size: 13px;">${it.quantity}</td>
      <td style="padding: 8px; text-align: center; font-size: 12px; color: #666;">${it.observations || '—----------------'}</td>
    </tr>
  `).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${docTitle} - ISMAC</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #111; }
        .header-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 25px; }
        .meta-line { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px; font-size: 13px; }
        td { border: 1px solid #ccc; }
        .signature-block { margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
        .footer { margin-top: 80px; border-top: 1px solid #999; padding-top: 10px; font-size: 10px; color: #555; text-align: center; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="header-title">${docTitle}</div>
      <div class="meta-line">RÉCUPÉRÉ PAR : <span style="font-weight: normal;">${beneficiary.toUpperCase()}</span></div>
      <div class="meta-line">DATE DE SORTIE : <span style="font-weight: normal;">${dateStr}</span></div>

      <table>
        <thead>
          <tr>
            <th style="width: 60%; text-align: left;">Matériel</th>
            <th style="width: 15%;">Quantité</th>
            <th style="width: 25%;">Observations</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signature-block">
        <div>${currentDocType === 'detaillee' ? 'Vu par ISMAC' : ''}</div>
        <div>La personne concernée</div>
      </div>

      <div class="footer">
        <div>Tél. : +212 (0)5 37 27 17 00<br>Fax : +212 (0)5 37 77 38 65</div>
        <div>ISMAC - Av. Allal El Fassi, Cité Al Irfane B.P 6598 - Souissi, Rabat/Maroc<br>شارع علال الفاسي - مدينة العرفان السويسي - الرباط - ص.ب 6598</div>
        <div>E-mail : info@ismac.ac.ma<br>www.ismac.ac.ma</div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Load History Table & KPIs
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    const history = await res.json();

    document.getElementById('kpi-total-docs').textContent = history.length;
    
    let totalItemsBorrowed = 0;
    history.forEach(h => {
      totalItemsBorrowed += (h.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
    });
    document.getElementById('kpi-active-loans').textContent = totalItemsBorrowed;

    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">Aucun historique enregistré pour l'instant.</td></tr>`;
      return;
    }

    history.slice().reverse().forEach(h => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-50 transition";
      tr.innerHTML = `
        <td class="px-4 py-3 font-mono font-bold text-slate-900">${h.doc_number || 'N/A'}</td>
        <td class="px-4 py-3 capitalize"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">${h.doc_type}</span></td>
        <td class="px-4 py-3 font-semibold text-slate-900">${h.beneficiary}</td>
        <td class="px-4 py-3 text-slate-500">${h.date}</td>
        <td class="px-4 py-3">${(h.items || []).length} article(s)</td>
        <td class="px-4 py-3 text-right">
          ${h.file_url ? `<a href="${h.file_url}" download class="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-indigo-600 font-bold text-xs inline-flex items-center gap-1">Télécharger</a>` : '—'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading history:", err);
  }
}

// Modal Handlers
function openNewItemModal() {
  document.getElementById('new-item-modal').classList.remove('hidden');
}

function closeNewItemModal() {
  document.getElementById('new-item-modal').classList.add('hidden');
}

async function saveNewItem() {
  const name = document.getElementById('new-item-name').value.trim();
  const category = document.getElementById('new-item-category').value;
  const inv = document.getElementById('new-item-inv').value.trim();
  const sn = document.getElementById('new-item-sn').value.trim();
  const img = document.getElementById('new-item-img').value.trim();

  if (!name) {
    alert("Veuillez saisir au moins la désignation de l'article.");
    return;
  }

  const newItem = {
    id: `CUSTOM-${Date.now()}`,
    name: name,
    category: category,
    inventory_number: inv || 'ISMAC-VAR-2026',
    serial_number: sn || 'N/A',
    image_url: img || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80',
    stock: 10,
    description: "Article ajouté manuellement au magasin."
  };

  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (res.ok) {
      inventory.push(newItem);
      closeNewItemModal();
      renderCatalog();
      alert("Nouvel article ajouté avec succès au catalogue !");
    }
  } catch (err) {
    alert("Erreur lors de l'enregistrement de l'article.");
  }
}

// Helper Date Formatter (YYYY-MM-DD -> DD/MM/YYYY)
function formatDateFr(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}
