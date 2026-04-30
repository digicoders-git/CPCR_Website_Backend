const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Auth Header received:', authHeader ? 'Present' : 'Missing');
  
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token || token === 'null' || token === 'undefined') {
    console.log('No valid token found in header');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'cpcr_secret_key_2024';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    res.status(401).json({ message: 'Token is not valid or expired' });
  }
};

module.exports = auth;
