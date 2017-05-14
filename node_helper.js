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
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err);
                return;
            }
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
            var timestamp = Date.now();
            var timezonedDate = moment.tz(timestamp, response.timeZone);

            var events = response.items;
            var day_long_events = self.getDayLongEvents(events, timezonedDate);
            events = self.breakEventsFallingOnTwoDays(events);
            var blocks = self.getSetsOfIntervals(events);
            events = self.addPositions(blocks);


            var events_html = "";
            for (var i = 0; i < events.length; i++) {
                var event = events[i];

                var start = event.start.dateTime || event.start.date;

                var _date = parseInt(start.split("-")[2]);
                if (_date < timezonedDate.date() || _date >= timezonedDate.date() + 7)
                    continue;

                var diff = _date - timezonedDate.date();
                var end = event.end.dateTime || event.end.date;

                var width = 13 / event['num_slots'];
                var style = 'background-color:white;color:black;border:1px solid red;position: absolute;width: calc(' + width + '%);';

                var toks = start.split("T")[1].split(":");
                var start_hr = parseInt(toks[0]) + parseInt(toks[1]) / 60;
                var _top = (2 + start_hr) * 42 + 1;
                style += 'top:' + _top + 'px;';


                toks = end.split("T")[1].split(":");
                var _btm = parseInt(toks[0]) + parseInt(toks[1]) / 60;
                var hours = (_btm - start_hr) * 2;
                var _height = 20 * hours + (hours - 1);
                style += 'height:' + _height + 'px;';


                var _left = 8 + diff * 13 + width * event['slot_index'];
                style += 'left:calc(' + _left + '% + ' + diff + 'px)';
                console.log(style);

                if (_height > 0)
                    events_html += '<div style="' + style + '">' + event.summary + '</div>';
                events_html += '';
            }


            for (var i = 0; i < day_long_events.length; i++) {
                var event = day_long_events[i];
                var style = 'background-color:white;color:black;border:1px solid red;position: absolute;width: calc(' + width + '%);';
                var _top = 42;
                var _left = 8 + 13 * event['diff'];
                style += 'top:' + _top + 'px;';
                style += 'left:calc(' + _left + '% + ' + diff + 'px);';
                style += 'height: 40px;';
                events_html += '<div style="' + style + '">' + event.summary + '</div>';
            }
            fs.readFile(path.join(__dirname, "/sample.html"), function (err, token) {
                var html = token.toString();
                for (var i = 0; i < 7; i++) {
                    var x = timezonedDate.weekday() % 7;
                    var day_of_week = self.getDayName(x).substr(0, 3) + "  " + (timezonedDate.month() + 1) + "/" + timezonedDate.date();
                    timezonedDate.add(1, 'days');
                    var style = 'position: absolute;width: calc(' + width + '%);';
                    var _top = 0;
                    var _left = 8 + 13 * i;
                    style += 'top:' + _top + 'px;';
                    style += 'left:calc(' + _left + '% + ' + diff + 'px);';
                    style += 'height: 40px;';
                    events_html += '<div style="' + style + '">' + day_of_week + '</div>';

                }
                html += '<div id="wrapper">' + events_html + '</div>';
                console.log(html);
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
    },

    addPositions: function (blocks) {
        var events = [];
        for (var i = 0; i < blocks.length; i++) {
            var block = blocks[i];
            var slots = [];
            for (var j = 0; j < block.length; j++) {
                var consumed = false;
                for (var k = 0; k < slots.length; k++) {
                    if (this.hasSlot(slots[k], block[j])) {
                        slots[k].push(block[j]);
                        consumed = true;
                        break;
                    }
                }
                if (!consumed) {
                    slots.push([block[j]]);
                }
            }
            for (var j = 0; j < slots.length; j++) {
                for (var k = 0; k < slots[j].length; k++) {
                    slots[j][k]['num_slots'] = slots.length;
                    slots[j][k]['slot_index'] = j;
                    events.push(slots[j][k]);

                }
            }
        }
        return events;
    },

    hasSlot: function (slot, event) {
        for (var i = 0; i < slot.length; i++) {
            if (this.isOverlapping(slot[i], event)) {
                return false;
            }
        }
        return true;
    },

    getDayLongEvents: function (events, timezonedDate) {
        var result = [];
        var _map = {};
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var start = event.start.dateTime || event.start.date;
            var end = event.end.dateTime || event.end.date;

            if (!(start.indexOf("T") >= 0 && end.indexOf("T") >= 0)) {
                var _date = parseInt(event.start.date.split("-")[2]);
                var diff = _date - timezonedDate.date();
                _map[diff] = (_map[diff] || "") + "," + event.summary;
            }
        }
        for(var diff in _map){
            if(_map.hasOwnProperty(diff)){
                result.push({"diff": diff, "summary": _map[diff].substr(1)});
            }
        }
        return result;
    },

    breakEventsFallingOnTwoDays: function (events) {
        var result = [];
        for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var start = event.start.dateTime || event.start.date;
            var end = event.end.dateTime || event.end.date;
            if (start.indexOf("T") >= 0 && end.indexOf("T") >= 0) {
                var tzdiff = start.substr(19);
                var startToks = start.split("T");
                var endToks = end.split("T");
                if (startToks[0] === endToks[0]) {
                    result.push({"summary": event.summary, "start": event.start, "end": event.end});
                } else {
                    var start1 = start;
                    var end1 = startToks[0] + "T23:59:59" + tzdiff;
                    var start2 = endToks[0] + "T00:00:00" + tzdiff;
                    var end2 = end;
                    result.push({"summary": event.summary, "start": {"dateTime": start1}, "end": {"dateTime": end1}});
                    result.push({"summary": event.summary, "start": {"dateTime": start2}, "end": {"dateTime": end2}});
                }
            } else {
                //result.push({"summary": event.summary, "start": event.start, "end": event.end});
            }
        }
        return result;
    },

    getSetsOfIntervals: function (events) {
        var blocks = [];
        var intervals = [];
        for (var i = 0; i < events.length; i++) {
            var consumed = false;
            for (var j = 0; j < blocks.length; j++) {
                var tmp = this.isOverlapping(intervals[j], events[i]);
                if (tmp) {
                    if (tmp !== intervals[j]) {
                        intervals[j] = tmp;
                    }
                    blocks[j].push(events[i]);
                    consumed = true;
                    break;
                }
            }
            if (!consumed) {
                blocks.push([events[i]]);
                intervals.push(events[i]);
            }
        }
        return blocks;
    },

    isOverlapping: function (event1, event2) {
        if (event1.start.dateTime < event2.start.dateTime) {
            return this.isOverlapping(event2, event1);
        }
        if (event1.start.dateTime >= event2.start.dateTime && event1.end.dateTime <= event2.end.dateTime) {
            return {"start": {"dateTime": event2.start.dateTime}, "end": {"dateTime": event2.end.dateTime}};
        }
        if (event2.start.dateTime >= event1.start.dateTime && event2.end.dateTime <= event1.end.dateTime) {
            return {"start": {"dateTime": event1.start.dateTime}, "end": {"dateTime": event1.end.dateTime}};
        }
        if (event1.start.dateTime < event2.end.dateTime && event1.start.dateTime > event2.start.dateTime) {
            return {"start": {"dateTime": event2.start.dateTime}, "end": {"dateTime": event1.end.dateTime}};
        }
        return false;
    }


});