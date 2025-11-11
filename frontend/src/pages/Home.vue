<template>
  <div class="home-page">
    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>健康检查</template>
          <div>后端状态：{{ healthText }}</div>
          <el-button class="mt-12" @click="fetchHealth" :loading="healthLoading">重新检测</el-button>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>管理员登录</template>
          <div v-if="isAuthed" class="logged-panel">
            <p>当前账号：{{ currentUser?.username }}（{{ currentUser?.role }}）</p>
            <el-button size="small" @click="logout">退出登录</el-button>
          </div>
          <el-form v-else label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="authForm.username" autocomplete="username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="authForm.password" type="password" autocomplete="current-password" />
            </el-form-item>
            <el-button type="primary" :loading="authLoading" @click="login">登录</el-button>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="mt-24">
      <template #header>
        <div class="card-header">
          <span>图书管理</span>
          <div>
            <el-button size="small" @click="fetchBooks" :loading="booksLoading">刷新</el-button>
            <el-button type="primary" size="small" :disabled="!isAuthed" @click="openCreate">新增图书</el-button>
          </div>
        </div>
      </template>

      <el-form class="filter-form" :model="filters" inline @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="书名 / 作者 / ISBN"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filters.categoryId"
            placeholder="全部分类"
            clearable
            style="width: 200px"
            @change="handleSearch"
          >
            <el-option value="" label="全部分类" />
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="books" v-loading="booksLoading" empty-text="暂无图书">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="书名" min-width="160" />
        <el-table-column prop="author" label="作者" min-width="120" />
        <el-table-column prop="isbn" label="ISBN" min-width="140" />
        <el-table-column prop="category.name" label="分类" min-width="110">
          <template #default="{ row }">
            {{ row.category?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="90" />
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button size="small" :disabled="!isAuthed" @click="openEdit(row)">编辑</el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="!isAuthed"
              @click="deleteBook(row)"
            >
              删除
            </el-button>
            <el-button
              size="small"
              type="success"
              :disabled="!isAuthed || row.stock === 0"
              @click="openBorrowDialog(row)"
            >
              借出
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[5, 10, 20, 50]"
          :total="pagination.total"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-row :gutter="16" class="mt-24">
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>分类管理</span>
              <el-button
                size="small"
                type="primary"
                :disabled="!isAuthed"
                @click="openCategoryDialog('create')"
              >
                新增分类
              </el-button>
            </div>
          </template>
          <el-table
            :data="categories"
            height="360"
            v-loading="categoriesLoading"
            empty-text="暂无分类"
          >
            <el-table-column prop="name" label="分类名称" min-width="150" />
            <el-table-column prop="book_count" label="图书数量" width="120" />
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button
                  size="small"
                  :disabled="!isAuthed"
                  @click="openCategoryDialog('edit', row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  :disabled="!isAuthed"
                  @click="deleteCategory(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>借阅记录</span>
              <el-select
                v-model="borrowFilters.status"
                placeholder="全部状态"
                clearable
                size="small"
                style="width: 160px"
                :disabled="!isAuthed"
                @change="handleBorrowFilter"
              >
                <el-option label="全部" value="" />
                <el-option label="借出中" value="borrowed" />
                <el-option label="已逾期" value="overdue" />
                <el-option label="已归还" value="returned" />
              </el-select>
            </div>
          </template>

          <el-table
            :data="borrowRecords"
            v-loading="borrowLoading"
            height="310"
            empty-text="暂无记录"
          >
            <el-table-column label="书名" min-width="150">
              <template #default="{ row }">
                {{ row.book?.title || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="借阅人" min-width="140">
              <template #default="{ row }">
                {{ row.borrower_name || '未填写' }}
              </template>
            </el-table-column>
            <el-table-column label="借出/到期" min-width="180">
              <template #default="{ row }">
                <div>{{ row.borrow_date }} → {{ row.due_date }}</div>
                <div v-if="row.return_date">归还：{{ row.return_date }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button
                  size="small"
                  type="success"
                  :disabled="!isAuthed || row.status === 'returned'"
                  @click="returnBorrow(row)"
                >
                  归还
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="borrowPagination.page"
              :page-size="borrowPagination.pageSize"
              :total="borrowPagination.total"
              :disabled="!isAuthed"
              @current-change="handleBorrowPageChange"
            />
          </div>
        </el-card>

        <el-card class="mt-16">
          <template #header>
            <div class="card-header">
              <span>操作日志</span>
              <el-button size="small" :disabled="!isAuthed" @click="fetchLogs">刷新</el-button>
            </div>
          </template>

          <el-table
            :data="logs"
            v-loading="logsLoading"
            height="240"
            empty-text="暂无日志"
          >
            <el-table-column label="时间" width="160">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="action" label="动作" min-width="140" />
            <el-table-column label="目标" min-width="160">
              <template #default="{ row }">
                {{ row.target || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作者" width="120">
              <template #default="{ row }">
                {{ row.user?.username || '系统' }}
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="logPagination.page"
              :page-size="logPagination.pageSize"
              :total="logPagination.total"
              :disabled="!isAuthed"
              @current-change="handleLogPageChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增图书' : '编辑图书'" width="520px">
      <el-form :model="bookForm" label-width="90px">
        <el-form-item label="书名" required>
          <el-input v-model="bookForm.title" />
        </el-form-item>
        <el-form-item label="作者" required>
          <el-input v-model="bookForm.author" />
        </el-form-item>
        <el-form-item label="ISBN">
          <el-input v-model="bookForm.isbn" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="bookForm.stock" :min="0" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="bookForm.category_id" placeholder="请选择分类" clearable>
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitBook">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="categoryDialogVisible"
      :title="categoryDialogMode === 'create' ? '新增分类' : '编辑分类'"
      width="400px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="categoryForm.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="categorySubmitLoading" @click="submitCategory">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="borrowDialogVisible" title="借出图书" width="460px">
      <el-form :model="borrowForm" label-width="100px">
        <el-form-item label="图书">
          <span>{{ borrowForm.title }}</span>
        </el-form-item>
        <el-form-item label="借阅人" required>
          <el-input v-model="borrowForm.borrower_name" placeholder="请输入借阅人姓名" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="borrowForm.borrower_contact" placeholder="手机 / 邮箱 (可选)" />
        </el-form-item>
        <el-form-item label="借阅天数">
          <el-input-number v-model="borrowForm.days" :min="1" :max="60" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="borrowDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="borrowSubmitLoading" @click="submitBorrow">确认借出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';

const healthText = ref('检查中...');
const healthLoading = ref(false);

const books = ref([]);
const booksLoading = ref(false);
const filters = reactive({
  keyword: '',
  categoryId: '',
  page: 1,
  pageSize: 10
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
});

const categories = ref([]);
const categoriesLoading = ref(false);

const authForm = reactive({
  username: 'admin',
  password: ''
});
const authLoading = ref(false);

const storedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('paper_user') || 'null');
  } catch {
    return null;
  }
})();

const token = ref(localStorage.getItem('paper_token') || '');
const currentUser = ref(storedUser);
const isAuthed = computed(() => Boolean(token.value));

const dialogVisible = ref(false);
const dialogMode = ref('create');
const submitLoading = ref(false);
const bookForm = reactive({
  id: null,
  title: '',
  author: '',
  isbn: '',
  stock: 1,
  category_id: ''
});

const categoryDialogVisible = ref(false);
const categoryDialogMode = ref('create');
const categorySubmitLoading = ref(false);
const categoryForm = reactive({
  id: null,
  name: ''
});

const borrowDialogVisible = ref(false);
const borrowSubmitLoading = ref(false);
const borrowForm = reactive({
  bookId: null,
  title: '',
  borrower_name: '',
  borrower_contact: '',
  days: 14
});

const borrowRecords = ref([]);
const borrowLoading = ref(false);
const borrowFilters = reactive({
  status: '',
  page: 1,
  pageSize: 5
});
const borrowPagination = reactive({
  page: 1,
  pageSize: 5,
  total: 0
});

const logs = ref([]);
const logsLoading = ref(false);
const logPagination = reactive({
  page: 1,
  pageSize: 5,
  total: 0
});

async function fetchHealth() {
  healthLoading.value = true;
  try {
    const { data } = await api.get('/health');
    healthText.value = data.message === 'ok' ? '正常' : '异常';
  } catch {
    healthText.value = '连接失败';
  } finally {
    healthLoading.value = false;
  }
}

async function fetchCategories() {
  categoriesLoading.value = true;
  try {
    const { data } = await api.get('/categories');
    categories.value = data.data || [];
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取分类失败');
  } finally {
    categoriesLoading.value = false;
  }
}

async function fetchBooks() {
  booksLoading.value = true;
  try {
    const params = {
      keyword: filters.keyword || undefined,
      categoryId: filters.categoryId || undefined,
      page: filters.page,
      pageSize: filters.pageSize
    };
    const { data } = await api.get('/books', { params });
    books.value = data.data?.list || [];
    const pag = data.data?.pagination || {};
    pagination.page = pag.page || filters.page;
    pagination.pageSize = pag.pageSize || filters.pageSize;
    pagination.total = pag.total || 0;
    pagination.totalPages = pag.totalPages || 0;
    filters.page = pagination.page;
    filters.pageSize = pagination.pageSize;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取图书失败');
  } finally {
    booksLoading.value = false;
  }
}

async function fetchBorrowRecords() {
  if (!isAuthed.value) {
    borrowRecords.value = [];
    return;
  }
  borrowLoading.value = true;
  try {
    const params = {
      status: borrowFilters.status || undefined,
      page: borrowFilters.page,
      pageSize: borrowFilters.pageSize
    };
    const { data } = await api.get('/borrow-records', { params });
    borrowRecords.value = data.data?.list || [];
    const pag = data.data?.pagination || {};
    borrowPagination.page = pag.page || borrowFilters.page;
    borrowPagination.pageSize = pag.pageSize || borrowFilters.pageSize;
    borrowPagination.total = pag.total || 0;
    borrowFilters.page = borrowPagination.page;
    borrowFilters.pageSize = borrowPagination.pageSize;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取借阅记录失败');
  } finally {
    borrowLoading.value = false;
  }
}

async function fetchLogs() {
  if (!isAuthed.value) {
    logs.value = [];
    return;
  }
  logsLoading.value = true;
  try {
    const params = {
      page: logPagination.page,
      pageSize: logPagination.pageSize
    };
    const { data } = await api.get('/logs', { params });
    logs.value = data.data?.list || [];
    const pag = data.data?.pagination || {};
    logPagination.page = pag.page || logPagination.page;
    logPagination.pageSize = pag.pageSize || logPagination.pageSize;
    logPagination.total = pag.total || 0;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取日志失败');
  } finally {
    logsLoading.value = false;
  }
}

async function login() {
  authLoading.value = true;
  try {
    const { data } = await api.post('/auth/login', authForm);
    if (data.code !== 0) throw new Error(data.message || '登录失败');
    token.value = data.data.token;
    currentUser.value = data.data.user;
    localStorage.setItem('paper_token', token.value);
    localStorage.setItem('paper_user', JSON.stringify(currentUser.value));
    authForm.password = '';
    ElMessage.success('登录成功');
    await Promise.all([fetchBorrowRecords(), fetchLogs()]);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '登录失败');
  } finally {
    authLoading.value = false;
  }
}

function logout() {
  token.value = '';
  currentUser.value = null;
  localStorage.removeItem('paper_token');
  localStorage.removeItem('paper_user');
  borrowRecords.value = [];
  logs.value = [];
  ElMessage.success('已退出登录');
}

function openCreate() {
  dialogMode.value = 'create';
  resetBookForm();
  dialogVisible.value = true;
}

function openEdit(row) {
  dialogMode.value = 'edit';
  bookForm.id = row.id;
  bookForm.title = row.title;
  bookForm.author = row.author;
  bookForm.isbn = row.isbn || '';
  bookForm.stock = row.stock ?? 1;
  bookForm.category_id = row.category?.id ?? '';
  dialogVisible.value = true;
}

function resetBookForm() {
  bookForm.id = null;
  bookForm.title = '';
  bookForm.author = '';
  bookForm.isbn = '';
  bookForm.stock = 1;
  bookForm.category_id = '';
}

async function submitBook() {
  if (!bookForm.title || !bookForm.author) {
    ElMessage.warning('请填写书名和作者');
    return;
  }
  submitLoading.value = true;
  const payload = {
    title: bookForm.title,
    author: bookForm.author,
    isbn: bookForm.isbn || null,
    stock: Number(bookForm.stock) || 0,
    category_id: bookForm.category_id || null
  };
  try {
    if (dialogMode.value === 'create') {
      await api.post('/books', payload);
      ElMessage.success('新增成功');
    } else {
      await api.put(`/books/${bookForm.id}`, payload);
      ElMessage.success('更新成功');
    }
    dialogVisible.value = false;
    await fetchBooks();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '保存失败');
  } finally {
    submitLoading.value = false;
  }
}

async function deleteBook(row) {
  try {
    await ElMessageBox.confirm(`确认删除“${row.title}”吗？`, '提示', { type: 'warning' });
    await api.delete(`/books/${row.id}`);
    ElMessage.success('删除成功');
    await fetchBooks();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除失败');
    }
  }
}

function openCategoryDialog(mode, category) {
  categoryDialogMode.value = mode;
  if (mode === 'edit' && category) {
    categoryForm.id = category.id;
    categoryForm.name = category.name;
  } else {
    categoryForm.id = null;
    categoryForm.name = '';
  }
  categoryDialogVisible.value = true;
}

async function submitCategory() {
  if (!categoryForm.name.trim()) {
    ElMessage.warning('请填写分类名称');
    return;
  }
  categorySubmitLoading.value = true;
  try {
    if (categoryDialogMode.value === 'create') {
      await api.post('/categories', { name: categoryForm.name });
      ElMessage.success('新增分类成功');
    } else {
      await api.put(`/categories/${categoryForm.id}`, { name: categoryForm.name });
      ElMessage.success('分类已更新');
    }
    categoryDialogVisible.value = false;
    await fetchCategories();
    await fetchBooks();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '保存分类失败');
  } finally {
    categorySubmitLoading.value = false;
  }
}

async function deleteCategory(category) {
  try {
    await ElMessageBox.confirm(`确认删除分类“${category.name}”吗？`, '提示', { type: 'warning' });
    await api.delete(`/categories/${category.id}`);
    ElMessage.success('分类已删除');
    await fetchCategories();
    await fetchBooks();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除分类失败');
    }
  }
}

