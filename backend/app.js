require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { sequelize, User, Book, Category } = require('./src/models');
const routes = require('./src/routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const port = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await seedInitialData();

    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (e) {
    console.error('Database connection failed:', e.message);
    process.exit(1);
  }
}

async function seedInitialData() {
  await ensureDemoBooks();
  await ensureDefaultAdmin();
}

async function ensureDemoBooks() {
  const sampleGroups = [
    {
      name: '开发 / 技术类',
      books: [
        { title: '代码整洁之道（Clean Code）', author: 'Robert C. Martin', isbn: '978-7-121-15535-2' },
        { title: '算法导论（Introduction to Algorithms）', author: 'Thomas H. Cormen 等', isbn: '978-7-121-15518-5' },
        { title: '你不知道的JavaScript（上卷）', author: 'Kyle Simpson', isbn: '978-7-115-40023-3' },
        { title: '深入理解计算机系统（CSAPP）', author: 'Randal E. Bryant, David R. O’Hallaron', isbn: '978-7-111-58447-4' },
        { title: 'JavaScript权威指南（第7版）', author: 'David Flanagan', isbn: '978-7-121-39342-6' },
        { title: '重构：改善既有代码的设计（第2版）', author: 'Martin Fowler', isbn: '978-7-121-35423-6' },
        { title: '人月神话（The Mythical Man-Month）', author: 'Frederick P. Brooks Jr.', isbn: '978-7-302-10802-4' }
      ]
    },
    {
      name: '文学类',
      books: [
        { title: '活着', author: '余华', isbn: '978-7-5321-3791-8' },
        { title: '百年孤独（Cien años de soledad）', author: '加西亚·马尔克斯', isbn: '978-7-5321-3913-4' },
        { title: '挪威的森林', author: '村上春树', isbn: '978-7-5321-3231-9' },
        { title: '小王子（Le Petit Prince）', author: '安东尼·德·圣-埃克苏佩里', isbn: '978-7-5321-3449-8' },
        { title: '追风筝的人（The Kite Runner）', author: '卡勒德·胡赛尼', isbn: '978-7-5321-3987-5' },
        { title: '我们仨', author: '杨绛', isbn: '978-7-5321-2958-6' },
        { title: '瓦尔登湖（Walden）', author: '亨利·戴维·梭罗', isbn: '978-7-5447-0545-0' }
      ]
    },
    {
      name: '小说类',
      books: [
        { title: '1984', author: '乔治·奥威尔', isbn: '978-7-5321-4064-2' },
        { title: '了不起的盖茨比（The Great Gatsby）', author: 'F. 斯科特·菲茨杰拉德', isbn: '978-7-5321-3243-2' },
        { title: '杀死一只知更鸟（To Kill a Mockingbird）', author: '哈珀·李', isbn: '978-7-5321-3659-1' },
        { title: '白夜行', author: '东野圭吾', isbn: '978-7-5321-3515-0' },
        { title: '解忧杂货店', author: '东野圭吾', isbn: '978-7-5321-5173-0' },
        { title: '悲惨世界（Les Misérables）', author: '维克多·雨果', isbn: '978-7-5321-2861-9' }
      ]
    }
  ];

  for (const group of sampleGroups) {
    const [category] = await Category.findOrCreate({ where: { name: group.name } });

    for (const book of group.books) {
      const [record] = await Book.findOrCreate({
        where: { isbn: book.isbn },
        defaults: {
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          stock: 5,
          category_id: category.id
        }
      });

      if (record.category_id !== category.id) {
        await record.update({ category_id: category.id });
      }
    }
  }

  console.log('[bootstrap] Ensured sample categories and books.');
}

async function ensureDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await User.findOne({ where: { username } });
  if (existing) return;

  const password_hash = await bcrypt.hash(password, 10);
  await User.create({ username, password_hash, role: 'admin' });
  console.log(`[bootstrap] Default admin ${username} is ready.`);
}

bootstrap();
