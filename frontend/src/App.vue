<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Paper Library</h1>
      <nav>
        <RouterLink to="/admin">管理员后台</RouterLink>
        <RouterLink to="/student">学生自助</RouterLink>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background-color: #f5f6fb;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: #1f2937;
  color: #fff;
}

.app-header h1 {
  margin: 0;
  font-size: 18px;
}

nav a {
  color: #d1d5db;
  margin-left: 16px;
  text-decoration: none;
}

nav a.router-link-active {
  color: #60a5fa;
}

main {
  min-height: calc(100vh - 64px);
}
</style>
