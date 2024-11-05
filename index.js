const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const axios = require('axios');
const app = express();
const PORT = 3000;

let users = require('./users.json');
let logons = require('./checkins.json');

// Configure session
app.use(session({
  secret: 'your_secret_key',  // Change this to a secure key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Redirect to login if user is not authenticated
app.get('/', (req, res) => {
  console.log("eadsa")
  if (!req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'public/login.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

app.get('/style', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/style.css'));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Attempting login with:", username, password);  // Log the credentials received

  if (users[username] && users[username].password === password) {
    req.session.loggedIn = true;
    req.session.username = username;
    return res.status(200).json({ success: true });  // Return success JSON
  }

  res.status(401).json({ success: false, message: "Login failed. Check your username and password." });
});

// Check-in endpoint (requires login)
app.post('/checkin', (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(403).send("Login required");
  }

  const username = req.session.username;
  const date = addCheckin(username);
  res.json({ checkInTime: date });
});

// Check-out endpoint (requires login)
app.post("/checkout", (req, res) => {
  if (!req.session.loggedIn) {
    return res.status(403).send("Login required");
  }

  const username = req.session.username;
  const date = addCheckout(username);
  shutdownIp(users[username].ip);
  res.json({ checkOutTime: date });
});

// Functions for check-in and check-out times
function addCheckin(username) {
  const today = new Date().toISOString();
  logons[username].checkins.push({ date: today });

  fs.writeFileSync('checkins.json', JSON.stringify(logons, null, 4));
  console.log(`${username} checked in at ${today}`);
  return today;
}

function addCheckout(username) {
  const today = new Date().toISOString();
  logons[username].checkouts.push({ date: today });

  fs.writeFileSync('checkins.json', JSON.stringify(logons, null, 4));
  console.log(`${username} checked out at ${today}`);
  return today;
}

// Function to send shutdown signal
async function shutdownIp(ip) {
  try {
    await axios.post(`http://${ip}:45271`, {
      headers: {
        Accept: "*/*",
        Connection: "keep-alive",
        "X-Requested-With": "XMLHttpRequest",
      }
    });
    console.log(`Shutdown signal sent to ${ip}`);
  } catch (error) {
    console.error(`Failed to send shutdown signal to ${ip}:`, error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
