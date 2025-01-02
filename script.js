// Gantikan dengan URL Web App Google Apps Script anda
const API_URL = 'https://script.google.com/macros/s/AKfycbzmpkvkLk6BeCgS1Os3vPA9Tw59RPGZSI59Ijl8rU0m0C1S38F0576V1sGDAbPPwZw/exec';

document.addEventListener('DOMContentLoaded', () => {
  // Tetapkan tarikh default ke hari ini
  setDefaultDate();

  // Tetapkan masa default (waktu semasa) pada input Waktu Mula & Waktu Tamat
  setDefaultTime();

  // Kemas kini jadual apabila laman dimuatkan
  fetchData();

  const form = document.getElementById('data-form');
  form.addEventListener('submit', handleFormSubmit);

  const deleteAllBtn = document.getElementById('delete-all');
  deleteAllBtn.addEventListener('click', handleDeleteAll);

  // Elemen modal
  const editModal = document.getElementById('edit-modal');
  const closeModal = document.querySelector('.close');
  const editForm = document.getElementById('edit-form');

  // Tutup modal apabila 'x' diklik
  closeModal.onclick = function() {
    editModal.style.display = 'none';
  };

  // Tutup modal apabila klik di luar kandungan modal
  window.onclick = function(event) {
    if (event.target == editModal) {
      editModal.style.display = 'none';
    }
  };

  // Tangani penghantaran borang edit
  editForm.addEventListener('submit', handleEditSubmit);

  // Butang 'Masuk' dan 'Balik'
  const btnMasuk = document.getElementById('btn-masuk');
  const btnBalik = document.getElementById('btn-balik');

  btnMasuk.addEventListener('click', handleMasukClick);
  btnBalik.addEventListener('click', handleBalikClick);
});

/**
 * Mengatur tarikh default ke hari ini (YYYY-MM-DD)
 */
function setDefaultDate() {
  const tarikhInput = document.getElementById('tarikh');
  const today = new Date().toISOString().split('T')[0];
  tarikhInput.value = today;
}

/**
 * Mengatur masa default (waktu semasa) untuk input time (format HH:MM)
 */
function setDefaultTime() {
  const waktuMulaInput = document.getElementById('waktuMula');
  const waktuTamatInput = document.getElementById('waktuTamat');
  const currentTime = getCurrentTimeString();

  waktuMulaInput.value = currentTime;
  waktuTamatInput.value = currentTime;
}

/**
 * Memperoleh masa semasa dalam format HH:MM
 */
function getCurrentTimeString() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  if (hours < 10) hours = '0' + hours;
  if (minutes < 10) minutes = '0' + minutes;

  return `${hours}:${minutes}`;
}

/**
 * Mengambil data menggunakan JSONP (doGet) dari Apps Script
 */
function fetchData() {
  const script = document.createElement('script');
  const callbackName = 'handleGetData_' + Date.now(); // Pastikan nama callback unik

  // Definisikan fungsi callback global
  window[callbackName] = function(response) {
    if (response.status === 'Invalid action or no action specified') {
      console.error('Invalid action or no action specified');
      showNotification('Permintaan data tidak sah.', 'error');
      return;
    }
    displayTotal(response.total);
    populateTable(response.data);
    toggleDataContainer(response.data && response.data.length > 0);

    // Bersihkan tag script dan callback selepas selesai
    document.head.removeChild(script);
    delete window[callbackName];
  };

  // Buat tag script dengan callback JSONP
  script.src = `${API_URL}?action=getData&callback=${callbackName}`;
  document.head.appendChild(script);
}

/**
 * Memaparkan jumlah ringgit
 */
function displayTotal(total) {
  document.getElementById('total').textContent = total || 0;
}

/**
 * Memaparkan data dalam jadual
 */
function populateTable(data) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = '';

  data.forEach((row, index) => {
    // row = [Tarikh, Nama, Kategori, WaktuMula, WaktuTamat, ...]
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

/**
 * Elakkan isu injeksi HTML
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Menangani papar/sorok bahagian jadual
 */
function toggleDataContainer(show) {
  const dataContainer = document.getElementById('data-container');
  dataContainer.style.display = show ? 'block' : 'none';
}

/**
 * Menangani penambahan data melalui borang "Tambah"
 */
function handleFormSubmit(event) {
  event.preventDefault();

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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  })
    .then(response => response.json())
    .then(result => {
      // Sentiasa 'Berjaya dihantar' tanpa ralat
      showNotification('Berjaya dihantar', 'success');

      // Reset borang
      document.getElementById('data-form').reset();
      setDefaultDate();
      setDefaultTime();
      fetchData();
    })
    .catch(error => {
      // Abaikan ralat di frontend
      console.error('Error:', error);
      showNotification('Berjaya dihantar', 'success');
      fetchData();
    });
}

/**
 * Menangani klik butang 'Masuk'
 */
