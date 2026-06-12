const prediccionesModel = require('../models/prediccionesModel');

const calcularPromedio = (valores) => {
    if (!valores.length) return 0;

    const suma = valores.reduce((acc, valor) => acc + valor, 0);

    return suma / valores.length;
};

const redondear = (numero, decimales = 2) => {
    return Number(Number(numero).toFixed(decimales));
};

const clasificarTendencia = (cambioPorcentual) => {
    if (cambioPorcentual > 1) return 'ALCISTA';
    if (cambioPorcentual < -1) return 'BAJISTA';
    return 'ESTABLE';
};

const getTickersPredicciones = async (req, res) => {
    try {
        const tickers = await prediccionesModel.getTickersDisponibles();

        res.json(tickers);
    } catch (error) {
        console.error('Error en getTickersPredicciones:', error);

        res.status(500).json({
            message: 'Error al obtener los tickers disponibles',
            error: error.message
        });
    }
};

const getPromedioMovil = async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();

        const diasCorto = Number(req.query.corto) || 7;
        const diasLargo = Number(req.query.largo) || 30;

        const limite = Math.max(diasCorto, diasLargo, 60);

        const historial = await prediccionesModel.getHistorialPorTicker(ticker, limite);

        if (!historial.length) {
            return res.status(404).json({
                message: `No se encontraron datos para el ticker ${ticker}`
            });
        }

        if (historial.length < diasLargo) {
            return res.status(400).json({
                message: `No hay suficientes registros para calcular promedio móvil de ${diasLargo} días`
            });
        }

        const precios = historial.map(item => Number(item.precio_cierre));

        const ultimoRegistro = historial[historial.length - 1];
        const ultimoPrecio = precios[precios.length - 1];

        const preciosCorto = precios.slice(-diasCorto);
        const preciosLargo = precios.slice(-diasLargo);

        const promedioCorto = calcularPromedio(preciosCorto);
        const promedioLargo = calcularPromedio(preciosLargo);

        const diferencia = promedioCorto - promedioLargo;
        const diferenciaPorcentual = (diferencia / promedioLargo) * 100;

        const tendencia = clasificarTendencia(diferenciaPorcentual);

        res.json({
            metodo: 'Promedio móvil',
            ticker,
            nombre: ultimoRegistro.nombre,
            fecha_ultimo_registro: ultimoRegistro.fecha,
            ultimo_precio_cierre: redondear(ultimoPrecio),
            promedio_movil_corto_dias: diasCorto,
            promedio_movil_corto: redondear(promedioCorto),
            promedio_movil_largo_dias: diasLargo,
            promedio_movil_largo: redondear(promedioLargo),
            diferencia_promedios: redondear(diferencia),
            diferencia_porcentual: redondear(diferenciaPorcentual),
            tendencia,
            interpretacion: `Según el promedio móvil de ${diasCorto} días comparado contra el de ${diasLargo} días, la tendencia estimada es ${tendencia}.`,
            nota: 'Predicción académica basada en datos históricos. No representa recomendación financiera.'
        });

    } catch (error) {
        console.error('Error en getPromedioMovil:', error);

        res.status(500).json({
            message: 'Error al calcular promedio móvil',
            error: error.message
        });
    }
};

const getRegresionLineal = async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();

        const diasHistorial = Number(req.query.historial) || 90;
        const diasPrediccion = Number(req.query.dias) || 7;

        const historial = await prediccionesModel.getHistorialPorTicker(ticker, diasHistorial);

        if (!historial.length) {
            return res.status(404).json({
                message: `No se encontraron datos para el ticker ${ticker}`
            });
        }

        if (historial.length < 10) {
            return res.status(400).json({
                message: 'No hay suficientes registros para calcular regresión lineal'
            });
        }

        const n = historial.length;

        const puntos = historial.map((item, index) => ({
            x: index + 1,
            y: Number(item.precio_cierre),
            fecha: item.fecha
        }));

        const sumaX = puntos.reduce((acc, punto) => acc + punto.x, 0);
        const sumaY = puntos.reduce((acc, punto) => acc + punto.y, 0);
        const sumaXY = puntos.reduce((acc, punto) => acc + (punto.x * punto.y), 0);
        const sumaX2 = puntos.reduce((acc, punto) => acc + (punto.x * punto.x), 0);

        const pendiente = ((n * sumaXY) - (sumaX * sumaY)) / ((n * sumaX2) - (sumaX * sumaX));
        const intercepto = (sumaY - (pendiente * sumaX)) / n;

        const ultimoRegistro = historial[historial.length - 1];
        const ultimoPrecio = Number(ultimoRegistro.precio_cierre);

        const xPrediccion = n + diasPrediccion;
        const precioEstimado = intercepto + (pendiente * xPrediccion);

        const cambioEstimado = precioEstimado - ultimoPrecio;
        const cambioPorcentual = (cambioEstimado / ultimoPrecio) * 100;

        const tendencia = clasificarTendencia(cambioPorcentual);

        const prediccionesPorDia = [];

        for (let i = 1; i <= diasPrediccion; i++) {
            const xFuturo = n + i;
            const precioFuturo = intercepto + (pendiente * xFuturo);

            prediccionesPorDia.push({
                dia: i,
                precio_estimado: redondear(precioFuturo)
            });
        }

        res.json({
            metodo: 'Regresión lineal simple',
            ticker,
            nombre: ultimoRegistro.nombre,
            registros_usados: n,
            dias_historial_usados: diasHistorial,
            dias_a_predecir: diasPrediccion,
            fecha_ultimo_registro: ultimoRegistro.fecha,
            ultimo_precio_cierre: redondear(ultimoPrecio),
            pendiente: redondear(pendiente, 6),
            intercepto: redondear(intercepto, 6),
            precio_estimado: redondear(precioEstimado),
            cambio_estimado: redondear(cambioEstimado),
            cambio_porcentual_estimado: redondear(cambioPorcentual),
            tendencia,
            predicciones_por_dia: prediccionesPorDia,
            interpretacion: `Con base en una regresión lineal simple usando los últimos ${n} registros, el precio estimado a ${diasPrediccion} días muestra una tendencia ${tendencia}.`,
            nota: 'Predicción académica basada en datos históricos. No representa recomendación financiera.'
        });

    } catch (error) {
        console.error('Error en getRegresionLineal:', error);

        res.status(500).json({
            message: 'Error al calcular regresión lineal',
            error: error.message
        });
    }
};

