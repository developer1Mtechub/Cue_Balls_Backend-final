const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool ({
  host: 'postgres-staging-projects.mtechub.com', 
  port :5432,
  user : 'cueclub_user' ,
  password : 'mtechub123',
  database : 'cueclub_db',
  max : 10
});


 async function getBallImages() {
  try {
    const result = await pool.query('SELECT * FROM balls_images'); // replace with your actual SQL query
    const rows = result.rows;

    const ballImageUrls = {};
    for (let row of rows) {
      ballImageUrls[row.name] = row.image_url; // replace 'number' and 'url' with your actual column names
    }
    // console.log(ballImageUrls)
    return ballImageUrls;
  } catch (error) {
    console.error(error);
  }
}
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
  
  
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('Connected to database successfully');
      
      release();
    }
  });

  const initSql = fs.readFileSync("app/models/init.sql").toString();

  pool.query(initSql , (err , result)=>{
    if(!err){
      console.log("All Database tables Initialilzed successfully : ")
      // console.log(result)
    }
    else{
      console.log("Error Occurred While Initializing Database tables");
      console.log(err)
    }
  })
  
  module.exports = { pool, getBallImages };

  

