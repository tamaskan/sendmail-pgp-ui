const express = require("express");

const router = express.Router();

const { exec } = require("child_process");

const fs = require("fs");

const crypto = require("node:crypto");

const request = require("axios");

const jwt = require("jsonwebtoken");

const openpgp = require("openpgp");

function jwtsecret() {
  var jwtsecret = "/tmp/jwt";

  fs.readFile(jwtsecret, (err, data) => {
    if (!err && data) {
      return data;
    } else {
      crypto.randomBytes(127, (err, buf) => {
        if (err) {
          // Prints error
          console.log(err);
          return;
        }

        // Prints random bytes of generated data
        console.log("The random data is: " + buf.toString("hex"));
        fs.writeFile("/tmp/jwt", buf.toString("hex"), (err) => {
          if (err) {
            console.error(err);
          }
        });
        return buf.toString("hex");
      });
    }
  });
}

router.get("/bootstrap.css", (req, res) => {
  res.sendFile(__dirname + "/bootstrap.css");
});

router.get("/bootstrap.js", (req, res) => {
  res.sendFile(__dirname + "/bootstrap.js");
});

router.get("/jquery.js", (req, res) => {
  res.sendFile(__dirname + "/jquery.js");
});

router.get("/favicon.ico", (req, res) => {
  res.sendFile(__dirname + "/favicon.ico");
});

router.get("/", (req, res) => {
  if (req.query.token && req.query.token.length > 0) {
    jwt.verify(req.query.token, jwtsecret(), function (err, decoded) {
      if (decoded) {
        var emailhash = crypto
          .createHash("md5")
          .update(decoded.email)
          .digest("hex");

        fs.writeFile("/keys/" + emailhash + ".pgp", decoded.pgp, (err) => {
          if (err) {
            console.error(err);
          }
        });

        fs.writeFile(
          "/keys/" + emailhash + ".config",
          decoded.permissions,
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );
        res.sendFile(
          __dirname +
            "/index.html?email=" +
            decoded.email +
            "&pgp=" +
            decoded.pgp +
            "&permissions=" +
            decoded.permissions +
            "&success=true"
        );
      }
    });
    res.sendFile(
      __dirname +
        "/index.html?email=" +
        decoded.email +
        "&pgp=" +
        decoded.pgp +
        "&permissions=" +
        decoded.permissions
    );
  }

  res.sendFile(__dirname + "/index.html");
});

router.post("/testemail", (req, res) => {
  var data = {
    grant_type: "password",
    scope: "api",
    client_id: req.body.client_id,
    client_secret: req.body.client_secret,
    //email: req.query.email,
    device_identifier: "webui-node",
    device_name: "webui-node",
    device_type: "webui-node",
    //username: req.query.email,
  };

  request
    .post("./identity/connect/token", data)
    .then(function (response) {
      console.log(response);
      if (response.indexOf("access_token") >= 0) {
        console.log("Email verified");

        const publicKeyArmored = req.body.pgp;

        var token = jwt.sign(
          {
            email: req.body.email,
            pgp: req.body.pgp,
            permissions: req.body.permissions,
          },
          jwtsecret()
        );
        var encryptedmessage =
          "<a href=" +
          req.body.site +
          "'/?token=" +
          encrypt(token, publicKeyArmored) +
          "'>Activate Settings</a>";

        var emailcontent =
          "echo " +
          encryptedmessage +
          '" | /tmp/sendmail -v -i ' +
          req.body.email;
        exec(emailcontent, (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            return;
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
        });
      }
    })
    .catch(function (error) {
      //console.log("error");
      //console.log(req.body);
    });
});

async function encrypt(message, key) {
  const plainData = message;
  const encrypted = await openpgp.encrypt({
    message: openpgp.Message.fromText(plainData),
    publicKeys: key,
  });

  return encrypted.data;
}
module.exports = router;
