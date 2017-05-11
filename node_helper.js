var NodeHelper = require("node_helper");
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment-timezone');
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
var path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting module(nh):" + this.name);
    },

    socketNotificationReceived: function (type, url) {
        var self = this;
        //this.sendSocketNotification(type, url);
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
            // Authorize a client with the loaded credentials, then call the
            // Google Calendar API.
            self.authorize(JSON.parse(content), self.listEvents);
        });
    },

    authorize: function (credentials, callback) {
        var self = this;
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function (err, token) {
            if (err) {
                self.getNewToken(oauth2Client, callback);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                callback(oauth2Client, self);
            }
        });
    },

    getNewToken: function (oauth2Client, callback) {
        var self = this;
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        console.log('Authorize this app by visiting this url: ', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                self.storeToken(token);
                callback(oauth2Client, self);
            });
        });
    },

    storeToken: function (token) {
        try {
            fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code != 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to ' + TOKEN_PATH);
    },

    listEvents: function (auth, self) {
        var calendar = google.calendar('v3');
        var maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 8);
        var minDate = new Date();
        minDate.setDate(minDate.getDate() - 1);
        calendar.events.list({
            auth: auth,
            calendarId: 'primary',
            timeMin: (minDate).toISOString(),
            timeMax: (maxDate).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            var events = response.items;
            var timestamp = Date.now();
            var timezonedDate = moment.tz(timestamp, response.timeZone);


            var events_html = "";
            var map = {};
            var day_long_events = {};
            for (var i = 0; i < events.length; i++) {
                var event = events[i];

                var start = event.start.dateTime || event.start.date;

                var _date = parseInt(start.split("-")[2]);
                if (_date < timezonedDate.date() || _date >= timezonedDate.date() + 7)
                    continue;

                var diff = _date - timezonedDate.date();
                var end = event.end.dateTime || event.end.date;

                try {
                    var toks = start.split("T")[1].split(":");
                    var _top = parseInt(toks[0]) + parseInt(toks[1]) / 60;

                    toks = end.split("T")[1].split(":");
                    var _btm = parseInt(toks[0]) + parseInt(toks[1]) / 60;

                    var height = (_btm - _top) * 40;
                    var _left = 150 * (diff + 1) + (map[_top] || 0) * 75;
                    //var summ= 'may allow you to use the vertical-align CSS property on items such as the paragraph block';
                    //events_html += '<div style="border: 1px solid #ff3366;position:fixed;word-wrap: break-word; background-color:white;width:100px;color:black; height:' + height + 'px; top:' + (_top * 40 + 57) + 'px; left:' + _left + 'px;' + 'font-size:13px"><p>' + summ + '</p></div>';
                    events_html += '<div style="padding:1px;text-align:left;font-size:14px;border: 1px solid #ff3366;position:fixed;background-color:white;width:70px;color:black; height:' + height + 'px; line-height:'+height+'px;top:' + (_top * 40 + 116) + 'px; left:' + _left + 'px;' + '"><span>'+event.summary+'</span> </div>';
                    events_html += '';
                    map[_top] = (map[_top] || 0) + 1;

                } catch (e) {
                    //events_html += '<div style="position:fixed; top:40px; left:' + ((150 * (diff + 1) ) + 'px;') + 'font-size:13px">' + event.summary + '</div>';
                    if(!(start in day_long_events)){
                        day_long_events[start] = event.summary;
                    }else {
                        day_long_events[start] += " , " + event.summary ;
                    }
                }
            }
            console.log(day_long_events);
            for (var start in day_long_events) {
                if (day_long_events.hasOwnProperty(start)) {
                    var _date = parseInt(start.split("-")[2]);
                    var diff = _date - timezonedDate.date();

                    events_html += '<div style="padding:1px;text-align:left;font-size:14px;border: 1px solid #ff3366;position:fixed;background-color:white;width:148px;color:black;position:fixed; top:56px; left:' + ((150 * (diff + 1) ) + 'px;') + 'font-size:13px"><span>' + day_long_events[start] + '</span></div>';
                }
            }

            fs.readFile(path.join(__dirname, "/sample.html"), function (err, token) {
                var html = token.toString();
                for (var i = 0; i < 7; i++) {
                    var x = timezonedDate.weekday() % 7;
                    var day_of_week = self.getDayName(x).substr(0, 3) + "  " + (timezonedDate.month() + 1) + "/" + timezonedDate.date();
                    html += '<div style="position:fixed; top:20px; left:' + ((150 * (i + 1) + 30) + 'px;') + 'font-size:13px">' + day_of_week + '</div>';
                    timezonedDate.add(1, 'days');

                }
                html += events_html;
                self.sendSocketNotification("WEATHER", html);

            });
        });
    },

    getDayName: function (day) {
        switch (day) {
            case 0:
                day = "Sunday";
                break;
            case 1:
                day = "Monday";
                break;
            case 2:
                day = "Tuesday";
                break;
            case 3:
                day = "Wednesday";
                break;
            case 4:
                day = "Thursday";
                break;
            case 5:
                day = "Friday";
                break;
            case 6:
                day = "Saturday";
        }
        return day;
    }


});