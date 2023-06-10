const express = require("express");

const router = express.Router();

const { exec } = require("child_process");

const fs = require("fs");

const crypto = require("node:crypto");

const request = require("axios");

const jwt = require("jsonwebtoken");

const openpgp = require("openpgp");

const Handlebars = require("handlebars");

function randomstring() {
  var random = crypto.randomBytes(256).toString("hex");
  return random;
}

function jwtsecret() {
  var jwtsecret = process.env.jwtlocation || "/tmp/jwt";

  try {
    if (fs.existsSync(jwtsecret)) {
      fs.readFile(jwtsecret, (err, data) => {
        if (!err && data) {
          return data;
        }
      });
    } else {
      var jwtrandom = randomstring();
      console.log("The random data is: " + jwtrandom);
      fs.writeFile(jwtsecret, jwtrandom, (err) => {
        if (err) {
          console.error(err);
        }
      });
      return jwtrandom;
    }
  } catch (err) {
    console.error(err);
  }
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

router.get("/jwt.js", (req, res) => {
  res.sendFile(__dirname + "/jwt.js");
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

        res.redirect(
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
  }

  res.sendFile(__dirname + "/index.html");
});

router.post("/test-email", (req, res) => {
  var data = {
    grant_type: "client_credentials",
    scope: "api",
    client_id: req.body.client_id,
    client_secret: req.body.client_secret,
    device_identifier: "webui-node",
    device_name: "webui-node",
    device_type: "webui-node",
  };

  request
    .post("./identity/connect/token", data, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    })
    .then(function (response) {
      //console.log(response);
      if (response.hasOwnProperty("access_token") >= 0) {
        var jwtdecoded = jwt.decode(response.access_token);
        console.log("Email verified");

        try {
          var token = jwt.sign(
            {
              email: jwtdecoded.email,
              pgp: req.body.pgp,
              permissions: req.body.permissions,
            },
            jwtsecret()
          );
        } catch (err) {
          console.error(err);
          res.status(500).json("error signing jwt");
        }

        const source =
          '<a href="{{site}}/?token={{token}}">Activate PGP Settings</a>';
        const template = Handlebars.compile(source);
        const emailcontents = template({
          site: process.env.site || req.body.site,
          token: token,
        });

        encrypt(emailcontents, req.body.pgp).then((response) => {
          var execcommand =
            "echo " + response + " | /tmp/sendmail -v -i " + jwtdecoded.email;
          console.log(execcommand);
          exec(execcommand, (error, stdout, stderr) => {
            if (error) {
              console.error(`error: ${error.message}`);
              return;
            }
            if (stderr) {
              console.error(`stderr: ${stderr}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
          });
          res.status(200).json("exec ok");
        });
      }
    })
    .catch(function (error) {
      res.status(500).json("error.Message");
    });
});

async function encrypt(mymessage, mykey) {
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: mymessage }),
    encryptionKeys: await openpgp.readKey({ armoredKey: mykey }),
  });

  return encrypted;
}
module.exports = router;
