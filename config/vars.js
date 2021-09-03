const path = require("path");

// import .env variables
require("dotenv-safe").config({
  allowEmptyValues: true,
  example: path.join(__dirname, "./../.env")
});

module.exports = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpirationInterval: process.env.JWT_EXPIRATION_MINUTES,
  logs: process.env.NODE_ENV === "production" ? "combined" : "dev",
  emailConfig: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD
  }
};
