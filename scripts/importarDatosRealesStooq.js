require('dotenv').config();
const mysql = require('mysql2/promise');

const FECHA_INICIO = process.env.FECHA_INICIO || '2021-01-01';
const FECHA_FIN = process.env.FECHA_FIN || '2025-06-08';

const empresas = [
    { ticker: 'AAPL' },
    { ticker: 'MSFT' },
    { ticker: 'NVDA' },
    { ticker: 'TSLA' },
    { ticker: 'AMZN' },
    { ticker: 'GOOGL' },
    { ticker: 'JPM' },
    { ticker: 'WMT' },
    { ticker: 'KO' },
    { ticker: 'NFLX' },
    { ticker: 'META' },
    { ticker: 'DIS' }
];

function fechaAUnix(fechaTexto) {
    return Math.floor(new Date(fechaTexto + 'T00:00:00Z').getTime() / 1000);
}

async function crearConexion() {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bolsa_valores',
        port: process.env.DB_PORT || 3306
    });
}

async function descargarDatosYahoo(ticker) {
    const period1 = fechaAUnix(FECHA_INICIO);
    const period2 = fechaAUnix(FECHA_FIN);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

    console.log(`URL usada: ${url}`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
        }
    });

    const json = await response.json();

    if (!response.ok) {
        console.log(`Error HTTP ${response.status} descargando ${ticker}`);
        return [];
    }

    if (!json.chart || json.chart.error) {
        console.log(`Yahoo respondió con error para ${ticker}:`, json.chart?.error);
        return [];
    }

    const result = json.chart.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
        console.log(`No hay datos válidos para ${ticker}`);
        return [];
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const datos = [];

    for (let i = 0; i < timestamps.length; i++) {
        const fecha = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);

        const apertura = quote.open[i];
        const maximo = quote.high[i];
        const minimo = quote.low[i];
        const cierre = quote.close[i];
        const volumen = quote.volume[i];

        if (
            apertura === null ||
            maximo === null ||
            minimo === null ||
            cierre === null
        ) {
            continue;
        }

        datos.push({
            fecha,
            apertura,
            cierre,
            maximo,
            minimo,
            volumen: volumen || 0
        });
    }

    console.log(`Datos recibidos para ${ticker}: ${datos.length}`);

    return datos;
}

async function obtenerIdEmpresa(conexion, ticker) {
    const [rows] = await conexion.execute(
        'SELECT id_empresa FROM empresas WHERE ticker = ? LIMIT 1',
        [ticker]
    );

    if (rows.length === 0) {
        return null;
    }

    return rows[0].id_empresa;
}

async function insertarPrecios(conexion, idEmpresa, datos) {
    const sql = `
        INSERT INTO precios_acciones
        (
            id_empresa,
            fecha,
            precio_apertura,
            precio_cierre,
            precio_maximo,
            precio_minimo,
            volumen
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            precio_apertura = VALUES(precio_apertura),
            precio_cierre = VALUES(precio_cierre),
            precio_maximo = VALUES(precio_maximo),
            precio_minimo = VALUES(precio_minimo),
            volumen = VALUES(volumen)
    `;

    let insertados = 0;

    for (const dato of datos) {
        await conexion.execute(sql, [
            idEmpresa,
            dato.fecha,
            dato.apertura,
            dato.cierre,
            dato.maximo,
            dato.minimo,
            dato.volumen
        ]);

        insertados++;
    }

    return insertados;
}

async function main() {
    let conexion;

    try {
        console.log(`Importando datos reales desde Yahoo Finance: ${FECHA_INICIO} a ${FECHA_FIN}`);

        conexion = await crearConexion();

        console.log('Conexión a MySQL correcta.');

        console.log('Limpiando precios anteriores...');
        await conexion.execute('DELETE FROM precios_acciones');

        let totalInsertados = 0;

        for (const empresa of empresas) {
            console.log('----------------------------------------');
            console.log(`Descargando ${empresa.ticker}...`);

            const idEmpresa = await obtenerIdEmpresa(conexion, empresa.ticker);

            if (!idEmpresa) {
                console.log(`No existe la empresa ${empresa.ticker} en la tabla empresas.`);
                continue;
            }

            const datos = await descargarDatosYahoo(empresa.ticker);

            if (datos.length === 0) {
                console.log(`No se encontraron datos para ${empresa.ticker}.`);
                continue;
            }

            const insertados = await insertarPrecios(conexion, idEmpresa, datos);

            totalInsertados += insertados;

            console.log(`Insertados ${insertados} registros para ${empresa.ticker}.`);
        }

        console.log('----------------------------------------');
        console.log(`Listo. Total de registros insertados: ${totalInsertados}`);

        const [conteo] = await conexion.execute(
            'SELECT COUNT(*) AS total FROM precios_acciones'
        );

        console.log(`Registros actuales en precios_acciones: ${conteo[0].total}`);

    } catch (error) {
        console.error('Error al importar datos reales:', error.message);
        console.error(error);
    } finally {
        if (conexion) {
            await conexion.end();
        }
    }
}

main();