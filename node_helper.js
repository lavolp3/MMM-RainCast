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
        var url = 'https://data.climacell.co/v4/timelines?location=';
        url += this.config.lat + ',' + this.config.lon;
        url += '&fields=precipitationIntensity,precipitationType,pressureSurfaceLevel,humidity,temperature,temperatureApparent,'
        + 'cloudCover,precipitationProbability,visibility,weatherCode,windDirection,windSpeed,windGust'
        + '&timesteps=' + this.config.forecastSteps + 'm'
        + '&apikey=' + this.config.apiKey;
        console.log(url);
        request(url, function (error, response, body) {
            if (error) throw new Error(error);
            self.log(body);
            self.rainData = JSON.parse(body);
            self.sendSocketNotification('RAIN_DATA', self.rainData);
        });
    },
    
    /*processData: function(payload) {
        var rainData = payload;
        for (let i = 0; i < rainData.data.timelines[0].intervals.length; i++) {
            if (rainData.data.timelines[0].intervals[i].precipitationProbability === 0) {
                rainData.data.timelines[0].intervals[i].precipitationIntensity = 0
            }
        }
        return rainData;
    },*/

    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    }
});
