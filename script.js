/******************************************/
/*  Gantikan dengan URL Web App Anda      */
/******************************************/
const API_URL = 'https://script.google.com/macros/s/AKfycbzmpkvkLk6BeCgS1Os3vPA9Tw59RPGZSI59Ijl8rU0m0C1S38F0576V1sGDAbPPwZw/exec';

/******************************************/
/*  Kata Laluan Ringkas                   */
/******************************************/
const SIMPLE_PASSWORD = '115317';

/******************************************/
/*  Fungsi Overlay Kata Laluan + localStorage
    Supaya kata laluan dimasukkan sekali sahaja  */
/******************************************/
function initPasswordOverlay() {
  const overlay = document.getElementById('password-overlay');
  if (!overlay) return;  // Jika tiada overlay di halaman ini

  const mainContainer = document.getElementById('main-container');
  const passwordInput = document.getElementById('password-input');
  const submitBtn = document.getElementById('password-submit');
  const errorEl = document.getElementById('password-error');

  // Jika 'loggedIn' sudah 'true', teruskan tanpa overlay
  if (localStorage.getItem('loggedIn') === 'true') {
    overlay.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'block';
    return;
  }

  // Jika belum, tunggu input
  submitBtn.addEventListener('click', () => {
    const val = passwordInput.value.trim();
    if (val === SIMPLE_PASSWORD) {
      localStorage.setItem('loggedIn', 'true');
      overlay.style.display = 'none';
      if (mainContainer) mainContainer.style.display = 'block';
    } else {
      errorEl.textContent = 'Kata laluan salah.';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });
}

/******************************************/
/*  Fungsi Bantuan (Notifikasi, dsb.)     */
/******************************************/
/** Papar notifikasi selama 3s */
function showNotification(message, type) {
  const container = document.getElementById('notification-container');
  if (!container) return;
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

/** Elak injeksi HTML */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * disableButton(btnId):
 *  - Jadikan butang kelabu & ubah teks ke "Masa telah disetkan" (lalai)
 */
function disableButton(btnId, text = 'Masa telah disetkan') {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.add('disabled-btn');
    btn.disabled = true;
    btn.textContent = text;
  }
}

/**
 * enableButton(btnId, text):
 *  - Jadikan butang boleh diklik & ubah teks
 */
function enableButton(btnId, text) {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.remove('disabled-btn');
    btn.disabled = false;
    btn.textContent = text;
  }
}

/******************************************/
/*   1) FUNGSI DI HALAMAN UTAMA (index.html)  */
/******************************************/
function initIndexPage() {
  // Inisialisasi overlay password
  initPasswordOverlay();

  const mainContainer = document.getElementById('main-container');
  if (!mainContainer) return;

  // Dapatkan butang "Masuk" & "Balik" --> disabled awal (teks "Sedang dimuat...")
  disableButton('btn-masuk', 'Sedang dimuat...');
  disableButton('btn-balik', 'Sedang dimuat...');

  // Set tarikh semasa & masa semasa
  setDefaultDate();
  setDefaultTime();

  // Ambil jumlah ringgit
  fetchTotal();

  // Semak tarikh semasa
  const tarikhInput = document.getElementById('tarikh');
  checkSelectedDateStatus(tarikhInput.value);

  // Apabila user ubah tarikh
  tarikhInput.addEventListener('change', (e) => {
    // Set masa semasa semula
    setDefaultTime();
    // Re-disable butang semasa loading
    disableButton('btn-masuk', 'Sedang dimuat...');
    disableButton('btn-balik', 'Sedang dimuat...');
    checkSelectedDateStatus(e.target.value);
  });

  // Borang "Tambah"
  const form = document.getElementById('data-form');
  form.addEventListener('submit', handleFormSubmit);

  // Butang "Masuk" & "Balik"
  document.getElementById('btn-masuk').addEventListener('click', handleMasukClick);
  document.getElementById('btn-balik').addEventListener('click', handleBalikClick);
}

/**
 * Set tarikh = hari ini (Local Time)
 *  - Menggunakan offset time untuk elak isu zon masa UTC
 */
function setDefaultDate() {
  const tarikhInput = document.getElementById('tarikh');
  if (!tarikhInput) return;

  let now = new Date();
  // Sesuaikan tarikh agar toISOString() mencerminkan local date
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  // Hasil: "YYYY-MM-DDTHH:mm:ss.sssZ", kita ambil split('T')[0]
  const localISODate = now.toISOString().split('T')[0];

  tarikhInput.value = localISODate;
}

/** Set masa semasa (HH:MM) (Local) */
function setDefaultTime() {
  const now = new Date();
  let hh = now.getHours();
  let mm = now.getMinutes();
  if (hh < 10) hh = '0' + hh;
  if (mm < 10) mm = '0' + mm;
  const currentTime = `${hh}:${mm}`;

  const waktuMulaInput = document.getElementById('waktuMula');
  const waktuTamatInput = document.getElementById('waktuTamat');
  if (waktuMulaInput) waktuMulaInput.value = currentTime;
  if (waktuTamatInput) waktuTamatInput.value = currentTime;
}

