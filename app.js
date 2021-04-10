// Little application for reading FTP files from IoTailor
//
// V.01
//

//Roadmap:
// Authentification or at least token DONE
// Error handling DONE
// Smart updating or response (304 not change on file, etc) Save RowCount
// Support for folders in the FTP server

var Client = require("ftp");
//var fs = require("fs");
//const path = require("path");
const csv = require("fast-csv");
const express = require("express");
//const bodyParser = require("body-parser");
const { json, urlencoded } = require("body-parser");

const app = express();

//app.use(urlencoded({ extended: true }));
app.use(json());

//Controllers
const postFileToRead = (req, res, next) => {
  if (req.header("Authorization") !== "5fb2b0ba-9942-11eb-a8b3-0242ac130003") {
    //TODO Unique identifier for client???
    return res.status(401).json({ code: 401, error: "Unauthorized" });
  }

  const body = req.body;
  //console.log(body);

  const fileParsed = { data: [] };

  var c = new Client();
  c.on("ready", function () {
    c.size(body.nameFile, (err, size) => {
      if (err) {
        return res.status(400).json({ code: err.code, error: err.message });
      }
      fileParsed.size = size;
      // if (size === +req.body.size) {
      //   // If file has not changed size, response 304 and not continue
      //   return res.status(304).json({ code: 304, error: "File not modified" });
      // }
      c.get(body.nameFile, function (err, stream) {
        if (err) {
          return res.status(400).json({ code: err.code, error: err.message });
        }
        stream.once("close", function () {
          c.end();
          //return res.status(200).json(fileParsed); // Mejorar para enviar direcatmente el stream como respuesta
          //res.send();
        });

        stream
          .pipe(
            csv.parse({
              headers: Boolean(body.headers),
              skipLines: body.skipLines || 0,
              skipRows: body.skipRows || 0,
              maxRows: body.maxRows || 0,
            })
          )
          .on("error", (err) => {
            console.error(err);
            return res.status(400).json({ code: err.code, error: err.message });
          })
          .on("data", (row) => fileParsed.data.push(row)) // Adaptar el formato a que sea mas parecedio a Iotailor
          .on("end", (rowCount) => {
            fileParsed.rowCount = rowCount;
            //console.log(`Parsed ${rowCount} rows`);
            return res.status(200).json(fileParsed);
          });
      });
    });
  });

  c.on("error", (err) => {
    console.log(err);
    res.status(400).json({ code: err.code, error: err.message });
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
