/* Magic Mirror
 * Module: MMM-RainCast
 * Displays a scalable hihcharts graph of expected rain for a lon/lat pair based on the climacell free  API
 * By lavolp3, based on the module MMM-Buienalarm.
 */

Module.register("MMM-RainCast",{
    // Default module config.
    defaults: {
        lat: 52.222,
        lon: 5.555,
        width: 500,
        height: 500,
        iconHeight: 40,
        apiKey: '',
        useDWD: false,
        forecastHours: 4,
        forecastSteps: 15,
        updateInterval: 5 * 60 * 1000,
        chartType: 'line',
        chartFillColor: 'rgba(65, 105, 220, 0.9)',
        rainIconColor: '#fafafa',
        windIconColor: '#cccccc',
        details: false,
        temperature: false,
        pressure: true,
        wind: false,
        dewPoint: false,
        hideWithNoRain: false,
        debug: false
    },
    msg: "LOADING",

  // Override start method.
    start: function() {
        console.log("Starting module: " + this.name);
        if (![1,5,15,30].includes(this.config.forecastSteps)) { this.config.forecastSteps = 5; }
        this.sendSocketNotification("RAIN_REQUEST", this.config);
    },

  // Define required scripts. Highcharts needed for the graph.
    getScripts: function() {
        return [
            'modules/MMM-RainCast/node_modules/highcharts/highstock.js',
            'modules/MMM-RainCast/node_modules/highcharts/highcharts-more.js',
        ];
    },

  // Define required styles.
    getStyles: function() {
        return ["raincast.css"];
    },

    getTranslations: function() {
        return {
            en: "translations/en.json",
            nl: "translations/nl.json",
            de: "translations/de.json"
        };
    },

    socketNotificationReceived: function(notification, payload) {
        this.log("Socket Notification received: " + notification);

        // was not able to receive data
        if (notification == "ERROR") {
            this.msg = payload;
            this.updateDom();
        } else if (notification == "RAIN_DATA") {
            this.log(payload);
            this.processData(payload);
        }
    },


    processData: function(payload) {
        var endOfForecast = moment().add(this.config.forecastHours, "hours").format("x");
        var rainData = {
            times: [],
            rain: [],
            completeRain: 0,
            cloudCover: [],
            pressure: [],
            visibility: [],
            windSpeed: [],
            windGust: [],
            windDirection: [],
            rainProb: [],
            temp: [],
            startRain: 0,
            endRain: 0,
            maxRain: 0,
            minWind: [0, 0],
            maxWind: [0, 0],
            appTemp: []
        };
        var i = 0;
        var rainStarted = false;
        var rainEnded = false;
        if (payload.data) {
            var apiData = payload.data.timelines[0].intervals;           
            for (let i = 0; i < apiData.length; i++) {
                var time = parseInt(moment(apiData[i].startTime).format("x"));
                if (time < endOfForecast) {
                    var values = apiData[i].values;
                    var segmentRain = values.precipitationIntensity;
                    rainData.times.push(time);
                    rainData.rain.push([time, segmentRain]);
                    rainData.completeRain += segmentRain;
                    rainData.cloudCover.push([time, values.cloudCover]);
                    rainData.pressure.push([time, values.pressureSurfaceLevel]);
                    rainData.visibility.push([time, values.visibility]);
                    rainData.windSpeed.push([time, values.windSpeed, values.windGust]);
                    rainData.windGust.push([time, values.windGust]);
                    rainData.windDirection.push([time, values.windDirection]);
                    rainData.rainProb.push([time, values.precipitationProbability]);
                    rainData.temp.push([time, values.temperature]);
                    rainData.appTemp.push([time, values.temperatureApparent]);
                    rainData.maxRain = Math.max(rainData.maxRain, segmentRain);
                    if (!rainStarted && segmentRain > 0 && !rainEnded) {
                        rainStarted = true;
                        rainData.startRain = time
                    } else if (rainStarted && segmentRain == 0) {
                        rainStarted = false;
                        rainEnded = true;
                        rainData.endRain = time;
                    }
                }
            }      
        } else {
            var apiData = payload;           
            for (let i = 0; i < apiData.length; i++) {
                var time = apiData[i].timestamp * 1000; 
                if (time < endOfForecast) {
                    var dbz = Math.max(0, parseInt(apiData[i].dbz));
                    var z = Math.pow(10,(dbz/10));
                    var segmentRain = Math.pow(z/256, (1/1.42));
                    if (segmentRain < 0.1) segmentRain = 0;
                    rainData.times.push(time);
                    rainData.rain.push([time, segmentRain]);
                    rainData.completeRain += segmentRain;
                    rainData.maxRain = Math.max(rainData.maxRain, segmentRain);
                    if (!rainStarted && segmentRain > 0 && !rainEnded) {
                        rainStarted = true;
                        rainData.startRain = time
                    } else if (rainStarted && segmentRain == 0 && !rainEnded) {
                        //rainStarted = false;
                        rainEnded = true;
                        rainData.endRain = time;
                    }
                }
            }            
        }
        this.log(rainData);

        if (!rainData.times || rainData.times.length === 0) {
            this.log("Wrong or no data received: " + rainData);
            this.msg = this.translate("NODATA");
        } else if (rainData.completeRain < 0.01) {
            //no rain calculated in node_helper.js
            this.log("No rain expected before " + moment(rainData.times[rainData.times.length-1]).format("LT"));
            this.msg = this.translate("NORAIN") + moment(rainData.times[rainData.times.length-1]).format("LT");
            if (this.config.hideWithNoRain) {
                document.getElementById("rainGraph").style.display = "none"
            } else {
                this.drawChart(rainData)
            }
        } else {
            var
                rain = this.translate("RAIN"),
                starts_at = this.translate("STARTS_AT"),
                and = this.translate("AND"),
                ends_at = this.translate("ENDS_AT");
            this.msg = rain;
            if (rainData.startRain >= parseInt(moment().add(5, "minutes").format("x"))) {
                this.msg += (starts_at + moment(rainData.startRain).format("LT"));
                if (rainData.endRain > rainData.startRain) {
                    this.msg += (and + ends_at + moment(rainData.endRain).format("LT"));
                }
            } else if (rainData.startRain < parseInt(moment().add(5, "minutes").format("x")) < rainData.endRain) {
                this.msg += (ends_at + moment(rainData.endRain).format("LT"));
            } /*else {
                this.msg = "";
            }*/
            this.log("Drawing rain graph");
            this.drawChart(rainData);
        }
        var msgWrapper = document.getElementById("rainforecast-msg");
        msgWrapper.innerHTML = this.msg;
    },

    // Override dom generator.
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "rainWrapper";
        wrapper.width = this.config.width;
        var msgWrapper = document.createElement("div");
        msgWrapper.id = "rainforecast-msg";
        msgWrapper.style.width = this.config.width + "px";
        msgWrapper.className = "small";
        msgWrapper.innerHTML = this.msg;
        wrapper.appendChild(msgWrapper);
        var graph = document.createElement("div");
        graph.className = "small thin light";
        graph.id = "rainGraph";
        graph.height = this.config.height + "px";
        graph.width = this.config.width + "px";
        graph.style.display = "none";
        wrapper.appendChild(graph);
        return wrapper;
    },



    /* Draw chart using highcharts node module
    * For config options visit https://api.highcharts.com/highcharts
    */
    drawChart: function(data) {

        this.log(this.config);

        var graph = document.getElementById("rainGraph");
        graph.style.display = "block";
        /*graph.width = this.config.width;
        graph.height = this.config.height;*/

        var weatherData = [{
            data: data.rain,
            lineColor: this.config.chartFillColor,
            fillColor: this.config.chartFillColor,
        }];

        /*if (this.config.temperature) {
            weatherData.push({
                type: 'line',
                yAxis: 1,
                data: data.temp
            });
        };

        if (this.config.pressure) {
            weatherData.push({
                type: 'line',
                yAxis: 2,
                data: data.pressure
            });
        };

        if (this.config.wind) {
            weatherData.push({
                type: 'arearange',
                yAxis: 3,
                data: data.windSpeed
            });
        };

        if (this.config.dewPoint) {
            weatherData.push({
                type: 'line',
                yAxis: 4,
                data: data.dewPoint
            });
        };*/

        this.log(weatherData);

        Highcharts.chart("rainGraph", {
            chart: {
                type: (this.config.chartType === 'bar') ? 'column' : 'areaspline',
                backgroundColor: '#000',
                width: this.config.width,
                height: this.config.height,
                plotBackgroundColor: '#000',
                plotBorderWidth: '0',
                style: {
                  fontSize: "0.9em",
                  fontColor: "#eee",
                }
            },
            time: {
                useUTC: false,
            },
            title: {
                //enabled: false,
                text: undefined,
                //align: 'left'
            },
            legend: {
                enabled: false
            },
            credits: {
                enabled: false
            },
            xAxis: {
                type: 'datetime',
                tickInterval: 1000 * 60 * 30,
                labels: {
                    overflow: 'justify',
                    style: {
                        fontSize: '1em',
                        fontColor: '#eee'
                    }
                },
                gridLineColor: '#aaaaaa',
                gridLineDashStyle: 'longdash',
                gridLineWidth: 1
            },
            yAxis: [
            // RAIN
            {
                labels: {
                    enabled: false,
                    style: {
                        fontSize: '1em'
                    }
                },
                title: {
                    text: null
                },
                min: 0,
                startOnTick: false,
                //height: '200px',
                softMax: this.config.forecastSteps / 20,
                minorGridLineWidth: 0,
                gridLineWidth: 0,
                //alternateGridColor: null,
                //Light rain — when the precipitation rate is < 2.5 mm (0.098 in) per hour
                //Moderate rain — when the precipitation rate is between 2.5 mm (0.098 in) - 7.6 mm (0.30 in) or 10 mm (0.39 in) per hour[106][107]
                //Heavy rain — when the precipitation rate is > 7.6 mm (0.30 in) per hour,[106] or between 10 mm (0.39 in) and 50 mm (2.0 in) per hour[107]
                //Violent rain — when the precipitation rate is > 50 mm (2.0 in) per hour[107]
                plotLines: [
                    {
                        value: 2.5*(this.config.forecastSteps/60),
                        color: this.config.rainIconColor,
                        width: 3,
                        zIndex: 5,
                        label: {
                            useHTML: true,
                            text: '<img src=' + this.file('icons/rain_light.svg') + ' height="' + this.config.iconHeight +'" >',
                            style: {
                            color: this.config.rainIconColor
                        }
                    }
                    }, {
                        value: 7.6*(this.config.forecastSteps/60),
                        color: this.config.rainIconColor,
                        width: 3,
                        zIndex: 5,
                        label: {
                            useHTML: true,
                            text: '<img src=' + this.file('icons/rain_medium.svg') + ' height="' + this.config.iconHeight +'" >',
                            style: {
                                 color: this.config.rainIconColor
                            }
                        }
                    }, {
                        value: 25*(this.config.forecastSteps/60),
                        color: this.config.rainIconColor,
                        width: 3,
                        zIndex: 5,
                        label: {
                            useHTML: true,
                            text: '<img src=' + this.file('icons/rain_heavy.svg') + ' height="' + this.config.iconHeight +'" >',
                            style: {
                                color: this.config.rainIconColor
                            }
                        }
                    }
                ]
            }
            // TEMPERATURE
            /*{
                labels: {
                    enabled: false,
                    title: undefined,
                    style: {
                        fontSize: '1em'
                    }
                },
                top: '200px',//this.config.height - 50 * (weatherData.length-1),
                height: '50px',
                title: {
                    text: null
                },
                softMax: 15,
            },
            // PRESSURE
            {
                labels: {
                    enabled: false,
                    title: undefined,
                    style: {
                        fontSize: '1em'
                    }
                },
                top: '250px', //this.config.height - 100 * (weatherData.length-1),
                height: '50px',
                title: {
                    text: null
                },
            },
            // windSpeed
            {
                labels: {
                    enabled: false,
                    title: undefined,
                    style: {
                        fontSize: '1em'
                    }
                },
                top: this.config.height - 150 * (weatherData.length-1),
                height: 50,
                title: {
                    text: null
                },
            },
            // DEW POINT
            {
                labels: {
                    enabled: false,
                    //title: undefined,
                    style: {
                        fontSize: '1em'
                    }
                },
                top: this.config.height - 200 * (weatherData.length-1),
                height: 50,
                title: {
                    text: null
                },
            }*/
            ],
            plotOptions: {
                areaspline: {
                    lineWidth: 3,
                    marker: {
                        enabled: false
                    },
                },
                arearange: {
                    lineWidth: 2,
                    marker: {
                        enabled: false
                    },
                    lineColor: 'grey',
                    fillColor: 'rgba(250,250,250,0.2)'
                },
                column: {
                    pointPadding: 0.05,
                    groupPadding: 0,
                    borderWidth: 0,
                }
            },
            series: weatherData,
            navigation: {
                enabled: false,
            },
        });
    },

    log: function (msg) {
        if (this.config && this.config.debug) {
            console.log(this.name + ": ", (msg));
        }
    }
});
