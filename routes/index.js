const express = require("express");

const router = express.Router();

const fs = require("fs");

const crypto = require("node:crypto");

const request = require("axios");

const jwt = require("jsonwebtoken");

const openpgp = require("openpgp");

const Handlebars = require("handlebars");

const nodemailer = require("nodemailer");

const os = require("os");

const transporter = nodemailer.createTransport({
  host: process.env.SENDMAIL_SMART_HOST,
  port: process.env.SENDMAIL_SMART_PORT,
  auth: {
    user: process.env.SENDMAIL_SMART_LOGIN,
    pass: process.env.SENDMAIL_SMART_PASSWORD,
  },
});

function randomstring() {
  return crypto.randomBytes(256).toString("hex");
}

function jwtsecret() {
  var jwtsecret = "/tmp/jwt";

  if (fs.existsSync(jwtsecret)) {
    const data = fs.readFileSync(jwtsecret, "utf8");
    if (data) {
      return data;
    }
  } else {
    var jwtrandom = randomstring();

    if (os.type() == "Linux") {
      fs.writeFile(jwtsecret, jwtrandom, (err) => {
        if (err) {
          console.error(err);
        }
      });
    } else {
      console.log(os.type());
    }

    return jwtrandom;
  }
}

router.get("/pgp/bootstrap.css", (req, res) => {
  res.sendFile(__dirname + "/bootstrap.css");
});

router.get("/pgp/bootstrap.js", (req, res) => {
  res.sendFile(__dirname + "/bootstrap.js");
});

router.get("/pgp/jquery.js", (req, res) => {
  res.sendFile(__dirname + "/jquery.js");
});

router.get("/pgp/favicon.ico", (req, res) => {
  res.sendFile(__dirname + "/favicon.ico");
});

router.get("/pgp/jwt.js", (req, res) => {
  res.sendFile(__dirname + "/jwt.js");
});

router.get("/pgp/", (req, res) => {
  if (req.query.token && req.query.token.length > 0) {
    jwt.verify(req.query.token, jwtsecret(), function (err, decoded) {
      if (err) {
        console.log("invalid signature");
        res.redirect("/pgp/?signature=invalid");
      }
      if (decoded) {
        var emailhash = crypto
          .createHash("md5")
          .update(decoded.email)
          .digest("hex");

        if (os.type() == "Linux") {
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
        }
        res.send(
          handlebarResponse(
            decoded.email,
            encodeURIComponent(decoded.pgp),
            encodeURIComponent(decoded.permissions),
            "true"
          )
        );
      }
    });
  }
  res.send(handlebarResponse("", "", "", ""));
});

function handlebarResponse(email, pgp, permissions, success) {
  const indexhtml = fs.readFileSync(__dirname + "/index.html", "utf8");
  const template = Handlebars.compile(indexhtml);
  const indexcontent = template({
    email: "var email='" + email + "';",
    pgp: "var pgp='" + pgp + "';",
    permissions: "var permissions='" + permissions + "';",
    success: "var success='" + success + "';",
  });

  return indexcontent;
}

router.post("/pgp/test-email", (req, res) => {
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
    .post(req.body.site + "/identity/connect/token", data, {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Cookie: req.headers["cookie"],
      },
    })
    .then(function (response) {
      //console.log(response.data);
      if (response.data.hasOwnProperty("access_token")) {
        //console.log(response.access_token);
        var jwtdecoded = jwt.decode(response.data.access_token);
        console.log("Email verified: " + jwtdecoded.email);

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

        const template = Handlebars.compile("{{site}}/pgp/?token={{token}}");
        const emailcontents = template({
          site: req.body.site,
          token: token,
        });
        //console.log("raw: " + emailcontents);
        encrypt(emailcontents, req.body.pgp).then((response) => {
          //console.log("encrypted: " + response);
          transporter.sendMail({
            from: process.env.SENDMAIL_SMART_LOGIN,
            to: jwtdecoded.email,
            subject: "Verify",
            text: response,
          });

          res.status(200).json("mail ok");
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
