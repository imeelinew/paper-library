<template>
  <div class="student-page">
    <el-card class="hero-card">
      <template #header>
        <div class="hero-header">
          <div>
            <div class="hero-title">学生自助借阅中心</div>
            <p class="hero-subtitle">登录后即可浏览馆藏、发起借阅并查看我的借阅历史。</p>
          </div>
          <div v-if="isAuthed" class="hero-actions">
            <span>你好，{{ currentUser?.username }}</span>
            <el-button size="small" plain @click="logout">退出登录</el-button>
          </div>
        </div>
      </template>

      <div v-if="!isAuthed" class="auth-panel">
        <el-card class="auth-card">
          <template #header>学生登录</template>
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username" autocomplete="username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" autocomplete="current-password" />
            </el-form-item>
            <el-button type="primary" :loading="loginLoading" @click="login">登录</el-button>
          </el-form>
        </el-card>

        <el-card class="auth-card">
          <template #header>新用户注册</template>
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="用户名">
              <el-input v-model="registerForm.username" autocomplete="off" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="registerForm.password" type="password" autocomplete="new-password" />
            </el-form-item>
            <el-form-item label="确认密码">
              <el-input v-model="registerForm.confirm" type="password" autocomplete="new-password" />
            </el-form-item>
            <el-button type="success" :loading="registerLoading" @click="register">注册并登录</el-button>
          </el-form>
        </el-card>
      </div>
    </el-card>

    <div v-if="isAuthed" class="content-grid">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>馆藏书目</span>
            <div>
              <el-input
                v-model="filters.keyword"
                placeholder="搜索书名 / 作者 / ISBN"
                size="small"
                clearable
                @keyup.enter="handleSearch"
                style="width: 240px"
              />
              <el-button size="small" style="margin-left: 8px" @click="handleSearch">搜索</el-button>
            </div>
          </div>
        </template>

        <el-table :data="books" v-loading="booksLoading" empty-text="暂无数据">
          <el-table-column prop="title" label="书名" min-width="160" />
          <el-table-column prop="author" label="作者" min-width="120" />
          <el-table-column prop="isbn" label="ISBN" min-width="150" />
          <el-table-column label="分类" min-width="120">
            <template #default="{ row }">
              {{ row.category?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="stock" label="库存" width="90" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button size="small" type="primary" :disabled="row.stock === 0" @click="openBorrowDialog(row)">
                借阅
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-pagination">
          <el-pagination
            background
            layout="prev, pager, next"
            :current-page="pagination.page"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>

      <el-card>
        <template #header>
          <div class="card-header">
            <span>我的借阅记录</span>
            <el-button size="small" @click="fetchMyBorrowRecords" :loading="borrowLoading">刷新</el-button>
          </div>
        </template>

        <el-table :data="borrowRecords" v-loading="borrowLoading" empty-text="暂无借阅记录">
          <el-table-column label="书名" min-width="150">
            <template #default="{ row }">
              {{ row.book?.title || '-' }}
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
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button
                size="small"
                type="success"
                :disabled="row.status === 'returned'"
                @click="returnBorrow(row)"
              >
                归还
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog v-model="borrowDialogVisible" title="借阅图书" width="420px">
      <el-form :model="borrowForm" label-width="100px">
        <el-form-item label="书名">
          <span>{{ borrowForm.title }}</span>
        </el-form-item>
        <el-form-item label="借阅人">
          <el-input v-model="borrowForm.borrower_name" placeholder="默认使用当前账号" />
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
        <el-button type="primary" :loading="borrowSubmitLoading" @click="submitBorrow">确认借阅</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../services/api';

const loginForm = reactive({ username: '', password: '' });
const registerForm = reactive({ username: '', password: '', confirm: '' });
const loginLoading = ref(false);
const registerLoading = ref(false);

const token = ref(localStorage.getItem('paper_token') || '');
const currentUser = ref(readStoredUser());
const isAuthed = computed(() => Boolean(token.value) && currentUser.value?.role === 'user');

const filters = reactive({ keyword: '', page: 1, pageSize: 8 });
const books = ref([]);
const pagination = reactive({ page: 1, pageSize: 8, total: 0 });
const booksLoading = ref(false);

const borrowRecords = ref([]);
const borrowLoading = ref(false);

const borrowDialogVisible = ref(false);
const borrowSubmitLoading = ref(false);
const borrowForm = reactive({
  bookId: null,
  title: '',
  borrower_name: '',
  borrower_contact: '',
  days: 14
});

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('paper_user') || 'null');
  } catch {
    return null;
  }
}

