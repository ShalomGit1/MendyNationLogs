const app = require('../server');
const serverless = require('serverless-http');

module.exports = app; // for local dev if needed
module.exports.handler = serverless(app);
