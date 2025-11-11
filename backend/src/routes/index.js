const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const bookController = require('../controllers/bookController');
const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');
const borrowController = require('../controllers/borrowController');
const logController = require('../controllers/logController');

router.get('/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { service: 'backend', time: new Date() } });
});

router.post('/auth/login', authController.login);

router.get('/books', bookController.listBooks);
router.post('/books', auth(['admin', 'superadmin']), bookController.createBook);
router.put('/books/:id', auth(['admin', 'superadmin']), bookController.updateBook);
router.delete('/books/:id', auth(['admin', 'superadmin']), bookController.deleteBook);

router.get('/categories', categoryController.listCategories);
router.post('/categories', auth(['admin', 'superadmin']), categoryController.createCategory);
router.put('/categories/:id', auth(['admin', 'superadmin']), categoryController.updateCategory);
router.delete('/categories/:id', auth(['admin', 'superadmin']), categoryController.deleteCategory);

router.get('/borrow-records', auth(['admin', 'superadmin']), borrowController.listBorrowRecords);
router.post('/books/:bookId/borrow', auth(['admin', 'superadmin']), borrowController.borrowBook);
router.post('/borrow-records/:id/return', auth(['admin', 'superadmin']), borrowController.returnBook);
router.get('/logs', auth(['admin', 'superadmin']), logController.listLogs);

module.exports = router;
