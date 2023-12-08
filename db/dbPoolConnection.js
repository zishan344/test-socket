const mysql = require("mysql");

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DATABASE,
  connectTimeout: 30000,
});

// Function to handle database connection errors
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed: " + err.message);
  } else {
    console.log("Database connection is successful");
    connection.release(); // Release the connection back to the pool
  }
});

module.exports = pool;
