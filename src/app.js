//=====================================================Imported Zone
const express = require("express");
const dotenv = require("dotenv");
const http = require("http");

//=====================================================local imported Zone

const restApiServer = require("./server/rest");
const socketServer = require("./server");

//=====================================================Constance Zone
dotenv.config({ path: "./.env" });
const host = process.env.HOST || "localhost";
const port = process.env.PORT || 8080;
const app = express();
const server = http.createServer(app);

//=====================================================Main Functions

restApiServer(app, server);
// socketServer();

//=====================================================Listening Zone
console.log(`API DOCS ON:  http://${host}:${port}/docs`);
server.listen(+port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
  console.log(`Socket io server is running on port ${port}`);
});

module.exports = server;
