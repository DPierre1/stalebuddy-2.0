var express = require('express');
var router = express.Router();
var db = require("../db.js");
var Promise = require('bluebird-co');
var ObjectId = require('mongodb').ObjectID;
var walmart = require('walmart')("pjsxwgy68ucqd6cwt9rcf2ab");

var twilio = require('twilio')('AC0293b062c11a10845b444e53c171e300', 'd171fda81556464fc5bff4007799af13');
router.get('/', function (req, res, next) {
   res.render('index');
});
router.get('/logout', function (req, res, next) {
   res.cookie('accountnum', "-1", {
      maxAge: 900000,
      httpOnly: true
   });
});
router.get('/dashboard', function (req, res, next) {
   if (req.cookies.accountnum != null && req.cookies.accountnum != "") {
      Promise.coroutine(function* () {
         yield db.connect();
         //  Get current user with the id equal to the cookie accountNum
         var user = (yield(cb) => {
            db.Users.find({
               _id: ObjectId(req.cookies.accountnum)
            }).toArray(cb);
         })[0];

         var totalPrice = 0;
         for (var i = 0; i < user.grocery_list.length; i++) {
            totalPrice += Number(user.grocery_list[i].price);
         }

         console.log("Total price updated to " + totalPrice);
         res.render('dashboard', {
            grocery_list: user.grocery_list,
            totalPrice: totalPrice
         });
      })();
   } else {
      res.redirect("/login");
   }
});

router.get('/register', function (req, res, next) {
   res.render('register');
});
router.get('/Login', function (req, res, next) {
   res.render('Login');
});
router.get('/table', function (req, res, next) {
   res.render('table');
});

//  Only for dev purposes!
router.get('/clearAll', function (req, res, next) {
   Promise.coroutine(function* () {
      yield db.connect();
      var result = yield(cb) => {
         db.Users.remove({}, cb);
      };
      console.log(result);
      res.cookie('accountnum', "-1", {
         maxAge: 900000,
         httpOnly: true
      });
      res.redirect("/");
   })();
});

router.post("/login", function (req, res, next) {
   Promise.coroutine(function* () {
      yield db.connect();
      var user = yield db.Users.find({
         "email": req.body.email,
         "password": req.body.password
      }).toArray();
      if (user.length > 0) {
         res.cookie('accountnum', user[0]._id, {
            maxAge: 900000,
            httpOnly: true
         });
         res.end("OK");
      } else {
         res.status(401).end();
      }
   })();
});
router.post("/register", function (req, res, next) {
   Promise.coroutine(function* () {
      yield db.connect();
      var existing_user = yield db.Users.find({
         "email": req.body.email,
         "password": req.body.password
      }).toArray();

      if (existing_user && existing_user.length > 0) {
         res.end("OK");
         return;
      }

      var u = (yield(cb) => {
         db.Users.insert({
            "name": req.body.name,
            "email": req.body.email,
            "phone": req.body.phone,
            "password": req.body.password,
            "grocery_list": [],
            "recipes": [],
            "log_book": []
         }, cb);
      });
      var user = yield db.Users.find({
         "email": req.body.email,
         "password": req.body.password
      }).toArray();
      if (user.length > 0) {
         res.cookie('accountnum', user[0]._id, {
            maxAge: 900000,
            httpOnly: true
         });
         res.end("OK");
      }
   })();
   sendTextForRegistering(req.body.name, req.body.phone);
});
router.post("/addItem", function (req, res, next) {
   Promise.coroutine(function* () {
      yield db.connect();
      //  Get current user with the id equal to the cookie accountNum
      var user = (yield(cb) => {
         db.Users.find({
            _id: ObjectId(req.cookies.accountnum)
         }).toArray(cb);
      })[0];
      var exists = false;
      for (var i = 0; i < user.grocery_list.length; i++) {
         if (JSON.stringify(user.grocery_list[i]) === JSON.stringify(req.body)) {
            exists = true;
            break;
         }
      }
      if (!exists) {
         //  Add the item to the variable above.
         user.grocery_list.push(req.body);
         //  Re-store that variable back in the database.
         yield(cb) => {
            db.Users.update({
               _id: ObjectId(req.cookies.accountnum)
            }, user, cb);
         };
         res.end("OK");
      }
   })();
});

router.get("/delete/:id", function (req, res, next) {
   var grocery_id = req.params.id;
   Promise.coroutine(function* () {
      yield db.connect();
      //  Get current user with the id equal to the cookie accountNum
      var user = (yield(cb) => {
         db.Users.find({
            _id: ObjectId(req.cookies.accountnum)
         }).toArray(cb);
      })[0];

      user.grocery_list.splice(grocery_id, 1);

      //  Re-store that variable back in the database.
      yield(cb) => {
         db.Users.update({
            _id: ObjectId(req.cookies.accountnum)
         }, user, cb);
      };
      res.redirect("/dashboard");
   })();
});

router.post("/lookupItem", function (req, res, next) {
   Promise.coroutine(function* () {
      var item = yield walmart.getItemByUPC(req.body.upc);
      console.log(item);
      res.json(item);
   })();
});

function sendTextForRegistering(name, phone) {
   twilio.sendMessage({
      to: phone,
      from: "3393646331",
      body: 'Thanks for joining StaleBuddy :)'
   }, function (err, responseData) {
      if (!err) {
         console.log(responseData.from); // outputs "+14506667788"
         console.log(responseData.body); // outputs "word to your mother."
      }
   });
}



module.exports = router;
