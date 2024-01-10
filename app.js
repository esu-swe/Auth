
require('dotenv').config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');

const session = require('express-session');
const passport= require("passport");
const passportLocalMangoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate')



const app = express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: 'our little secret ',
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB")


const userSchema = new mongoose.Schema(
  {
    email: String,
    password: String,
    googleId:String,
    secret:String
  }
);

userSchema.plugin(passportLocalMangoose);
userSchema.plugin(findOrCreate)



const User = new mongoose.model("User", userSchema);

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile)
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/" ,function(req,res){
    res.render("home")
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login "}),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login" ,function(req,res){
    res.render("login")
})

app.get("/register" ,function(req,res){
    res.render("register")
});

app.get("/secrets", function(req, res){
 User.find({"secret": {$ne: null}}).then((founds) => {
  if(founds){
    res.render("secrets", {usersWithSecrets : founds})
  }
 }).catch((err) => {
  console.log(err)
 })
})

app.get("/submit" , function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  }else{
    res.redirect("/login")
  }
})

app.post("/submit" , function(req,res){
  const submitted = req.body.secret;

  console.log(req.user.id)
  User.findById(req.user.id).then((founds) => {
    founds.secret = submitted;
    if(founds){
      founds.save().then(() => {
        res.redirect("/secrets");
      }).catch((err) => {
        console.log(err)
      })
     
    }
 
  }).catch((err) => {
    console.log(err)
  })
 
})

app.post("/register" , function(req,res){
  
User.register({username: req.body.username}, req.body.password).then((user) => {
  passport.authenticate("local")(req, res ) .then(() => {
    res.redirect("/secrets")
  }) .catch((err) => {
    console.log(err)
  })
}).catch((err) => {
  console.log(err)
  res.redirect("/register");
}) 
})
  

app.post("/login",function(req, res){
  const user = new User({
    username: req.body.username,
    password:req.body.password
  })
  req.login(user , function(err){
    if(err){
      console.log(err)
    }else{
      passport.authenticate("local")(req, res , function(){
        res.redirect("/secrets")
      })
    }
  })
})

app.get("/logout" ,function(req,res){
  req.logOut();
  res.redirect("/")

})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});