const getPrediccionCompleta = async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();

        const diasCorto = Number(req.query.corto) || 7;
        const diasLargo = Number(req.query.largo) || 30;
        const diasHistorial = Number(req.query.historial) || 90;
        const diasPrediccion = Number(req.query.dias) || 7;

        const limite = Math.max(diasLargo, diasHistorial, 90);

        const historial = await prediccionesModel.getHistorialPorTicker(ticker, limite);

        if (!historial.length) {
            return res.status(404).json({
                message: `No se encontraron datos para el ticker ${ticker}`
            });
        }

        if (historial.length < diasLargo || historial.length < 10) {
            return res.status(400).json({
                message: 'No hay suficientes registros para generar la predicción completa'
            });
        }

        const precios = historial.map(item => Number(item.precio_cierre));

        const ultimoRegistro = historial[historial.length - 1];
        const ultimoPrecio = precios[precios.length - 1];

        const promedioCorto = calcularPromedio(precios.slice(-diasCorto));
        const promedioLargo = calcularPromedio(precios.slice(-diasLargo));

        const diferenciaPromedios = promedioCorto - promedioLargo;
        const diferenciaPromediosPorcentual = (diferenciaPromedios / promedioLargo) * 100;

        const datosRegresion = historial.slice(-diasHistorial);
        const n = datosRegresion.length;

        const puntos = datosRegresion.map((item, index) => ({
            x: index + 1,
            y: Number(item.precio_cierre)
        }));

        const sumaX = puntos.reduce((acc, punto) => acc + punto.x, 0);
        const sumaY = puntos.reduce((acc, punto) => acc + punto.y, 0);
        const sumaXY = puntos.reduce((acc, punto) => acc + (punto.x * punto.y), 0);
        const sumaX2 = puntos.reduce((acc, punto) => acc + (punto.x * punto.x), 0);

        const pendiente = ((n * sumaXY) - (sumaX * sumaY)) / ((n * sumaX2) - (sumaX * sumaX));
        const intercepto = (sumaY - (pendiente * sumaX)) / n;

        const xPrediccion = n + diasPrediccion;
        const precioEstimado = intercepto + (pendiente * xPrediccion);

        const cambioEstimado = precioEstimado - ultimoPrecio;
        const cambioPorcentual = (cambioEstimado / ultimoPrecio) * 100;

        const tendenciaPromedioMovil = clasificarTendencia(diferenciaPromediosPorcentual);
        const tendenciaRegresion = clasificarTendencia(cambioPorcentual);

        let conclusion = 'MIXTA';

        if (tendenciaPromedioMovil === tendenciaRegresion) {
            conclusion = tendenciaRegresion;
        }

        res.json({
            ticker,
            nombre: ultimoRegistro.nombre,
            fecha_ultimo_registro: ultimoRegistro.fecha,
            ultimo_precio_cierre: redondear(ultimoPrecio),

            promedio_movil: {
                dias_corto: diasCorto,
                promedio_corto: redondear(promedioCorto),
                dias_largo: diasLargo,
                promedio_largo: redondear(promedioLargo),
                diferencia: redondear(diferenciaPromedios),
                diferencia_porcentual: redondear(diferenciaPromediosPorcentual),
                tendencia: tendenciaPromedioMovil
            },

            regresion_lineal: {
                dias_historial_usados: diasHistorial,
                dias_a_predecir: diasPrediccion,
                pendiente: redondear(pendiente, 6),
                intercepto: redondear(intercepto, 6),
                precio_estimado: redondear(precioEstimado),
                cambio_estimado: redondear(cambioEstimado),
                cambio_porcentual_estimado: redondear(cambioPorcentual),
                tendencia: tendenciaRegresion
            },

            conclusion_general: conclusion,
            interpretacion: conclusion === 'MIXTA'
                ? 'Los métodos muestran señales diferentes, por lo que la predicción general es mixta.'
                : `Ambos métodos sugieren una tendencia general ${conclusion}.`,
            nota: 'Predicción académica basada en datos históricos. No representa recomendación financiera.'
        });

    } catch (error) {
        console.error('Error en getPrediccionCompleta:', error);

        res.status(500).json({
            message: 'Error al generar predicción completa',
            error: error.message
        });
    }
};

module.exports = {
    getTickersPredicciones,
    getPromedioMovil,
    getRegresionLineal,
    getPrediccionCompleta
};