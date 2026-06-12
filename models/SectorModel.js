const db = require('../config/db');

const getAll = async () => {
  const [rows] = await db.query('SELECT * FROM sectores ORDER BY nombre_sector');
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query('SELECT * FROM sectores WHERE id_sector = ?', [id]);
  return rows[0];
};

module.exports = { getAll, getById };
