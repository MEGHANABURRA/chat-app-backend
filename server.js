const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const http = require("http");

const server = http.createServer(app);
DB = process.env.DB_URI.replace("<password>", process.env.DB_PASSWORD);
mongodb = mongoose
  .connect(
    DB
    , {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,

    }
  )
  .then((conn) => {
    console.log("DB connection is established");
  })
  .catch((error) => {
    console.log("Error connecting MongoDB: " + error);
  });
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("App listening on port: " + port);
});
process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