function openBorrowDialog(book) {
  borrowForm.bookId = book.id;
  borrowForm.title = book.title;
  borrowForm.borrower_name = '';
  borrowForm.borrower_contact = '';
  borrowForm.days = 14;
  borrowDialogVisible.value = true;
}

async function submitBorrow() {
  if (!borrowForm.borrower_name.trim()) {
    ElMessage.warning('请填写借阅人姓名');
    return;
  }
  borrowSubmitLoading.value = true;
  try {
    await api.post(`/books/${borrowForm.bookId}/borrow`, {
      borrower_name: borrowForm.borrower_name,
      borrower_contact: borrowForm.borrower_contact,
      days: borrowForm.days
    });
    ElMessage.success('借出成功');
    borrowDialogVisible.value = false;
    await fetchBooks();
    await fetchBorrowRecords();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '借出失败');
  } finally {
    borrowSubmitLoading.value = false;
  }
}

async function returnBorrow(record) {
  try {
    await ElMessageBox.confirm(`确认将“${record.book?.title}”标记为归还吗？`, '提示', { type: 'info' });
    await api.post(`/borrow-records/${record.id}/return`);
    ElMessage.success('已归还');
    await fetchBooks();
    await fetchBorrowRecords();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '归还失败');
    }
  }
}

function handleSearch() {
  filters.page = 1;
  fetchBooks();
}

