const { Pool, Client } = require('pg')

const pool = new Pool({
  user: 'groundnet',
  host: '192.168.178.58',
  database: 'groundnet',
  password: 'groundnet',
  port: 5432, 
})


module.exports = {	
  query: (text, params) => pool.query(text, params)
}