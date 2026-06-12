const db = require('../config/db');

const getAll = async () => {
  const [rows] = await db.query(`
    SELECT p.*, e.ticker, e.nombre
    FROM precios_acciones p
    JOIN empresas e ON p.id_empresa = e.id_empresa
    ORDER BY p.fecha DESC, e.ticker
  `);
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(`
    SELECT p.*, e.ticker, e.nombre
    FROM precios_acciones p
    JOIN empresas e ON p.id_empresa = e.id_empresa
    WHERE p.id_precio = ?
  `, [id]);
  return rows[0];
};

const create = async (data) => {
  const { id_empresa, fecha, precio_apertura, precio_cierre, precio_maximo, precio_minimo, volumen } = data;
  const [result] = await db.query(`
    INSERT INTO precios_acciones
    (id_empresa, fecha, precio_apertura, precio_cierre, precio_maximo, precio_minimo, volumen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id_empresa, fecha, precio_apertura, precio_cierre, precio_maximo, precio_minimo, volumen || 0]);
  return getById(result.insertId);
};

const update = async (id, data) => {
  const { id_empresa, fecha, precio_apertura, precio_cierre, precio_maximo, precio_minimo, volumen } = data;
  await db.query(`
    UPDATE precios_acciones
    SET id_empresa = ?, fecha = ?, precio_apertura = ?, precio_cierre = ?,
        precio_maximo = ?, precio_minimo = ?, volumen = ?
    WHERE id_precio = ?
  `, [id_empresa, fecha, precio_apertura, precio_cierre, precio_maximo, precio_minimo, volumen || 0, id]);
  return getById(id);
};

const remove = async (id) => {
  const [result] = await db.query('DELETE FROM precios_acciones WHERE id_precio = ?', [id]);
  return result.affectedRows;
};

module.exports = { getAll, getById, create, update, remove };
