const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
  socketNotificationReceived: function(notification, payload) {
    if (notification !== "FETCH_DEPARTURES") {
      return;
    }

    if (!payload || !payload.apiKey || !Array.isArray(payload.stations)) {
      console.error(this.name + ": missing apiKey or stations array");
      return;
    }

    payload.stations.forEach((station) => {
      if (station && station.id) {
        this.fetchDepartures(payload.apiKey, station);
      }
    });
  },

  fetchDepartures: function(apiKey, station) {
    const stationId = encodeURIComponent(station.id);
    const key = encodeURIComponent(apiKey);
    const url = `https://realtime-api.trafiklab.se/v1/departures/${stationId}?key=${key}`;
    const self = this;

    https.get(url, function(res) {
      let data = "";

      res.on("data", function(chunk) {
        data += chunk;
      });

      res.on("end", function() {
        if (res.statusCode !== 200) {
          console.error(self.name + `: trafiklab response ${res.statusCode} for station ${station.id}`);
          return;
        }

        try {
          const json = JSON.parse(data);
          const departures = (Array.isArray(json.departures) ? json.departures : [])
            .filter((dep) => {
              if (!Array.isArray(station.modes) || station.modes.length === 0) {
                return true;
              }
              const mode = dep && dep.route ? String(dep.route.transport_mode || "").toUpperCase() : "";
              return station.modes.map((m) => String(m).toUpperCase()).includes(mode);
            })
            .map((dep) => {
              const realtime = dep.realtime || dep.scheduled || "";
              const time = typeof realtime === "string" && realtime.length >= 16 ? realtime.substring(11, 16) : "";
              return {
                line: dep.route ? dep.route.designation : "",
                direction: dep.route ? dep.route.direction : "",
                time: time,
                delay: Number(dep.delay) || 0
              };
            });

          self.sendSocketNotification("DEPARTURES_DATA", {
            stationId: station.id,
            stationName: station.name || station.id,
            departures: departures
          });
        } catch (e) {
          console.error(self.name + " parse error:", e);
        }
      });
    }).on("error", function(e) {
      console.error(self.name + " fetch error:", e);
    });
  }
});