/**
 * Ambil "total" dari Google Sheets (doGet => getData) 
 * dan paparkan sebagai "RM X.XX"
 */
function fetchTotal() {
  const script = document.createElement('script');
  const callbackName = 'handleGetDataIndex_' + Date.now();

  window[callbackName] = function(response) {
    document.head.removeChild(script);
    delete window[callbackName];

    if (!response || response.status === 'Invalid action or no action specified') {
      showNotification('Gagal mengambil jumlah ringgit.', 'error');
      return;
    }

    const totalEl = document.getElementById('total');
    if (totalEl) {
      const totalValue = parseFloat(response.total) || 0;
      totalEl.textContent = 'RM ' + totalValue.toFixed(2);
    }
  };

  // JSONP
  script.src = `${API_URL}?action=getData&callback=${callbackName}`;
  document.head.appendChild(script);
}

/**
 * checkSelectedDateStatus(tarikh)
 *  -> Panggil API utk semak tarikh itu,
 *  -> Butang "Masuk"/"Balik" di-ENABLE jika tiada rekod,
 *     di-DISABLE ("Masa telah disetkan") jika ada rekod.
 */
function checkSelectedDateStatus(tarikh) {
  if (!tarikh) return;

  const payload = new URLSearchParams();
  payload.append('action', 'checkDateStatus');
  payload.append('tarikh', tarikh);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(res => res.json())
    .then(result => {
      if (!result || result.status !== 'Ok') {
        // Anggap tiada data => user boleh masukkan
        enableButton('btn-masuk', 'Masuk');
        enableButton('btn-balik', 'Balik');
        return;
      }

      // Tetapkan input waktu
      const waktuMulaInput = document.getElementById('waktuMula');
      const waktuTamatInput = document.getElementById('waktuTamat');

      if (result.hasStart && result.startTime) {
        if (waktuMulaInput) waktuMulaInput.value = result.startTime;
        disableButton('btn-masuk'); // default text = "Masa telah disetkan"
      } else {
        enableButton('btn-masuk', 'Masuk');
      }

      if (result.hasEnd && result.endTime) {
        if (waktuTamatInput) waktuTamatInput.value = result.endTime;
        disableButton('btn-balik');
      } else {
        enableButton('btn-balik', 'Balik');
      }
    })
    .catch(err => {
      console.log('checkSelectedDateStatus error:', err);
      // Assume tarikh tiada data => enable
      enableButton('btn-masuk', 'Masuk');
      enableButton('btn-balik', 'Balik');
    });
}

/** Borang "Tambah" */
function handleFormSubmit(e) {
  e.preventDefault();
  const tarikh = document.getElementById('tarikh').value;
  const waktuMula = document.getElementById('waktuMula').value;
  const waktuTamat = document.getElementById('waktuTamat').value;

  const payload = new URLSearchParams();
  payload.append('action', 'add');
  payload.append('tarikh', tarikh);
  payload.append('waktuMula', waktuMula);
  payload.append('waktuTamat', waktuTamat);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(() => {
      showNotification('Berjaya dihantar', 'success');
      // Reset
      document.getElementById('data-form').reset();
      setDefaultDate();
      setDefaultTime();

      // Semak semula tarikh
      checkSelectedDateStatus(document.getElementById('tarikh').value);

      // Refresh total
      fetchTotal();
    })
    .catch(() => {
      showNotification('Berjaya dihantar', 'success');
      checkSelectedDateStatus(document.getElementById('tarikh').value);
      fetchTotal();
    });
}

/** Klik "Masuk" */
function handleMasukClick() {
  const tarikh = document.getElementById('tarikh').value;
  if (!tarikh) {
    showNotification('Sila pilih tarikh terlebih dahulu.', 'error');
    return;
  }
  const waktuMula = document.getElementById('waktuMula').value;

  const payload = new URLSearchParams();
  payload.append('action', 'recordStartTime');
  payload.append('tarikh', tarikh);
  payload.append('waktuMula', waktuMula);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(() => {
      showNotification('Masa Masuk berjaya direkodkan.', 'success');
      disableButton('btn-masuk');
      fetchTotal();
    })
    .catch(() => {
      showNotification('Masa Masuk berjaya direkodkan.', 'success');
      disableButton('btn-masuk');
      fetchTotal();
    });
}

/** Klik "Balik" */
function handleBalikClick() {
  const tarikh = document.getElementById('tarikh').value;
  if (!tarikh) {
    showNotification('Sila pilih tarikh terlebih dahulu.', 'error');
    return;
  }
  const waktuTamat = document.getElementById('waktuTamat').value;

  const payload = new URLSearchParams();
  payload.append('action', 'recordEndTime');
  payload.append('tarikh', tarikh);
  payload.append('waktuTamat', waktuTamat);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(() => {
      showNotification('Masa Balik berjaya direkodkan.', 'success');
      disableButton('btn-balik');
      fetchTotal();
    })
    .catch(() => {
      showNotification('Masa Balik berjaya direkodkan.', 'success');
      disableButton('btn-balik');
      fetchTotal();
    });
}

