function toAbsoluteUrl(req, path) {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Reverse proxy 환경에서 X-Forwarded-Proto 헤더 확인
  // 또는 환경 변수로 강제 설정
  let protocol = req.protocol || 'http';
  const forwardedProto = req.get('x-forwarded-proto');
  if (forwardedProto) {
    protocol = forwardedProto.split(',')[0].trim(); // 첫 번째 프로토콜 사용
  } else if (process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production') {
    // 프로덕션 환경에서는 기본적으로 HTTPS 사용
    protocol = 'https';
  }
  const host = req.get('host') || req.get('x-forwarded-host') || 'localhost:8080';
  return `${protocol}://${host}${path.startsWith('/') ? path : '/' + path}`;
}

// materials를 정규화 (문자열 또는 객체 모두 처리)
function normalizeMaterial(material) {
  if (typeof material === 'string') {
    // 기존 형식: 문자열만 있는 경우
    return { url: material, originalName: material.split('/').pop() || '' };
  }
  if (material && typeof material === 'object') {
    // 새로운 형식: 객체
    return {
      url: material.url || material,
      originalName: material.originalName || material.url?.split('/').pop() || ''
    };
  }
  return { url: '', originalName: '' };
}

function convertMaterialsToAbsolute(req, materials) {
  if (!Array.isArray(materials)) {
    return materials;
  }
  return materials.map(material => {
    const normalized = normalizeMaterial(material);
    return {
      url: toAbsoluteUrl(req, normalized.url),
      originalName: normalized.originalName
    };
  });
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

