# MMM-RainCast
A <a href="https://github.com/MichMich/MagicMirror">MagicMirror</a> module using the climacell API to forecast rain amounts over the next several hours.


## Updates

1.0.0 2021-03-08
- stable version published.

## Installation
1. Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/lavolp3/MMM-RainCast.git`.
2. Navigate into the module folder and install npm dependencies: `cd MMM-RainCast && npm install`
3. Get a free climacell API Key ![here](https://www.climacell.co/weather-api/)
3. Add the module in `config.js` placing it where you prefer, and include your API Key, latitude and longitude


## Config options

|Option|Description|
|---|---|
|`apiKey`|ClimaCell API Key.<br>Get it [here](https://www.climacell.co/weather-api/)|
|`lat`|The latitude of your position.<br>**Type:** `Float`<br>**Default:** `52.15`|
|`lon`|The longitude of your position.<br>**Type:** `Float`<br>**Default:** `5.55`|
|`width`|Width of the graph<br>**Type:** `Integer`<br>**Default:** `500`|
|`height`|Height of the graph<br>**Type:** `Integer`<br>**Default:** `400`|
|`forecastHours`|Number of hours to forecast, max 6 hours<br>**Type:** `Integer`<br>**Default:** `4`|
|`forecastSteps`|Steps for the forecast interval (in minutes). Choose between `1`, `5` and `15` <br>**Type:** `Integer`<br>**Default:**  `15`|
|`iconHeight`|Height of the weather icons<br>**Type:** `Integer`<br>**Default:**  `40`|
|`chartType`|Determines type of the chart<br>**Type:** `string`<br>**Values:** 'line', 'bar'<br>**Default:**  `"line"`|
|`hideWithNoRain`|Hides the chart when no rain is expected<br>**Type:** `boolean`<br>**Default:**  `true`|
|`debug`|Debug mode (increased console output)<br>**Type:** `boolean`<br>**Default:**  `false`|



Here is an example of an entry in `config.js`
```
{
    module: "MMM-RainCast",
    position: "top_right",   // see mirror setting for options
    header: "RainCast",
    config: {
        apiKey: 'APIKEYHERE',
        lat: 52.222,
        lon: 5.555,
        width: 500,
        forecastHours: 4,
        forecastSteps: 15,
        height: 400,
        hideWithNoRain: true,
        chartType: "line",  //use "line" or "bar"
    }
},
```

## Screenshot
![Screenshot](/rainImage.PNG?raw=true "Predicted rain")


## Notes
Data provided by <a href="https://www.climacell.co/">climacell</a>.

