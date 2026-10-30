// ================== JAVASCRIPT: QUẢN LÝ KHO TỪ KHÓA (ADMIN) ==================
import { remoteConfig, getClientPublicIp, checkIpMatch } from './firebase.js';
import { fetchAndActivate, getString } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-remote-config.js";

async function verifyAdminAccess() {
  if (!remoteConfig) return;
  try {
    await fetchAndActivate(remoteConfig);
    const ipConfigVal = getString(remoteConfig, 'ip_config');
    if (!ipConfigVal || !ipConfigVal.trim()) {
      console.warn('Chưa cấu hình IP cho ip_config');
      alert('Bạn không có quyền truy cập trang quản trị kho từ khóa!');
      window.location.replace('/');
      return;
    }
    const clientIp = await getClientPublicIp();
    if (!clientIp || !checkIpMatch(clientIp, ipConfigVal)) {
      alert('Địa chỉ IP của bạn (' + (clientIp || 'Không xác định') + ') không được phép truy cập kho từ khóa!');
      window.location.replace('/');
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra bảo mật admin:', err);
  }
}
verifyAdminAccess();

const API_BASE = `http://${window.location.hostname || 'localhost'}:8080/api/words`;

// State
let currentPage = 1;
let currentLimit = 20;
let currentSearch = '';
let currentCategory = '';
let currentDifficulty = '';
let allCategories = [];

let isEditing = false;
let currentEditingId = null;
let currentDeletingItem = null;

// DOM Elements
const wordsTableBody = document.getElementById('wordsTableBody');
const paginationSummaryText = document.getElementById('paginationSummaryText');
const paginationNav = document.getElementById('paginationNav');
const limitSelect = document.getElementById('limitSelect');

const statTotalWords = document.getElementById('statTotalWords');
const statCategoriesCount = document.getElementById('statCategoriesCount');

const wordSearchInput = document.getElementById('wordSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilterSelect = document.getElementById('categoryFilterSelect');
const difficultyFilterSelect = document.getElementById('difficultyFilterSelect');
const openAddWordModalBtn = document.getElementById('openAddWordModalBtn');

// Form Modal Elements
const wordFormModal = document.getElementById('wordFormModal');
const closeFormModalBtn = document.getElementById('closeFormModalBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const wordForm = document.getElementById('wordForm');
const formModalTitle = document.getElementById('formModalTitle');
const formModalIcon = document.getElementById('formModalIcon');
const editWordId = document.getElementById('editWordId');
const wordInput = document.getElementById('wordInput');
const wordPreviewText = document.getElementById('wordPreviewText');
const wordLengthTag = document.getElementById('wordLengthTag');
const formCategorySelect = document.getElementById('formCategorySelect');
const toggleNewCategoryBtn = document.getElementById('toggleNewCategoryBtn');
const newCategoryBox = document.getElementById('newCategoryBox');
const newCategoryInput = document.getElementById('newCategoryInput');
const difficultyPills = document.getElementById('difficultyPills');
const formDifficultyVal = document.getElementById('formDifficultyVal');
const saveWordBtn = document.getElementById('saveWordBtn');
const saveBtnText = document.getElementById('saveBtnText');

// Delete Confirm Modal Elements
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteWordTargetName = document.getElementById('deleteWordTargetName');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Toast Container
const toastContainer = document.getElementById('toastContainer');

// ==================== KHỞI TẠO ====================
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadWords();
  setupEventListeners();
});

// ==================== TẢI DỮ LIỆU TỪ SERVER ====================

// 1. Tải danh sách danh mục (Categories)
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (res.ok) {
      allCategories = await res.json();
      renderCategoryOptions(allCategories);
      if (statCategoriesCount) {
        statCategoriesCount.textContent = `${allCategories.length} chủ đề`;
      }
    }
  } catch (err) {
    console.error('Lỗi tải danh mục:', err);
  }
}

function renderCategoryOptions(categories) {
  // Cập nhật cho bộ lọc toolbar
  if (categoryFilterSelect) {
    const prevVal = categoryFilterSelect.value;
    categoryFilterSelect.innerHTML = '<option value="">Tất cả danh mục</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilterSelect.appendChild(opt);
    });
    categoryFilterSelect.value = prevVal;
  }

  // Cập nhật cho form modal thêm/sửa
  if (formCategorySelect) {
    formCategorySelect.innerHTML = '<option value="">-- Chọn danh mục có sẵn --</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      formCategorySelect.appendChild(opt);
    });
  }
}

