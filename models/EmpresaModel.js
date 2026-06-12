const db = require('../config/db');

const getAll = async () => {
  const [rows] = await db.query(`
    SELECT e.id_empresa, e.ticker, e.nombre, e.pais, e.fecha_fundacion,
           s.id_sector, s.nombre_sector,
           m.id_mercado, m.nombre_mercado, m.pais AS pais_mercado
    FROM empresas e
    JOIN sectores s ON e.id_sector = s.id_sector
    JOIN mercados m ON e.id_mercado = m.id_mercado
    ORDER BY e.nombre
  `);
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(`
    SELECT e.*, s.nombre_sector, m.nombre_mercado
    FROM empresas e
    JOIN sectores s ON e.id_sector = s.id_sector
    JOIN mercados m ON e.id_mercado = m.id_mercado
    WHERE e.id_empresa = ?
  `, [id]);
  return rows[0];
};

const create = async (data) => {
  const { ticker, nombre, id_sector, id_mercado, pais, fecha_fundacion } = data;
  const [result] = await db.query(`
    INSERT INTO empresas (ticker, nombre, id_sector, id_mercado, pais, fecha_fundacion)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [ticker, nombre, id_sector, id_mercado, pais, fecha_fundacion || null]);
  return getById(result.insertId);
};

const update = async (id, data) => {
  const { ticker, nombre, id_sector, id_mercado, pais, fecha_fundacion } = data;
  await db.query(`
    UPDATE empresas
    SET ticker = ?, nombre = ?, id_sector = ?, id_mercado = ?, pais = ?, fecha_fundacion = ?
    WHERE id_empresa = ?
  `, [ticker, nombre, id_sector, id_mercado, pais, fecha_fundacion || null, id]);
  return getById(id);
};

const remove = async (id) => {
  const [result] = await db.query('DELETE FROM empresas WHERE id_empresa = ?', [id]);
  return result.affectedRows;
};

module.exports = { getAll, getById, create, update, remove };
