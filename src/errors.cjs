class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function parseId(value) {
  const n = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(n))
    throw new HttpError(400,'INVALID_ID','ID buku tidak valid.');
  return n;
}
function validateBook(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(k => !['judul','tersedia'].includes(k)) ||
      typeof body.judul !== 'string' || !body.judul.trim() ||
      body.judul.trim().length > 120 || typeof body.tersedia !== 'boolean')
    throw new HttpError(400,'INVALID_BOOK','Isi judul dan tersedia tidak valid.');
  return {judul:body.judul.trim(),tersedia:body.tersedia};
}
module.exports={HttpError,parseId,validateBook};
