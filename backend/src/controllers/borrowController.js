const { Op } = require('sequelize');
const { sequelize, Book, BorrowRecord, User } = require('../models');
const { writeLog } = require('../utils/logger');

async function borrowBook(req, res) {
  const bookId = req.params.bookId;
  const { borrower_name, borrower_contact, days } = req.body || {};

  const duration = normalizePositiveInteger(days, 14);
  try {
    const record = await sequelize.transaction(async (transaction) => {
      const book = await Book.findByPk(bookId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!book) {
        throw new HttpError(404, 'Book not found');
      }
      if (book.stock <= 0) {
        throw new HttpError(400, 'No stock left for this book');
      }

      const borrowDate = formatDate(new Date());
      const dueDate = formatDate(addDays(new Date(), duration));

      await book.decrement('stock', { by: 1, transaction });

      return BorrowRecord.create(
        {
          book_id: book.id,
          user_id: req.user.id,
          borrow_date: borrowDate,
          due_date: dueDate,
          status: 'borrowed',
          borrower_name: borrower_name?.trim() || null,
          borrower_contact: borrower_contact?.trim() || null
        },
        { transaction }
      );
    });

    const payload = await enrichRecord(record);
    await writeLog(req.user, 'borrow_book', `#${payload.book_id} ${payload.book?.title || ''}`);
    res.json({ code: 0, message: 'borrowed', data: payload });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function returnBook(req, res) {
  const recordId = req.params.id;

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const record = await BorrowRecord.findByPk(recordId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!record) {
        throw new HttpError(404, 'Borrow record not found');
      }
      if (record.status === 'returned') {
        throw new HttpError(400, 'Book already returned');
      }

      const book = await Book.findByPk(record.book_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!book) {
        throw new HttpError(404, 'Book not found');
      }

      const returnDate = formatDate(new Date());
      await record.update(
        {
          status: 'returned',
          return_date: returnDate
        },
        { transaction }
      );

      await book.increment('stock', { by: 1, transaction });

      return record;
    });

    const payload = await enrichRecord(result);
    await writeLog(req.user, 'return_book', `#${payload.book_id} ${payload.book?.title || ''}`);
    res.json({ code: 0, message: 'returned', data: payload });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function listBorrowRecords(req, res) {
  await markOverdueRecords();

  const status = (req.query.status || '').trim();
  const page = normalizePositiveInteger(req.query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(req.query.pageSize, 10), 100);
  const where = {};
  if (status) {
    where.status = status;
  }

  const { rows, count } = await BorrowRecord.findAndCountAll({
    where,
    include: [
      { model: Book, as: 'book', attributes: ['id', 'title', 'author', 'isbn'] },
      { model: User, as: 'user', attributes: ['id', 'username'] }
    ],
    order: [['borrow_date', 'DESC']],
    offset: (page - 1) * pageSize,
    limit: pageSize
  });

  res.json({
    code: 0,
    message: 'ok',
    data: {
      list: rows,
      pagination: buildPagination(count, page, pageSize)
    }
  });
}

async function markOverdueRecords() {
  const today = formatDate(new Date());
  await BorrowRecord.update(
    { status: 'overdue' },
    {
      where: {
        status: 'borrowed',
        due_date: { [Op.lt]: today }
      }
    }
  );
}

function normalizePositiveInteger(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function addDays(date, amount) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + amount);
  return clone;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildPagination(total, page, pageSize) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize)
  };
}

async function enrichRecord(record) {
  return BorrowRecord.findByPk(record.id, {
    include: [
      { model: Book, as: 'book', attributes: ['id', 'title', 'author', 'isbn'] },
      { model: User, as: 'user', attributes: ['id', 'username'] }
    ]
  });
}

function handleControllerError(error, res) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ code: error.status, message: error.message, data: null });
  }
  return res.status(500).json({ code: 500, message: error.message, data: null });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { borrowBook, returnBook, listBorrowRecords };
