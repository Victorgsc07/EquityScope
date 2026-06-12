const EmpresaModel = require('../models/EmpresaModel');

const getEmpresas = async (req, res) => {
  try { res.json(await EmpresaModel.getAll()); }
  catch (error) { res.status(500).json({ message: 'Error al obtener empresas', error: error.message }); }
};

const getEmpresaById = async (req, res) => {
  try {
    const empresa = await EmpresaModel.getById(req.params.id);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (error) { res.status(500).json({ message: 'Error al obtener empresa', error: error.message }); }
};

const createEmpresa = async (req, res) => {
  try { res.status(201).json(await EmpresaModel.create(req.body)); }
  catch (error) { res.status(500).json({ message: 'Error al crear empresa', error: error.message }); }
};

const updateEmpresa = async (req, res) => {
  try {
    const empresa = await EmpresaModel.update(req.params.id, req.body);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (error) { res.status(500).json({ message: 'Error al actualizar empresa', error: error.message }); }
};

const deleteEmpresa = async (req, res) => {
  try {
    const affectedRows = await EmpresaModel.remove(req.params.id);
    if (affectedRows === 0) return res.status(404).json({ message: 'Empresa no encontrada' });
    res.json({ message: 'Empresa eliminada correctamente' });
  } catch (error) { res.status(500).json({ message: 'Error al eliminar empresa', error: error.message }); }
};

module.exports = { getEmpresas, getEmpresaById, createEmpresa, updateEmpresa, deleteEmpresa };
