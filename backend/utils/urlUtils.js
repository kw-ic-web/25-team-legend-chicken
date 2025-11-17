function toAbsoluteUrl(req, path) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:8080';
  return `${protocol}://${host}${path.startsWith('/') ? path : '/' + path}`;
}

function convertMaterialsToAbsolute(req, materials) {
  if (!Array.isArray(materials)) {
    return materials;
  }
  return materials.map(path => toAbsoluteUrl(req, path));
}

function convertClassMaterialsToAbsolute(req, classData) {
  if (!classData) return classData;
  const converted = { ...classData };
  if (Array.isArray(converted.materials)) {
    converted.materials = convertMaterialsToAbsolute(req, converted.materials);
  }
  return converted;
}

function convertClassesMaterialsToAbsolute(req, classes) {
  if (!Array.isArray(classes)) {
    return classes;
  }
  return classes.map(cls => convertClassMaterialsToAbsolute(req, cls));
}

module.exports = {
  toAbsoluteUrl,
  convertMaterialsToAbsolute,
  convertClassMaterialsToAbsolute,
  convertClassesMaterialsToAbsolute,
};

