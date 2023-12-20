const mysql = require("mysql");
const dbConfig = require("./dbConfig");

// Create a connection pool
const pool = mysql.createPool(dbConfig);

async function connectToDatabase() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Database connection failed: " + err.message);
        reject(err);
      } else {
        console.log("Database connection is successful");
        connection.release();
        resolve();
      }
    });
  });
}

module.exports = {
  connectToDatabase,
  pool,
};
