const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('users', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('user', 'admin', 'superadmin'), defaultValue: 'user' }
});

const Book = sequelize.define('books', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  author: { type: DataTypes.STRING(200), allowNull: false },
  isbn: { type: DataTypes.STRING(50), allowNull: true, unique: true },
  stock: { type: DataTypes.INTEGER, defaultValue: 1 },
  cover_url: { type: DataTypes.STRING, allowNull: true },
  pdf_url: { type: DataTypes.STRING, allowNull: true }
});

const BorrowRecord = sequelize.define('borrow_records', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  borrow_date: { type: DataTypes.DATEONLY, allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  return_date: { type: DataTypes.DATEONLY, allowNull: true },
  borrower_name: { type: DataTypes.STRING(100), allowNull: true },
  borrower_contact: { type: DataTypes.STRING(100), allowNull: true },
  status: { type: DataTypes.ENUM('borrowed', 'returned', 'overdue'), defaultValue: 'borrowed' }
});

const Category = sequelize.define('categories', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), unique: true, allowNull: false }
});

const Log = sequelize.define('logs', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  action: { type: DataTypes.STRING(100), allowNull: false },
  target: { type: DataTypes.STRING(100), allowNull: false }
});

// Associations
Category.hasMany(Book, { foreignKey: 'category_id', as: 'books' });
Book.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

User.hasMany(BorrowRecord, { foreignKey: 'user_id', as: 'borrow_records' });
BorrowRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Book.hasMany(BorrowRecord, { foreignKey: 'book_id', as: 'borrow_records' });
BorrowRecord.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

User.hasMany(Log, { foreignKey: 'user_id', as: 'logs' });
Log.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { sequelize, User, Book, BorrowRecord, Category, Log };
