const db = require('../config/db');

const getHistorialPorTicker = async (ticker, limite = 120) => {
    const query = `
        SELECT 
            e.ticker,
            e.nombre,
            p.fecha,
            p.precio_cierre
        FROM precios_acciones p
        INNER JOIN empresas e ON p.id_empresa = e.id_empresa
        WHERE e.ticker = ?
        ORDER BY p.fecha DESC
        LIMIT ?
    `;

    const [rows] = await db.query(query, [ticker, Number(limite)]);

    return rows.reverse();
};

const getTickersDisponibles = async () => {
    const query = `
        SELECT 
            ticker,
            nombre
        FROM empresas
        ORDER BY ticker ASC
    `;

    const [rows] = await db.query(query);

    return rows;
};

module.exports = {
    getHistorialPorTicker,
    getTickersDisponibles
};