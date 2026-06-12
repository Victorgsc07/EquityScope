const express = require('express');
const cors = require('cors');
require('dotenv').config();

const empresasRoutes = require('./routes/empresasRoutes');
const preciosRoutes = require('./routes/preciosRoutes');
const sectoresRoutes = require('./routes/sectoresRoutes');
const mercadosRoutes = require('./routes/mercadosRoutes');
const analiticasRoutes = require('./routes/analiticasRoutes');
const prediccionesRoutes = require('./routes/prediccionesRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'API de Bolsa de Valores funcionando correctamente',
        endpoints: {
            empresas: '/api/empresas',
            precios: '/api/precios',
            sectores: '/api/sectores',
            mercados: '/api/mercados',
            analiticas: '/api/analiticas',
            predicciones: '/api/predicciones'
        }
    });
});

app.use('/api/empresas', empresasRoutes);
app.use('/api/precios', preciosRoutes);
app.use('/api/sectores', sectoresRoutes);
app.use('/api/mercados', mercadosRoutes);
app.use('/api/analiticas', analiticasRoutes);
app.use('/api/predicciones', prediccionesRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
