var NodeHelper = require('node_helper');
var request = require('request');
var moment = require('moment');

module.exports = NodeHelper.create({

    // Override start method.
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.isRunning = false;
        this.rainData = {};
    },

    // Override socketNotificationReceived method.
    socketNotificationReceived: function(notification, payload) {
        this.log("Socket Notification received. Title: "+notification+", Payload: "+payload);
        if (notification == "RAIN_REQUEST") {
            if (!this.isRunning) {
                this.isRunning = true;
                this.config = payload;
                var self = this;
                this.getData();
                setInterval(function() {
                   self.getData();
                }, payload.updateInterval);
            } else {
                this.log("Node Helper already running, sending data...");
                this.sendSocketNotification('RAIN_DATA', this.rainData);
            }
        }
    },

    getData: function() {
        var self = this;
        if (this.config.useDWD) {
            var url = 'https://morgenwirdes.de/api/v2/rjson.php?lat=' + this.config.lat + '&long=' + this.config.lon;
        } else {
            var url = 'https://data.climacell.co/v4/timelines?location=';
            url += this.config.lat + ',' + this.config.lon;
            url += '&fields=precipitationIntensity,precipitationType,pressureSurfaceLevel,humidity,temperature,temperatureApparent,'
            + 'cloudCover,precipitationProbability,visibility,weatherCode,windDirection,windSpeed,windGust'
            + '&timesteps=' + this.config.forecastSteps + 'm'
            + '&apikey=' + this.config.apiKey; 
        }
        this.log(url);
        request(url, function (error, response, body) {
            if (error) throw new Error(error);
            self.log(body);
            self.rainData = JSON.parse(body);
            self.sendSocketNotification('RAIN_DATA', self.rainData);
        });
    },

    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    }
});