// 2. Tải danh sách từ khóa có phân trang, lọc & tìm kiếm
async function loadWords() {
  showTableLoading();

  const params = new URLSearchParams({
    page: currentPage,
    limit: currentLimit
  });

  if (currentSearch.trim()) params.append('search', currentSearch.trim());
  if (currentCategory) params.append('category', currentCategory);
  if (currentDifficulty) params.append('difficulty', currentDifficulty);

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const result = await res.json();
    renderWordsTable(result);
    renderPagination(result);

    if (statTotalWords && !currentSearch && !currentCategory && !currentDifficulty) {
      statTotalWords.textContent = `${result.total} từ`;
    }
  } catch (err) {
    console.error('Lỗi tải danh sách từ khóa:', err);
    showTableError('Không thể kết nối đến máy chủ backend (Cổng 8080). Hãy đảm bảo Backend đang chạy.');
  }
}

// ==================== RENDER GIAO DIỆN BẢNG DỮ LIỆU ====================

function showTableLoading() {
  wordsTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="table-loading-cell">
        <div class="loading-spinner"></div>
        <span>Đang nạp dữ liệu từ máy chủ...</span>
      </td>
    </tr>
  `;
}

function showTableError(message) {
  wordsTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="table-loading-cell" style="color: #ef4444;">
        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">⚠️</span>
        <strong>${escapeHtml(message)}</strong>
      </td>
    </tr>
  `;
}

