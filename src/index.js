const functions = require("firebase-functions");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 8080;
const serviceAccount = require("./../config/serviceAccountKey.json");
const userFeed = require("./app/user-feed");
const authMiddleware = require("./app/auth-middleware");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore(); 
// use cookies
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// set the view engine to ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/static", express.static("static/"));

// use res.render to load up an ejs view file
// index page
app.get("/", function (req, res) {
  res.render("pages/index");
});

app.get("/sign-in", function (req, res) {
  const sessionCookie = req.cookies.session || "";
  if (sessionCookie === "") {
    res.render("pages/sign-in");
  } else {
    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then(userData => {
        console.log("Logged in:", userData.email);
        req.user = userData;
        next();
      })
      .catch(error => {
        res.redirect("/dashboard");
      });
  }
  
});

app.get("/sign-up", function (req, res) {
  const sessionCookie = req.cookies.session || "";
  if (sessionCookie === "") {
    res.render("pages/sign-up");
  } else {
    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then(userData => {
        console.log("Logged in:", userData.email);
        req.user = userData;
        next();
      })
      .catch(error => {
        res.redirect("/dashboard");
      });
  }
  //res.render("pages/sign-up");
});

app.get("/dashboard", authMiddleware, async function (req, res) {
  const feed = await userFeed.get();
  res.render("pages/dashboard", { user: req.user });
});

app.get("/appointmenthistory", authMiddleware, async function (req, res) {
  res.render("pages/appointmenthistory", { user: req.user });
});

app.get("/appointmentbooking", authMiddleware, async function (req, res) {
  res.render("pages/appointmentbooking", { user: req.user });
});

app.post("/updatedatacollection", async (req, res) => {
  const eventbody = req.body
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const emailid = req.body.emailid;
  const appointmentpurpose= req.body.appointmentpurpose;

  const dataAdded = await db.collection('appointments').add({
    firstname: firstname,
    lastname: lastname,
    emailid: emailid,
    appointmentpurpose:appointmentpurpose,
    userid:emailid
  })

  res.redirect("/appointmentbooking");
  });

  app.get("/getappointmentdetails", async (req, res) => {
    console.log("getting user", req.user);
   const snapshot = await db.collection('appointments').get();

  const resp = {};
    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }  
    snapshot.forEach(doc => {
      resp[doc.id] = doc.data();
    });
    console.log("returning response", resp);
     return res.send(resp);
    });
    
    app.get("/submissionform", (req, res) => {
      res.render("pages/submissionform", { user: req.user });
    });

app.post("/sessionLogin", async (req, res) => {
  const idToken = req.body.idToken
  const expiresIn = 60 * 60 * 24 * 6 * 1000;
  admin.auth().createSessionCookie(idToken, { expiresIn }).then(
    (sessionCookie) => {
      const options = { maxAge: expiresIn, httpOnly: true, secure: true };
      res.cookie("__session", sessionCookie, options);
      res.end(JSON.stringify({ status: 'success' }));
    },
    (error) => {
      res.status(501).send('UNAUTHORIZED REQUEST!');
    }
    );
  });
app.get("/sessionLogout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/sign-in");
});

app.post("/dog-messages", authMiddleware, async (req, res) => {
 
  var dogMessage = req.body.message.toString();

  var currentuser = req.user;

  await userFeed.add(currentuser, dogMessage);

  res.redirect("/dashboard");
});


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest(app);


//app.listen(port);
console.log("Server started at http://localhost:" + port);
