// Little application for reading FTP files from IoTailor
//
// V.01
//

//Roadmap:
// Authentification or at least token
// Error handling
// set timeout for rccfuring ping
// Smart updating or response (304 not change on file, etc)
// Support for folders in the FTP server

var Client = require("ftp");
//var fs = require("fs");
//const path = require("path");
const csv = require("fast-csv");
const express = require("express");
//const bodyParser = require("body-parser");
const { urlencoded } = require("body-parser");

const app = express();

app.use(urlencoded({ extended: true }));

//Controllers
const postFileToRead = (req, res, next) => {
  const body = req.body;
  //console.log(body);

  const fileParsed = [];

  var c = new Client();
  c.on("ready", function () {
    c.get(body.nameFile, function (err, stream) {
      if (err) throw err;
      stream.once("close", function () {
        res.status(200).json(fileParsed);
        c.end();
      });
      //stream.pipe(fs.createWriteStream("prueba.csv"));

      stream
        .pipe(csv.parse({ headers: true })) // Erro hanclidng if not CSV...
        .on("error", (error) => console.error(error))
        .on("data", (row) => fileParsed.push(row)) // Adaptar el formato a que sea mas parecedio a Iotailor
        .on("end", (rowCount) => {
          //console.log(`Parsed ${rowCount} rows and ${fileParsed.length}`);
        });
    });
  });
  c.connect({
    host: body.host,
    user: body.user,
    password: body.password,
  });
};

//Routes
app.post("/", postFileToRead);

app.listen(process.env.PORT || 3000, () => console.log("listening"));

// var c = new Client();
// c.on("ready", function () {
//   c.put("test.csv", "test.csv", function (err) {
//     if (err) throw err;
//     c.end();
//   });
// });

// var c = new Client();
// c.on("ready", function () {
//   c.list(function (err, list) {
//     if (err) throw err;
//     console.dir(list);
//     c.end();
//   });
// });

// var c = new Client();
// c.on("ready", function () {
//   c.get("test.csv", function (err, stream) {
//     if (err) throw err;
//     stream.once("close", function () {
//       c.end();
//     });
//     stream.pipe(fs.createWriteStream("test-copy.csv"));
//   });
// });

// c.connect({
//   host: "188.164.195.127",
//   user: "tailousadd",
//   password: "~42Gb0sg",
// });

// const body = [];

// fs.createReadStream(path.resolve(__dirname, "test-copy.csv"))
//   .pipe(csv.parse({ headers: true }))
//   .on("error", (error) => console.error(error))
//   .on("data", (row) => body.push(row)) // Adaptar el formato a que sea mas parecedio a Iotailor
//   .on("end", (rowCount) => {
//     console.log(`Parsed ${rowCount} rows and ${body.length}`);

//     //   fetch('https://httpbin.org/post', {
//     //         method: 'post',
//     //         body:    JSON.stringify(body),
//     //         headers: { 'Content-Type': 'application/json' },
//     //     })
//     //     .then(res => res.json())
//     //     .then(json => console.log(json));
//   });
