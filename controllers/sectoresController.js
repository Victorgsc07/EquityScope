const SectorModel = require('../models/SectorModel');

const getSectores = async (req, res) => {
  try { res.json(await SectorModel.getAll()); }
  catch (error) { res.status(500).json({ message: 'Error al obtener sectores', error: error.message }); }
};

const getSectorById = async (req, res) => {
  try {
    const sector = await SectorModel.getById(req.params.id);
    if (!sector) return res.status(404).json({ message: 'Sector no encontrado' });
    res.json(sector);
  } catch (error) { res.status(500).json({ message: 'Error al obtener sector', error: error.message }); }
};

module.exports = { getSectores, getSectorById };
