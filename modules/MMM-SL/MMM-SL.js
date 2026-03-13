Module.register("MMM-SL", {
  defaults: {
    apiKey: "",
    stations: [],
    displayCount: 6,
    updateInterval: 60 * 1000
  },

  start: function() {
    this.departuresByStation = {};
    this.fetchAll();
    this.fetchTimer = setInterval(() => {
      this.fetchAll();
    }, this.config.updateInterval);
  },

  fetchAll: function() {
    if (!this.config.apiKey) {
      return;
    }

    this.sendSocketNotification("FETCH_DEPARTURES", {
      apiKey: this.config.apiKey,
      stations: this.config.stations
    });
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "DEPARTURES_DATA") {
      this.departuresByStation[payload.stationId] = {
        name: payload.stationName,
        departures: payload.departures
      };
      this.updateDom(this.config.animationSpeed);
    }
  },

  getDom: function() {
    const wrapper = document.createElement("div");

    if (!this.config.apiKey) {
      wrapper.innerHTML = "Please set apiKey in MMM-SL config.";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (Object.keys(this.departuresByStation).length === 0) {
      wrapper.innerHTML = "Loading departures...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.gap = "24px";

    this.config.stations.forEach((station) => {
      const stationData = this.departuresByStation[station.id];
      if (!stationData || stationData.departures.length === 0) {
        return;
      }

      const column = document.createElement("div");
      column.style.flex = "1";

      const stationHeader = document.createElement("div");
      stationHeader.innerHTML = stationData.name;
      stationHeader.style.fontWeight = "bold";
      stationHeader.style.marginBottom = "4px";
      stationHeader.className = "bright";
      column.appendChild(stationHeader);

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderSpacing = "0 4px";

      stationData.departures.slice(0, this.config.displayCount).forEach((dep) => {
        const row = document.createElement("tr");

        const lineCell = document.createElement("td");
        lineCell.innerHTML = dep.line || "";
        lineCell.style.paddingRight = "12px";
        lineCell.style.fontWeight = "bold";

        const dirCell = document.createElement("td");
        dirCell.innerHTML = dep.direction || "";
        dirCell.style.paddingRight = "12px";
        dirCell.style.width = "100%";

        const timeCell = document.createElement("td");
        timeCell.innerHTML = dep.time || "";
        timeCell.style.whiteSpace = "nowrap";
        timeCell.className = "bright";

        if (dep.delay > 60) {
          timeCell.style.color = "#ff4444";
        }

        row.appendChild(lineCell);
        row.appendChild(dirCell);
        row.appendChild(timeCell);
        table.appendChild(row);
      });

      column.appendChild(table);
      container.appendChild(column);
    });

    wrapper.appendChild(container);
    return wrapper;
  }
});