function renderWordsTable(result) {
  const items = result.items || [];
  if (items.length === 0) {
    wordsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-loading-cell" style="color: #94a3b8;">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🔍</span>
          <strong>Không tìm thấy từ khóa nào phù hợp với bộ lọc hiện tại.</strong>
          <p style="font-size: 0.82rem; margin-top: 4px;">Hãy thử tìm với từ khóa khác hoặc nhấn "Thêm Từ Khóa" để tạo mới.</p>
        </td>
      </tr>
    `;
    return;
  }

  wordsTableBody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');

    // Format ngày tạo
    const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '---';

    // Badge độ khó
    const diff = (item.difficulty || 'NORMAL').toUpperCase();
    let diffClass = 'normal';
    let diffLabel = 'Bình thường';
    if (diff === 'EASY') {
      diffClass = 'easy';
      diffLabel = 'Dễ';
    } else if (diff === 'HARD') {
      diffClass = 'hard';
      diffLabel = 'Khó';
    }

    // Đếm ký tự thực tế (không tính khoảng trắng)
    const charCount = item.word ? item.word.replace(/\s+/g, '').length : 0;

    tr.innerHTML = `
      <td><span class="table-id-tag">#${item.id}</span></td>
      <td>
        <div class="word-display-cell">
          <strong class="word-text-title">${escapeHtml(item.word)}</strong>
          <span class="char-count-badge" title="Số ký tự chữ cái">${charCount} ký tự</span>
        </div>
      </td>
      <td>
        <span class="category-tag">
          <span>🏷️</span>
          <span>${escapeHtml(item.category || 'Tổng hợp')}</span>
        </span>
      </td>
      <td>
        <span class="difficulty-badge ${diffClass}">
          <span>●</span>
          <span>${diffLabel}</span>
        </span>
      </td>
      <td><span class="date-text">${createdDate}</span></td>
      <td>
        <div class="row-actions-cell">
          <button type="button" class="icon-action-btn edit-btn" title="Chỉnh sửa từ khóa" data-id="${item.id}">
            ✏️
          </button>
          <button type="button" class="icon-action-btn delete-btn" title="Xóa từ khóa" data-id="${item.id}">
            🗑️
          </button>
        </div>
      </td>
    `;

    // Gán sự kiện cho 2 nút Sửa và Xóa của dòng
    tr.querySelector('.edit-btn')?.addEventListener('click', () => openEditModal(item));
    tr.querySelector('.delete-btn')?.addEventListener('click', () => openDeleteModal(item));

    wordsTableBody.appendChild(tr);
  });
}

// Render các nút bấm Phân trang
function renderPagination(result) {
  const { page, limit, total, totalPages } = result;

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);
  paginationSummaryText.textContent = `Hiển thị ${startRecord} – ${endRecord} / Tổng số ${total} từ khóa`;

  paginationNav.innerHTML = '';
  if (totalPages <= 1) return;

  // Nút Previous
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '‹';
  prevBtn.title = 'Trang trước';
  prevBtn.disabled = page <= 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadWords();
    }
  });
  paginationNav.appendChild(prevBtn);

  // Tính toán các trang cần hiển thị
  let startP = Math.max(1, page - 2);
  let endP = Math.min(totalPages, page + 2);

  if (startP > 1) {
    const firstP = createPageBtn(1, page === 1);
    paginationNav.appendChild(firstP);
    if (startP > 2) {
      const dots = document.createElement('span');
      dots.style.color = '#64748b';
      dots.style.padding = '0 4px';
      dots.textContent = '...';
      paginationNav.appendChild(dots);
    }
  }

  for (let p = startP; p <= endP; p++) {
    const btn = createPageBtn(p, p === page);
    paginationNav.appendChild(btn);
  }

  if (endP < totalPages) {
    if (endP < totalPages - 1) {
      const dots = document.createElement('span');
      dots.style.color = '#64748b';
      dots.style.padding = '0 4px';
      dots.textContent = '...';
      paginationNav.appendChild(dots);
    }
    const lastP = createPageBtn(totalPages, page === totalPages);
    paginationNav.appendChild(lastP);
  }

  // Nút Next
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '›';
  nextBtn.title = 'Trang sau';
  nextBtn.disabled = page >= totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadWords();
    }
  });
  paginationNav.appendChild(nextBtn);
}

function createPageBtn(pageNum, isActive) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `page-btn ${isActive ? 'active' : ''}`;
  btn.textContent = pageNum;
  if (!isActive) {
    btn.addEventListener('click', () => {
      currentPage = pageNum;
      loadWords();
    });
  }
  return btn;
}

// ==================== MODAL THÊM / SỬA TỪ KHÓA ====================

function openAddModal() {
  isEditing = false;
  currentEditingId = null;
  formModalTitle.textContent = 'Thêm Từ Khóa Mới';
  formModalIcon.textContent = '➕';
  saveBtnText.textContent = 'Thêm từ khóa';

  wordForm.reset();
  editWordId.value = '';
  newCategoryBox.style.display = 'none';
  setDifficultyPill('NORMAL');
  updateWordPreview('');

  wordFormModal.classList.add('active');
  setTimeout(() => wordInput.focus(), 50);
}

function openEditModal(item) {
  isEditing = true;
  currentEditingId = item.id;
  formModalTitle.textContent = `Chỉnh Sửa Từ Khóa #${item.id}`;
  formModalIcon.textContent = '✏️';
  saveBtnText.textContent = 'Cập nhật thay đổi';

  editWordId.value = item.id;
  wordInput.value = item.word || '';
  updateWordPreview(item.word || '');

  // Kiểm tra danh mục có nằm trong danh sách select không
  newCategoryBox.style.display = 'none';
  if (allCategories.includes(item.category)) {
    formCategorySelect.value = item.category;
  } else {
    formCategorySelect.value = '';
    newCategoryBox.style.display = 'block';
    newCategoryInput.value = item.category || '';
  }

  setDifficultyPill(item.difficulty || 'NORMAL');

  wordFormModal.classList.add('active');
  setTimeout(() => wordInput.focus(), 50);
}

function closeFormModal() {
  wordFormModal.classList.remove('active');
}

function updateWordPreview(text) {
  const clean = text.trim().toUpperCase();
  if (clean) {
    wordPreviewText.textContent = clean;
    const count = clean.replace(/\s+/g, '').length;
    wordLengthTag.textContent = `${count} ký tự chữ`;
  } else {
    wordPreviewText.textContent = 'CHƯA NHẬP';
    wordLengthTag.textContent = '0 ký tự';
  }
}

function setDifficultyPill(val) {
  formDifficultyVal.value = val;
  const pills = difficultyPills.querySelectorAll('.diff-pill');
  pills.forEach(p => {
    if (p.dataset.val === val) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
}

// Xử lý gửi Form Thêm / Sửa
async function handleWordFormSubmit(e) {
  e.preventDefault();

  const rawWord = wordInput.value.trim().toUpperCase();
  if (!rawWord) {
    showToast('Vui lòng nhập từ khóa!', 'error');
    wordInput.focus();
    return;
  }

  let category = formCategorySelect.value;
  if (newCategoryBox.style.display !== 'none') {
    category = newCategoryInput.value.trim();
  }
  if (!category) {
    category = 'Tổng hợp';
  }

  const difficulty = formDifficultyVal.value || 'NORMAL';

  saveWordBtn.disabled = true;
  saveBtnText.textContent = 'Đang lưu...';

  try {
    if (isEditing && currentEditingId) {
      // Gọi API Cập nhật (PUT)
      const res = await fetch(`${API_BASE}/${currentEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: rawWord,
          category: category,
          difficulty: difficulty
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Cập nhật thất bại');
      }

      showToast(`Đã cập nhật từ khóa "${rawWord}" thành công!`, 'success');
    } else {
      // Gọi API Thêm mới (POST)
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: rawWord,
          category: category,
          difficulty: difficulty
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Thêm từ khóa thất bại');
      }

      showToast(`Đã thêm từ khóa mới "${rawWord}" vào Database!`, 'success');
    }

    closeFormModal();
    loadCategories(); // Nạp lại danh mục nếu có danh mục mới
    loadWords();      // Tải lại bảng từ khóa
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveWordBtn.disabled = false;
    saveBtnText.textContent = isEditing ? 'Cập nhật thay đổi' : 'Thêm từ khóa';
  }
}

// ==================== MODAL XÁC NHẬN XÓA TỪ KHÓA ====================

function openDeleteModal(item) {
  currentDeletingItem = item;
  deleteWordTargetName.textContent = `"${item.word}" (#${item.id})`;
  deleteConfirmModal.classList.add('active');
}

function closeDeleteModal() {
  deleteConfirmModal.classList.remove('active');
  currentDeletingItem = null;
}

async function handleConfirmDelete() {
  if (!currentDeletingItem) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Đang xóa...';

  try {
    const res = await fetch(`${API_BASE}/${currentDeletingItem.id}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Xóa từ khóa thất bại');
    }

    showToast(`Đã xóa từ khóa "${currentDeletingItem.word}" khỏi kho!`, 'success');
    closeDeleteModal();
    loadCategories();
    loadWords();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Xóa Vĩnh Viễn';
  }
}

// ==================== TOAST THÔNG BÁO ====================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==================== GẮN EVENT LISTENERS ====================

function setupEventListeners() {
  // Tìm kiếm với Debounce 350ms
  let searchDebounce = null;
  wordSearchInput?.addEventListener('input', () => {
    const val = wordSearchInput.value;
    clearSearchBtn.style.display = val ? 'block' : 'none';

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      currentSearch = val;
      currentPage = 1;
      loadWords();
    }, 350);
  });

  clearSearchBtn?.addEventListener('click', () => {
    wordSearchInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentSearch = '';
    currentPage = 1;
    loadWords();
    wordSearchInput.focus();
  });

  // Lọc theo Danh mục
  categoryFilterSelect?.addEventListener('change', () => {
    currentCategory = categoryFilterSelect.value;
    currentPage = 1;
    loadWords();
  });

  // Lọc theo Độ khó
  difficultyFilterSelect?.addEventListener('change', () => {
    currentDifficulty = difficultyFilterSelect.value;
    currentPage = 1;
    loadWords();
  });

  // Thay đổi số bản ghi mỗi trang (Limit)
  limitSelect?.addEventListener('change', () => {
    currentLimit = parseInt(limitSelect.value, 10) || 20;
    currentPage = 1;
    loadWords();
  });

  // Mở modal thêm từ khóa
  openAddWordModalBtn?.addEventListener('click', openAddModal);

  // Đóng modal thêm/sửa
  closeFormModalBtn?.addEventListener('click', closeFormModal);
  cancelFormBtn?.addEventListener('click', closeFormModal);

  // Submit Form thêm/sửa
  wordForm?.addEventListener('submit', handleWordFormSubmit);

  // Gõ từ khóa -> Cập nhật preview realtime
  wordInput?.addEventListener('input', () => {
    updateWordPreview(wordInput.value);
  });

  // Chọn nút Độ khó (Difficulty pills)
  difficultyPills?.addEventListener('click', (e) => {
    const pill = e.target.closest('.diff-pill');
    if (!pill) return;
    setDifficultyPill(pill.dataset.val);
  });

  // Nút mở/đóng ô nhập Danh mục mới
  toggleNewCategoryBtn?.addEventListener('click', () => {
    const isVisible = newCategoryBox.style.display !== 'none';
    newCategoryBox.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      newCategoryInput.focus();
    }
  });

  // Nút đóng/hủy modal xóa
  cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn?.addEventListener('click', handleConfirmDelete);

  // Click ra ngoài modal để đóng
  window.addEventListener('click', (e) => {
    if (e.target === wordFormModal) closeFormModal();
    if (e.target === deleteConfirmModal) closeDeleteModal();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
