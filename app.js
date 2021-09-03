var express = require("express");
var path = require("path");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const compress = require("compression");
const methodOverride = require("method-override");
const cors = require("cors");
const helmet = require("helmet");
const fileUpload = require("express-fileupload");

const routes = require("./api/routes/v1");
const { logs } = require("./config/vars");
const error = require("./api/middlewares/error");

var app = express();

// request logging. dev: console | production: file
app.use(morgan(logs));

app.use(
  fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 },
    debug: true,
  })
);

// parse body params and attache them to req.body
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  bodyParser.json({
    limit: "50mb",
  })
);

app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    parameterLimit: 100000,
    extended: true,
  })
);

// gzip compression
app.use(compress());

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// mount api v1 routes
app.use("/v1", routes);

app.use(express.static(path.join(__dirname, "./build")));
// // Handle React routing, return all requests to React app
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "./build", "index.html"));
});
app.get("*", function (req, res) {
  res.redirect(301, "http://mtet.pangeamt.com");
});

// const db = require("./models");
// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and Resync with { force: true }");
// });

// if error is not an instanceOf APIError, convert it.
app.use(error.converter);

// catch 404 and forward to error handler
app.use(error.notFound);

// error handler, send stacktrace only during development
app.use(error.handler);

module.exports = app;