/******************************************/
/*   2) FUNGSI DI HALAMAN REKOD (rekod.html)  */
/******************************************/
function initRekodPage() {
  initPasswordOverlay();

  const mainContainer = document.getElementById('main-container');
  if (!mainContainer) return;

  // Paparkan jadual
  fetchData();

  // Butang "Padam Semua"
  const deleteAllBtn = document.getElementById('delete-all');
  deleteAllBtn.addEventListener('click', handleDeleteAll);

  // Inisialisasi Modal Edit
  initEditModal();
}

/** Ambil data (doGet => getData) guna JSONP & populate jadual */
function fetchData() {
  const script = document.createElement('script');
  const callbackName = 'handleGetDataRekod_' + Date.now();

  window[callbackName] = (response) => {
    document.head.removeChild(script);
    delete window[callbackName];

    if (!response || response.status === 'Invalid action or no action specified') {
      showNotification('Permintaan data tidak sah.', 'error');
    } else {
      populateTable(response.data || []);
    }
  };

  script.src = `${API_URL}?action=getData&callback=${callbackName}`;
  document.head.appendChild(script);
}

/** Masukkan data ke jadual HTML */
function populateTable(data) {
  const tbody = document.querySelector('#data-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  data.forEach((row, index) => {
    const [tarikh, nama, kategori, waktuMula, waktuTamat] = row;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Tarikh">${escapeHTML(tarikh)}</td>
      <td data-label="Nama">${escapeHTML(nama)}</td>
      <td data-label="Kategori">${escapeHTML(kategori)}</td>
      <td data-label="Waktu Mula">${escapeHTML(waktuMula)}</td>
      <td data-label="Waktu Tamat">${escapeHTML(waktuTamat)}</td>
      <td data-label="Tindakan">
        <button class="edit-btn"
          onclick="openEditModal(${index + 2}, '${escapeHTML(tarikh)}', '${escapeHTML(nama)}', '${escapeHTML(kategori)}', '${escapeHTML(waktuMula)}', '${escapeHTML(waktuTamat)}')">
          Edit
        </button>
        <button class="delete-btn" onclick="deleteRow(${index + 2})">Padam</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/** Padam semua data */
function handleDeleteAll() {
  if (!confirm('Anda pasti mahu padam semua data?')) return;

  const payload = new URLSearchParams();
  payload.append('action', 'deleteAll');

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(() => {
      showNotification('Semua data berjaya dipadam', 'success');
      fetchData();
    })
    .catch(() => {
      showNotification('Semua data berjaya dipadam', 'success');
      fetchData();
    });
}

/** Padam satu baris */
function deleteRow(row) {
  if (!confirm('Anda pasti mahu padam baris ini?')) return;

  const payload = new URLSearchParams();
  payload.append('action', 'delete');
  payload.append('row', row);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(() => {
      showNotification('Berjaya dipadam', 'success');
      fetchData();
    })
    .catch(() => {
      showNotification('Berjaya dipadam', 'success');
      fetchData();
    });
}

/******************************************/
/*  Modal Edit (rekod.html)               */
/******************************************/
function initEditModal() {
  const editModal = document.getElementById('edit-modal');
  if (!editModal) return;

  const closeModal = editModal.querySelector('.close');
  closeModal.onclick = () => editModal.style.display = 'none';

  window.onclick = (event) => {
    if (event.target === editModal) {
      editModal.style.display = 'none';
    }
  };

  const editForm = document.getElementById('edit-form');
  editForm.addEventListener('submit', handleEditSubmit);
}

/** Buka modal Edit */
function openEditModal(row, tarikh, nama, kategori, waktuMula, waktuTamat) {
  const editModal = document.getElementById('edit-modal');
  editModal.style.display = 'block';

  document.getElementById('edit-row').value = row;

  // Ubah 'DD/MM/YYYY' -> 'YYYY-MM-DD'
  const tarikhParts = tarikh.split('/');
  if (tarikhParts.length === 3) {
    document.getElementById('edit-tarikh').value = `${tarikhParts[2]}-${tarikhParts[1]}-${tarikhParts[0]}`;
  } else {
    document.getElementById('edit-tarikh').value = '';
  }

  document.getElementById('edit-waktuMula').value = waktuMula;
  document.getElementById('edit-waktuTamat').value = waktuTamat;
}

/** Submit Edit */
function handleEditSubmit(e) {
  e.preventDefault();

  const row = document.getElementById('edit-row').value;
  const tarikh = document.getElementById('edit-tarikh').value;
  const waktuMula = document.getElementById('edit-waktuMula').value;
  const waktuTamat = document.getElementById('edit-waktuTamat').value;

  const payload = new URLSearchParams();
  payload.append('action', 'edit');
  payload.append('row', row);
  payload.append('tarikh', tarikh);
  payload.append('waktuMula', waktuMula);
  payload.append('waktuTamat', waktuTamat);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(() => {
      showNotification('Berjaya diedit', 'success');
      document.getElementById('edit-modal').style.display = 'none';
      fetchData();
    })
    .catch(() => {
      showNotification('Berjaya diedit', 'success');
      document.getElementById('edit-modal').style.display = 'none';
      fetchData();
    });
}
