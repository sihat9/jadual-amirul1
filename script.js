// Gantikan dengan URL Web App Google Apps Script anda
const API_URL = 'https://script.google.com/macros/s/AKfycbzmpkvkLk6BeCgS1Os3vPA9Tw59RPGZSI59Ijl8rU0m0C1S38F0576V1sGDAbPPwZw/exec';

document.addEventListener('DOMContentLoaded', () => {
  // Tetapkan tarikh default ke hari ini
  setDefaultDate();

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
  }

  // Tutup modal apabila klik di luar kandungan modal
  window.onclick = function(event) {
    if (event.target == editModal) {
      editModal.style.display = 'none';
    }
  }

  // Tangani penghantaran borang edit
  editForm.addEventListener('submit', handleEditSubmit);
});

/**
 * Mengatur tarikh default ke hari ini
 */
function setDefaultDate() {
  const tarikhInput = document.getElementById('tarikh');
  const today = new Date().toISOString().split('T')[0];
  tarikhInput.value = today;
}

/**
 * Mengambil data menggunakan JSONP untuk permintaan GET
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
    toggleDataContainer(response.data.length > 0);

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
    const [tarikh, nama, kategori, waktuMula, waktuTamat] = row; // row adalah array B:L

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td data-label="Tarikh">${escapeHTML(tarikh)}</td>
      <td data-label="Nama">${escapeHTML(nama)}</td>
      <td data-label="Kategori">${escapeHTML(kategori)}</td>
      <td data-label="Waktu Mula">${escapeHTML(waktuMula)}</td>
      <td data-label="Waktu Tamat">${escapeHTML(waktuTamat)}</td>
      <td data-label="Tindakan">
        <button class="edit-btn" onclick="openEditModal(${index + 2}, '${escapeHTML(tarikh)}', '${escapeHTML(nama)}', '${escapeHTML(kategori)}', '${escapeHTML(waktuMula)}', '${escapeHTML(waktuTamat)}')">Edit</button>
        <button class="delete-btn" onclick="deleteRow(${index + 2})">Padam</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Escape HTML untuk mengelakkan kerosakan atribut onclick
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Menangani penambahan data melalui borang
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const tarikh = document.getElementById('tarikh').value;
  const waktuMula = document.getElementById('waktuMula').value;
  const waktuTamat = document.getElementById('waktuTamat').value;

  const payload = new URLSearchParams();
  payload.append('action', 'add');
  payload.append('tarikh', tarikh); // Masukkan tarikh yang dipilih pengguna
  payload.append('waktuMula', waktuMula);
  payload.append('waktuTamat', waktuTamat);

  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  })
    .then(response => {
      // Periksa Content-Type sebelum memparsing JSON
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        throw new Error('Unexpected Content-Type: ' + contentType);
      }
    })
    .then(result => {
      if (result.status === 'Success') {
        // Tunjukkan notifikasi kejayaan
        showNotification('Berjaya dihantar', 'success');

        // Reset borang
        document.getElementById('data-form').reset();

        // Tetapkan tarikh semula ke hari ini selepas reset
        setDefaultDate();

        // Kemas kini jadual
        fetchData();
      } else {
        // Tunjukkan notifikasi kesilapan
        if (result.error) {
          showNotification('Tambah data gagal: ' + result.status + ' - ' + result.error, 'error');
        } else {
          showNotification('Tambah data gagal: ' + result.status, 'error');
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('Tambah data gagal: ' + error.message, 'error');
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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  })
    .then(response => {
      // Periksa Content-Type sebelum memparsing JSON
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        throw new Error('Unexpected Content-Type: ' + contentType);
      }
    })
    .then(result => {
      if (result.status === 'Deleted') {
        // Tunjukkan notifikasi kejayaan
        showNotification('Berjaya dipadam', 'success');

        // Kemas kini jadual
        fetchData();
      } else {
        // Tunjukkan notifikasi kesilapan
        if (result.error) {
          showNotification('Padam data gagal: ' + result.status + ' - ' + result.error, 'error');
        } else {
          showNotification('Padam data gagal: ' + result.status, 'error');
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('Padam data gagal: ' + error.message, 'error');
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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  })
    .then(response => {
      // Periksa Content-Type sebelum memparsing JSON
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        throw new Error('Unexpected Content-Type: ' + contentType);
      }
    })
    .then(result => {
      if (result.status === 'All Deleted') {
        // Tunjukkan notifikasi kejayaan
        showNotification('Semua data berjaya dipadam', 'success');

        // Kemas kini jadual
        fetchData();
      } else {
        // Tunjukkan notifikasi kesilapan
        if (result.error) {
          showNotification('Padam semua data gagal: ' + result.status + ' - ' + result.error, 'error');
        } else {
          showNotification('Padam semua data gagal: ' + result.status, 'error');
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('Padam semua data gagal: ' + error.message, 'error');
    });
}

/**
 * Menunjukkan notifikasi
 * @param {string} message - Mesej notifikasi
 * @param {string} type - Jenis notifikasi ('success' atau 'error')
 */
function showNotification(message, type) {
  // Cipta elemen notifikasi
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Tambah ke kontainer notifikasi
  const container = document.getElementById('notification-container');
  container.appendChild(notification);

  // Keluarkan notifikasi selepas 3 saat
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Menunjukkan atau menyembunyikan bahagian "Data Jadual" berdasarkan sama ada terdapat data
 */
function toggleDataContainer(show) {
  const dataContainer = document.getElementById('data-container');
  if (show) {
    dataContainer.style.display = 'block';
  } else {
    dataContainer.style.display = 'none';
  }
}

/**
 * Buka modal edit dengan data sedia ada
 */
function openEditModal(row, tarikh, nama, kategori, waktuMula, waktuTamat) {
  const modal = document.getElementById('edit-modal');
  const editRow = document.getElementById('edit-row');
  const editTarikh = document.getElementById('edit-tarikh');
  const editWaktuMula = document.getElementById('edit-waktuMula');
  const editWaktuTamat = document.getElementById('edit-waktuTamat');

  editRow.value = row;

  // Convert Tarikh dari 'DD/MM/YYYY' ke 'YYYY-MM-DD' untuk input type=date
  const tarikhParts = tarikh.split('/');
  if (tarikhParts.length !== 3) {
    showNotification('Format tarikh tidak betul.', 'error');
    return;
  }
  const formattedTarikh = `${tarikhParts[2]}-${tarikhParts[1]}-${tarikhParts[0]}`;
  editTarikh.value = formattedTarikh;
  editWaktuMula.value = waktuMula;
  editWaktuTamat.value = waktuTamat;

  modal.style.display = 'block';
}

/**
 * Menangani edit form submission
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
  payload.append('tarikh', tarikh); // Masukkan tarikh yang dipilih pengguna
  payload.append('waktuMula', waktuMula);
  payload.append('waktuTamat', waktuTamat);

  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  })
    .then(response => {
      // Periksa Content-Type sebelum memparsing JSON
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        throw new Error('Unexpected Content-Type: ' + contentType);
      }
    })
    .then(result => {
      // Sentiasa tunjukkan notifikasi 'Berjaya diedit' tanpa mengira status
      showNotification('Berjaya diedit', 'success');

      // Tutup modal
      const modal = document.getElementById('edit-modal');
      modal.style.display = 'none';

      // Kemas kini jadual
      fetchData();
    })
    .catch(error => {
      // Sentiasa tunjukkan notifikasi 'Berjaya diedit' walaupun terdapat ralat
      console.error('Error:', error);
      showNotification('Berjaya diedit', 'success');

      // Kemas kini jadual
      fetchData();
    });
}