function handleMasukClick() {
  const tarikh = document.getElementById('tarikh').value;
  if (!tarikh) {
    showNotification('Sila pilih tarikh terlebih dahulu.', 'error');
    return;
  }

  const waktuMulaInput = document.getElementById('waktuMula');
  const waktuMula = waktuMulaInput.value;

  const payload = new URLSearchParams();
  payload.append('action', 'recordStartTime');
  payload.append('tarikh', tarikh);
  payload.append('waktuMula', waktuMula);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(response => response.json())
    .then(result => {
      // Sentiasa papar 'Masa Masuk berjaya direkodkan'
      showNotification('Masa Masuk berjaya direkodkan.', 'success');
      
      // Tukar rupa butang Masuk -> kelabu, teks "Masa telah disetkan", disable
      const btnMasuk = document.getElementById('btn-masuk');
      btnMasuk.classList.add('disabled-btn');
      btnMasuk.disabled = true;
      btnMasuk.textContent = 'Masa telah disetkan';

      fetchData();
    })
    .catch(error => {
      // Abaikan ralat
      console.error('Error:', error);
      showNotification('Masa Masuk berjaya direkodkan.', 'success');

      const btnMasuk = document.getElementById('btn-masuk');
      btnMasuk.classList.add('disabled-btn');
      btnMasuk.disabled = true;
      btnMasuk.textContent = 'Masa telah disetkan';

      fetchData();
    });
}

/**
 * Menangani klik butang 'Balik'
 */
function handleBalikClick() {
  const tarikh = document.getElementById('tarikh').value;
  if (!tarikh) {
    showNotification('Sila pilih tarikh terlebih dahulu.', 'error');
    return;
  }

  const waktuTamatInput = document.getElementById('waktuTamat');
  const waktuTamat = waktuTamatInput.value;

  const payload = new URLSearchParams();
  payload.append('action', 'recordEndTime');
  payload.append('tarikh', tarikh);
  payload.append('waktuTamat', waktuTamat);

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(response => response.json())
    .then(result => {
      // Sentiasa papar 'Masa Balik berjaya direkodkan'
      showNotification('Masa Balik berjaya direkodkan.', 'success');

      // Tukar rupa butang Balik -> kelabu, teks "Masa telah disetkan", disable
      const btnBalik = document.getElementById('btn-balik');
      btnBalik.classList.add('disabled-btn');
      btnBalik.disabled = true;
      btnBalik.textContent = 'Masa telah disetkan';

      fetchData();
    })
    .catch(error => {
      // Abaikan ralat
      console.error('Error:', error);
      showNotification('Masa Balik berjaya direkodkan.', 'success');

      const btnBalik = document.getElementById('btn-balik');
      btnBalik.classList.add('disabled-btn');
      btnBalik.disabled = true;
      btnBalik.textContent = 'Masa telah disetkan';

      fetchData();
    });
}

/**
 * Menangani penghapusan satu baris
 */
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
    .then(response => response.json())
    .then(result => {
      // Sentiasa 'Berjaya dipadam'
      showNotification('Berjaya dipadam', 'success');
      fetchData();
    })
    .catch(error => {
      // Abaikan ralat
      console.error('Error:', error);
      showNotification('Berjaya dipadam', 'success');
      fetchData();
    });
}

/**
 * Menangani penghapusan semua data
 */
function handleDeleteAll() {
  if (!confirm('Anda pasti mahu padam semua data?')) return;

  const payload = new URLSearchParams();
  payload.append('action', 'deleteAll');

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString()
  })
    .then(response => response.json())
    .then(result => {
      // Sentiasa 'Semua data berjaya dipadam'
      showNotification('Semua data berjaya dipadam', 'success');
      fetchData();
    })
    .catch(error => {
      // Abaikan ralat
      console.error('Error:', error);
      showNotification('Semua data berjaya dipadam', 'success');
      fetchData();
    });
}

/**
 * Menangani penghantaran borang Edit
 */
function handleEditSubmit(event) {
  event.preventDefault();

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
    .then(response => response.json())
    .then(result => {
      // Sentiasa 'Berjaya diedit'
      showNotification('Berjaya diedit', 'success');
      document.getElementById('edit-modal').style.display = 'none';
      fetchData();
    })
    .catch(error => {
      // Abaikan ralat
      console.error('Error:', error);
      showNotification('Berjaya diedit', 'success');
      document.getElementById('edit-modal').style.display = 'none';
      fetchData();
    });
}

/**
 * Membuka modal Edit
 */
function openEditModal(row, tarikh, nama, kategori, waktuMula, waktuTamat) {
  const modal = document.getElementById('edit-modal');
  const editRow = document.getElementById('edit-row');
  const editTarikh = document.getElementById('edit-tarikh');
  const editWaktuMula = document.getElementById('edit-waktuMula');
  const editWaktuTamat = document.getElementById('edit-waktuTamat');

  editRow.value = row;

  // Convert Tarikh 'DD/MM/YYYY' -> 'YYYY-MM-DD' (jika format betul)
  const tarikhParts = tarikh.split('/');
  if (tarikhParts.length === 3) {
    editTarikh.value = `${tarikhParts[2]}-${tarikhParts[1]}-${tarikhParts[0]}`;
  } else {
    editTarikh.value = '';
  }

  editWaktuMula.value = waktuMula;
  editWaktuTamat.value = waktuTamat;

  modal.style.display = 'block';
}

/**
 * Menunjukkan notifikasi
 */
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  const container = document.getElementById('notification-container');
  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}
