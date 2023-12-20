// dbUtils.js (or a similar file)
const { pool } = require("./dbPoolConnection");

const queryAsync = (sql, values) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

module.exports = { queryAsync };
