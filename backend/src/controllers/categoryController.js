const { sequelize, Category, Book } = require('../models');
const { writeLog } = require('../utils/logger');

async function listCategories(req, res) {
  const categories = await Category.findAll({
    attributes: {
      include: [
        [
          sequelize.literal('(SELECT COUNT(*) FROM books WHERE books.category_id = categories.id)'),
          'book_count'
        ]
      ]
    },
    order: [['name', 'ASC']]
  });
  res.json({ code: 0, message: 'ok', data: categories });
}

async function createCategory(req, res) {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ code: 400, message: 'Category name is required', data: null });
    }
    const category = await Category.create({ name });
    await writeLog(req.user, 'create_category', `#${category.id} ${category.name}`);
    res.json({ code: 0, message: 'created', data: category });
  } catch (error) {
    handleSequelizeError(error, res);
  }
}

async function updateCategory(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ code: 404, message: 'Category not found', data: null });
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ code: 400, message: 'Category name is required', data: null });
    }
    await category.update({ name });
    await writeLog(req.user, 'update_category', `#${category.id} ${category.name}`);
    res.json({ code: 0, message: 'updated', data: category });
  } catch (error) {
    handleSequelizeError(error, res);
  }
}

async function deleteCategory(req, res) {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 404, message: 'Category not found', data: null });
  }
  const booksCount = await Book.count({ where: { category_id: category.id } });
  if (booksCount > 0) {
    return res.status(400).json({ code: 400, message: 'Category still has books', data: null });
  }
  await category.destroy();
  await writeLog(req.user, 'delete_category', `#${category.id} ${category.name}`);
  res.json({ code: 0, message: 'deleted', data: null });
}

function handleSequelizeError(error, res) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ code: 400, message: 'Category name already exists', data: null });
  }
  return res.status(500).json({ code: 500, message: error.message, data: null });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