function persistAuth(data) {
  token.value = data.token;
  currentUser.value = data.user;
  localStorage.setItem('paper_token', token.value);
  localStorage.setItem('paper_user', JSON.stringify(currentUser.value));
}

async function login() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loginLoading.value = true;
  try {
    const { data } = await api.post('/auth/login', loginForm);
    if (data.data?.user?.role !== 'user') {
      ElMessage.warning('该账号不是学生，请使用管理员入口');
      loginLoading.value = false;
      return;
    }
    persistAuth(data.data);
    ElMessage.success('登录成功');
    await Promise.all([fetchBooks(), fetchMyBorrowRecords()]);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '登录失败');
  } finally {
    loginLoading.value = false;
  }
}

async function register() {
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning('请填写用户名和密码');
    return;
  }
  if (registerForm.password !== registerForm.confirm) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }
  registerLoading.value = true;
  try {
    const { data } = await api.post('/auth/register', {
      username: registerForm.username,
      password: registerForm.password
    });
    persistAuth(data.data);
    ElMessage.success('注册成功，已自动登录');
    registerForm.username = '';
    registerForm.password = '';
    registerForm.confirm = '';
    await Promise.all([fetchBooks(), fetchMyBorrowRecords()]);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败');
  } finally {
    registerLoading.value = false;
  }
}

function logout() {
  token.value = '';
  currentUser.value = null;
  localStorage.removeItem('paper_token');
  localStorage.removeItem('paper_user');
  borrowRecords.value = [];
  books.value = [];
  ElMessage.success('已退出登录');
}

async function fetchBooks() {
  booksLoading.value = true;
  try {
    const params = {
      keyword: filters.keyword || undefined,
      page: filters.page,
      pageSize: filters.pageSize
    };
    const { data } = await api.get('/books', { params });
    books.value = data.data?.list || [];
    const pag = data.data?.pagination || {};
    pagination.page = pag.page || filters.page;
    pagination.pageSize = pag.pageSize || filters.pageSize;
    pagination.total = pag.total || 0;
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取图书失败');
  } finally {
    booksLoading.value = false;
  }
}

async function fetchMyBorrowRecords() {
  borrowLoading.value = true;
  try {
    const { data } = await api.get('/me/borrow-records');
    borrowRecords.value = data.data?.list || [];
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '获取借阅记录失败');
  } finally {
    borrowLoading.value = false;
  }
}

function handleSearch() {
  filters.page = 1;
  fetchBooks();
}

function handlePageChange(page) {
  filters.page = page;
  fetchBooks();
}

function openBorrowDialog(book) {
  borrowForm.bookId = book.id;
  borrowForm.title = book.title;
  borrowForm.borrower_name = currentUser.value?.username || '';
  borrowForm.borrower_contact = '';
  borrowForm.days = 14;
  borrowDialogVisible.value = true;
}

async function submitBorrow() {
  if (!borrowForm.bookId) return;
  borrowSubmitLoading.value = true;
  try {
    await api.post(`/books/${borrowForm.bookId}/borrow`, {
      borrower_name: borrowForm.borrower_name,
      borrower_contact: borrowForm.borrower_contact,
      days: borrowForm.days
    });
    ElMessage.success('借阅成功');
    borrowDialogVisible.value = false;
    await Promise.all([fetchBooks(), fetchMyBorrowRecords()]);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '借阅失败');
  } finally {
    borrowSubmitLoading.value = false;
  }
}

async function returnBorrow(record) {
  try {
    await ElMessageBox.confirm(`确认归还《${record.book?.title}》吗？`, '提示', { type: 'info' });
    await api.post(`/borrow-records/${record.id}/return`);
    ElMessage.success('已归还');
    await Promise.all([fetchBooks(), fetchMyBorrowRecords()]);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '归还失败');
    }
  }
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
    fetchBooks();
    fetchMyBorrowRecords();
  }
});

onMounted(() => {
  if (isAuthed.value) {
    fetchBooks();
    fetchMyBorrowRecords();
  }
});
</script>

<style scoped>
.student-page {
  padding: 24px;
}

.hero-card {
  margin-bottom: 16px;
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}

.hero-title {
  font-size: 20px;
  font-weight: 600;
}

.hero-subtitle {
  margin: 4px 0 0;
  color: #6b7280;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auth-panel {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.auth-card {
  flex: 1;
  min-width: 260px;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
