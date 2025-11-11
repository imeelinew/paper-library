const { Op } = require('sequelize');
const { Book, Category } = require('../models');
const { writeLog } = require('../utils/logger');

function normalizeBookPayload(body = {}) {
  const payload = {
    title: body.title?.trim(),
    author: body.author?.trim(),
    isbn: body.isbn?.trim() || null,
    stock: Number.isNaN(Number(body.stock)) ? 1 : Number(body.stock),
    cover_url: body.cover_url || null,
    pdf_url: body.pdf_url || null,
    category_id: body.category_id ?? body.categoryId ?? null
  };

  if (payload.category_id !== null) {
    const parsed = Number(payload.category_id);
    payload.category_id = Number.isNaN(parsed) ? null : parsed;
  }
  payload.stock = Math.max(0, Number.isNaN(payload.stock) ? 0 : payload.stock);

  return payload;
}

function handleSequelizeError(error, res) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors?.[0]?.path || 'field';
    return res.status(400).json({ code: 400, message: `${field} already exists`, data: null });
  }
  return res.status(500).json({ code: 500, message: error.message, data: null });
}

async function listBooks(req, res) {
  try {
    const keyword = (req.query.keyword || '').trim();
    const categoryId = parseInt(req.query.categoryId, 10);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 100);

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { author: { [Op.like]: `%${keyword}%` } },
        { isbn: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (!Number.isNaN(categoryId)) {
      where.category_id = categoryId;
    }

    const { rows, count } = await Book.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']],
      offset: (page - 1) * pageSize,
      limit: pageSize
    });

    res.json({
      code: 0,
      message: 'ok',
      data: {
        list: rows,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize)
        }
      }
    });
  } catch (error) {
    handleSequelizeError(error, res);
  }
}

async function createBook(req, res) {
  try {
    const payload = normalizeBookPayload(req.body);
    if (!payload.title || !payload.author) {
      return res.status(400).json({ code: 400, message: 'title and author are required', data: null });
    }
    if (payload.category_id) {
      const exists = await Category.count({ where: { id: payload.category_id } });
      if (!exists) {
        return res.status(400).json({ code: 400, message: 'Category not found', data: null });
      }
    }
    const book = await Book.create(payload);
    await writeLog(req.user, 'create_book', `#${book.id} ${book.title}`);
    res.json({ code: 0, message: 'created', data: book });
  } catch (error) {
    handleSequelizeError(error, res);
  }
}

async function updateBook(req, res) {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).json({ code: 404, message: 'Book not found', data: null });
    }

    const payload = normalizeBookPayload(req.body);
    if (payload.category_id) {
      const exists = await Category.count({ where: { id: payload.category_id } });
      if (!exists) {
        return res.status(400).json({ code: 400, message: 'Category not found', data: null });
      }
    }
    await book.update(payload);
    await writeLog(req.user, 'update_book', `#${book.id} ${book.title}`);
    res.json({ code: 0, message: 'updated', data: book });
  } catch (error) {
    handleSequelizeError(error, res);
  }
}

async function deleteBook(req, res) {
  const book = await Book.findByPk(req.params.id);
  if (!book) {
    return res.status(404).json({ code: 404, message: 'Book not found', data: null });
  }
  await book.destroy();
  await writeLog(req.user, 'delete_book', `#${book.id} ${book.title}`);
  res.json({ code: 0, message: 'deleted', data: null });
}

module.exports = { listBooks, createBook, updateBook, deleteBook };
