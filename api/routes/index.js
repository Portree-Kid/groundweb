const groundnets = require('./groundnetRoutes')

module.exports = (app) => {
  app.use('/groundnets', groundnets)
  console.log('Mounted routes to /groundnets');
}