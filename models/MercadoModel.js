const db = require('../config/db');

const getAll = async () => {
  const [rows] = await db.query('SELECT * FROM mercados ORDER BY nombre_mercado');
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query('SELECT * FROM mercados WHERE id_mercado = ?', [id]);
  return rows[0];
};

module.exports = { getAll, getById };