function resetFilters() {
  filters.keyword = '';
  filters.categoryId = '';
  filters.page = 1;
  fetchBooks();
}

function handlePageChange(page) {
  filters.page = page;
  fetchBooks();
}

function handleSizeChange(size) {
  filters.pageSize = size;
  filters.page = 1;
  fetchBooks();
}

function handleBorrowFilter() {
  borrowFilters.page = 1;
  fetchBorrowRecords();
}

function handleBorrowPageChange(page) {
  borrowFilters.page = page;
  fetchBorrowRecords();
}

function handleLogPageChange(page) {
  logPagination.page = page;
  fetchLogs();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function statusLabel(status) {
  const map = {
    borrowed: '借出中',
    overdue: '已逾期',
    returned: '已归还'
  };
  return map[status] || status;
}

function statusTagType(status) {
  const map = {
    borrowed: 'warning',
    overdue: 'danger',
    returned: 'success'
  };
  return map[status] || 'info';
}

watch(isAuthed, (value) => {
  if (value) {
    fetchBorrowRecords();
    fetchLogs();
  } else {
    borrowRecords.value = [];
    logs.value = [];
  }
});

onMounted(() => {
  fetchHealth();
  fetchCategories();
  fetchBooks();
  if (isAuthed.value) {
    fetchBorrowRecords();
    fetchLogs();
  }
});
</script>

<style scoped>
.home-page {
  padding: 24px;
}

.mt-12 {
  margin-top: 12px;
}

.mt-16 {
  margin-top: 16px;
}

.mt-24 {
  margin-top: 24px;
}

.logged-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-form {
  margin-bottom: 12px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
