const { pool } = require("./db");

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
  .then((r) => {
    console.log(r.rows);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });