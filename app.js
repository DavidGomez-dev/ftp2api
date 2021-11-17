// Little application for reading FTP files from IoTailor
//
// V.2
//

// Changelog
//v2 Adding support for individual files (Encardio FTP IPIs)
//v1 initial version

//Roadmap:
// Improve eficiency with pipe the response??

var Client = require("ftp");
//var fs = require("fs");
//const path = require("path");
const csv = require("fast-csv");
const express = require("express");
//const bodyParser = require("body-parser");
const { json, urlencoded } = require("body-parser");

const app = express();

const VERBOSE = process.env.VERBOSE || false;

console.log(`Mode Verbose: ${VERBOSE}`);

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
      if (size === +req.body.size) {
        // If file has not changed size, response 304 and not continue
        return res.status(304).json({ code: 304, error: "File not modified" });
      }
      c.get(body.nameFile, function (err, stream) {
        if (err) {
          return res.status(400).json({ code: err.code, error: err.message });
        }
        // stream.once("close", function () {
        //   c.end();
        // });

        stream
          .pipe(
            csv.parse({
              headers: Boolean(body.headers),
              skipLines: body.skipLines || 0,
              skipRows: body.skipRows || 0,
              maxRows: body.maxRows || 0,
            })
          )
          .once("close", function () {
            c.end();
          })
          .on("error", (err) => {
            //console.error(err);
            return res.status(400).json({ code: err.code, error: err.message });
          })
          .on("data", (row) => fileParsed.data.push(row)) // Format to handle in the next platform
          .on("end", (rowCount) => {
            fileParsed.rowCount = rowCount;
            fileParsed.size = size - rowCount; //If rowCount is not cero, decrease the filesize to continue reading in next call
            //console.log(`Parsed ${rowCount} rows`);
            return res.status(200).json(fileParsed);
          });
      });
    });
  });

  c.on("error", (err) => {
    //console.log(err);
    res.status(400).json({ code: err.code, error: err.message });
  });

  c.connect({
    host: body.host,
    user: body.user,
    password: body.password,
  });
};

const postIndividualFileToRead = (req, res, next) => {
  if (req.header("Authorization") !== "5fb2b0ba-9942-11eb-a8b3-0242ac130003") {
    //TODO Unique identifier for client???
    return res.status(401).json({ code: 401, error: "Unauthorized" });
  }

  const body = req.body;
  if (VERBOSE) {
    console.log("body:");
    console.log(body);
  }
  lastDate = new Date(body.date) || new Date("1984-07-04T15:00:00.000Z");

  const fileParsed = { data: [] };

  var c = new Client();
  c.on("ready", function () {
    if (VERBOSE) {
      console.log("FTP server ready");
    }

    c.list((err, list) => {
      if (err) {
        if (VERBOSE) {
          console.log("err:");
        }

        return res.status(400).json({ code: err.code, error: err.message });
      }

      //Filter out directories
      list = list.filter((el) => el.type != "d");
      // Order the list by date
      list.sort((a, b) => (a.date > b.date ? 1 : -1));

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        //console.log(file.date + " >? " + lastDate);
        if (file.date > lastDate) {
          //console.log(file.date + " >? " + lastDate);
          if (VERBOSE) {
            console.log(`File to parse:${file.name}`);
          }

          return c.get(file.name, function (err, stream) {
            if (err) {
              if (VERBOSE) {
                console.log("err:");
              }

              return res.status(400).json({ code: err.code, error: err.message });
            }

            stream
              .pipe(
                csv.parse({
                  headers: Boolean(body.headers),
                  skipLines: body.skipLines || 0,
                  skipRows: body.skipRows || 0,
                  maxRows: body.maxRows || 0,
                })
              )
              .once("close", function () {
                c.end();
              })
              .on("error", (err) => {
                if (VERBOSE) {
                  console.log("err:");
                  console.error(err);
                }

                return res.status(400).json({ code: err.code, error: err.message });
              })
              .on("data", (row) => {
                if (VERBOSE) {
                  console.log(row);
                }

                fileParsed.data.push(row);
              }) // Format to handle in the next platform
              .on("end", (rowCount) => {
                fileParsed.rowCount = rowCount;
                fileParsed.date = file.date;
                fileParsed.nameFile = file.name;
                if (VERBOSE) {
                  console.log(`rowCount:${rowCount}`);
                  console.log(`file.date:${file.date}`);
                  console.log(`file.name:${file.name}`);
                }
                return res.status(200).json(fileParsed);
              });
          });
        }
      }
      return res.status(304).json({ code: 304, error: "No new files" });
    });
  });

  c.on("error", (err) => {
    console.log("err:");
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

//Routes
app.post("/individualfile", postIndividualFileToRead);

app.listen(process.env.PORT || 3000, () => console.log("listening"));
