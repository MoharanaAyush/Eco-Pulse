const API_URL = import.meta.env.VITE_API_URL || "";

import { useEffect, useMemo, useState } from "react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [readings, setReadings] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [resource, setResource] = useState("energy");
  const [location, setLocation] = useState("");
  const [value, setValue] = useState("");

  const [filterResource, setFilterResource] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const r1 = await fetch(`${API_URL}/api/readings`);
      const r2 = await fetch(`${API_URL}/api/anomalies`);

      if (!r1.ok || !r2.ok) {
        throw new Error("Failed to load data");
      }

      const readingsData = await r1.json();
      const anomaliesData = await r2.json();

      setReadings(readingsData);
      setAnomalies(anomaliesData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const addReading = async (e) => {
    e.preventDefault();

    if (!location || !value) {
      alert("Please enter location and value");
      return;
    }

    let unit = "kWh";

    if (resource === "water") {
      unit = "L";
    }

    if (resource === "waste") {
      unit = "kg";
    }

    try {
      const response = await fetch(`${API_URL}/api/readings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resource,
          location,
          value: Number(value),
          unit
        })
      });

      if (!response.ok) {
        throw new Error("Failed to add reading");
      }

      setLocation("");
      setValue("");

      await loadData();

      alert("Reading added successfully!");
    } catch (error) {
      console.log(error);
      alert("Failed to add reading");
    }
  };

  const allLocations = [
    ...new Set(readings.map((item) => item.location))
  ];

  const filteredReadings = useMemo(() => {
    return readings.filter((item) => {
      const matchesResource =
        filterResource === "all" ||
        item.resource === filterResource;

      const matchesLocation =
        filterLocation === "all" ||
        item.location === filterLocation;

      const searchText = search.toLowerCase();

      const matchesSearch =
        !search ||
        item.resource.toLowerCase().includes(searchText) ||
        item.location.toLowerCase().includes(searchText) ||
        String(item.value).includes(searchText);

      return (
        matchesResource &&
        matchesLocation &&
        matchesSearch
      );
    });
  }, [
    readings,
    filterResource,
    filterLocation,
    search
  ]);

  const totalEnergy = readings
    .filter((item) => item.resource === "energy")
    .reduce(
      (sum, item) => sum + Number(item.value),
      0
    );

  const totalWater = readings
    .filter((item) => item.resource === "water")
    .reduce(
      (sum, item) => sum + Number(item.value),
      0
    );

  const totalWaste = readings
    .filter((item) => item.resource === "waste")
    .reduce(
      (sum, item) => sum + Number(item.value),
      0
    );

  const averageEnergy =
    readings.filter(
      (item) => item.resource === "energy"
    ).length > 0
      ? totalEnergy /
        readings.filter(
          (item) => item.resource === "energy"
        ).length
      : 0;

  const averageWater =
    readings.filter(
      (item) => item.resource === "water"
    ).length > 0
      ? totalWater /
        readings.filter(
          (item) => item.resource === "water"
        ).length
      : 0;

  const averageWaste =
    readings.filter(
      (item) => item.resource === "waste"
    ).length > 0
      ? totalWaste /
        readings.filter(
          (item) => item.resource === "waste"
        ).length
      : 0;

  const locationData = allLocations.map((loc) => {
    const locationReadings = readings.filter(
      (item) => item.location === loc
    );

    const energy = locationReadings
      .filter((item) => item.resource === "energy")
      .reduce(
        (sum, item) => sum + Number(item.value),
        0
      );

    const water = locationReadings
      .filter((item) => item.resource === "water")
      .reduce(
        (sum, item) => sum + Number(item.value),
        0
      );

    const waste = locationReadings
      .filter((item) => item.resource === "waste")
      .reduce(
        (sum, item) => sum + Number(item.value),
        0
      );

    const hasAnomaly = anomalies.some(
      (item) => item.location === loc
    );

    return {
      location: loc,
      energy,
      water,
      waste,
      hasAnomaly
    };
  });

  const energyReadings = filteredReadings
    .filter((item) => item.resource === "energy")
    .slice()
    .reverse();

  const waterReadings = filteredReadings
    .filter((item) => item.resource === "water")
    .slice()
    .reverse();

  const wasteReadings = filteredReadings
    .filter((item) => item.resource === "waste")
    .slice()
    .reverse();

  const energyChartData = {
    labels: energyReadings.map((item) =>
      new Date(item.timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Energy Usage (kWh)",
        data: energyReadings.map((item) => item.value),
        tension: 0.3
      }
    ]
  };

  const waterChartData = {
    labels: waterReadings.map((item) =>
      new Date(item.timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Water Usage (L)",
        data: waterReadings.map((item) => item.value),
        tension: 0.3
      }
    ]
  };

  const wasteChartData = {
    labels: wasteReadings.map((item) =>
      new Date(item.timestamp).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Waste Generated (kg)",
        data: wasteReadings.map((item) => item.value),
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const getAnomalyExplanation = (item) => {
    const resourceReadings = readings.filter(
      (reading) => reading.resource === item.resource
    );

    if (resourceReadings.length === 0) {
      return "Unusual resource consumption detected.";
    }

    const average =
      resourceReadings.reduce(
        (sum, reading) =>
          sum + Number(reading.value),
        0
      ) / resourceReadings.length;

    const current = Number(item.value);

    if (current > average) {
      const percentage =
        ((current - average) / average) * 100;

      return `This reading is approximately ${percentage.toFixed(
        1
      )}% above the average ${item.resource} consumption.`;
    }

    return "This reading was identified as unusual by the anomaly detection system.";
  };

  const exportCSV = () => {
    if (filteredReadings.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Resource",
      "Location",
      "Value",
      "Unit",
      "Timestamp"
    ];

    const rows = filteredReadings.map((item) => [
      item.resource,
      item.location,
      item.value,
      item.unit,
      new Date(item.timestamp).toLocaleString()
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "ecopulse-readings.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterResource("all");
    setFilterLocation("all");
    setSearch("");
  };

  return (
    <div className="app">
      <header className="top-header">
        <div>
          <h1>EcoPulse</h1>
          <p>
            Sustainable Resource Monitoring &
            Anomaly Detection
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      <div className="stats">
        <div className="card">
          <h3>Total Readings</h3>
          <strong>{readings.length}</strong>
        </div>

        <div className="card">
          <h3>Anomalies</h3>
          <strong>{anomalies.length}</strong>
        </div>

        <div className="card">
          <h3>Locations</h3>
          <strong>{allLocations.length}</strong>
        </div>

        <div className="card">
          <h3>Energy</h3>
          <strong>
            {totalEnergy.toFixed(1)} kWh
          </strong>
        </div>

        <div className="card">
          <h3>Water</h3>
          <strong>
            {totalWater.toFixed(1)} L
          </strong>
        </div>

        <div className="card">
          <h3>Waste</h3>
          <strong>
            {totalWaste.toFixed(1)} kg
          </strong>
        </div>
      </div>

      <section>
        <h2>Add Resource Reading</h2>

        <form
          className="reading-form"
          onSubmit={addReading}
        >
          <div>
            <label>Resource</label>

            <select
              value={resource}
              onChange={(e) =>
                setResource(e.target.value)
              }
            >
              <option value="energy">
                Energy
              </option>

              <option value="water">
                Water
              </option>

              <option value="waste">
                Waste
              </option>
            </select>
          </div>

          <div>
            <label>Location</label>

            <input
              type="text"
              placeholder="Example: Block A"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            />
          </div>

          <div>
            <label>Value</label>

            <input
              type="number"
              min="0"
              placeholder="Example: 150"
              value={value}
              onChange={(e) =>
                setValue(e.target.value)
              }
            />
          </div>

          <button type="submit">
            Add Reading
          </button>
        </form>
      </section>

      <section>
        <div className="section-header">
          <div>
            <h2>Resource Filters</h2>

            <p>
              Search and filter resource
              consumption data
            </p>
          </div>

          <button
            className="export-button"
            onClick={exportCSV}
          >
            📥 Export CSV
          </button>
        </div>

        <div className="filters">
          <div>
            <label>Search</label>

            <input
              type="text"
              placeholder="Search location, resource..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div>
            <label>Resource</label>

            <select
              value={filterResource}
              onChange={(e) =>
                setFilterResource(e.target.value)
              }
            >
              <option value="all">
                All Resources
              </option>

              <option value="energy">
                Energy
              </option>

              <option value="water">
                Water
              </option>

              <option value="waste">
                Waste
              </option>
            </select>
          </div>

          <div>
            <label>Location</label>

            <select
              value={filterLocation}
              onChange={(e) =>
                setFilterLocation(e.target.value)
              }
            >
              <option value="all">
                All Locations
              </option>

              {allLocations.map((loc) => (
                <option
                  value={loc}
                  key={loc}
                >
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <button
            className="clear-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        <p className="filter-result">
          Showing{" "}
          <strong>
            {filteredReadings.length}
          </strong>{" "}
          of{" "}
          <strong>
            {readings.length}
          </strong>{" "}
          readings
        </p>
      </section>

      <section>
        <h2>Location Overview</h2>

        <div className="location-grid">
          {locationData.map((item) => (
            <div
              className={`location-card ${
                item.hasAnomaly
                  ? "location-alert"
                  : ""
              }`}
              key={item.location}
            >
              <div className="location-header">
                <h3>{item.location}</h3>

                <span
                  className={
                    item.hasAnomaly
                      ? "status anomaly-status"
                      : "status normal-status"
                  }
                >
                  {item.hasAnomaly
                    ? "⚠ Anomaly"
                    : "✓ Normal"}
                </span>
              </div>

              <div className="location-stats">
                <div>
                  <span>Energy</span>

                  <strong>
                    {item.energy.toFixed(1)} kWh
                  </strong>
                </div>

                <div>
                  <span>Water</span>

                  <strong>
                    {item.water.toFixed(1)} L
                  </strong>
                </div>

                <div>
                  <span>Waste</span>

                  <strong>
                    {item.waste.toFixed(1)} kg
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Energy Usage</h2>

        <div className="chart-container">
          <Line
            data={energyChartData}
            options={chartOptions}
          />
        </div>
      </section>

      <section>
        <h2>Water Usage</h2>

        <div className="chart-container">
          <Line
            data={waterChartData}
            options={chartOptions}
          />
        </div>
      </section>

      <section>
        <h2>Waste Generation</h2>

        <div className="chart-container">
          <Line
            data={wasteChartData}
            options={chartOptions}
          />
        </div>
      </section>

      <section>
        <div className="section-header">
          <div>
            <h2>Resource Readings</h2>

            <p>
              Live resource consumption data
            </p>
          </div>

          <strong>
            {filteredReadings.length} Records
          </strong>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Location</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Timestamp</th>
              </tr>
            </thead>

            <tbody>
              {filteredReadings.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "30px"
                    }}
                  >
                    No readings found.
                  </td>
                </tr>
              ) : (
                filteredReadings
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <tr
                      key={item.id || index}
                    >
                      <td>
                        {item.resource}
                      </td>

                      <td>
                        {item.location}
                      </td>

                      <td>
                        {item.value}
                      </td>

                      <td>
                        {item.unit}
                      </td>

                      <td>
                        {new Date(
                          item.timestamp
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="section-header">
          <div>
            <h2>
              Anomalies Detected
            </h2>

            <p>
              Unusual resource consumption
              identified by EcoPulse
            </p>
          </div>

          <div className="alert-count">
            {anomalies.length} Alert
            {anomalies.length !== 1
              ? "s"
              : ""}
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div className="no-anomaly">
            <strong>
              ✓ All systems normal
            </strong>

            <p>
              No unusual resource
              consumption detected.
            </p>
          </div>
        ) : (
          <div className="anomaly-list">
            {anomalies.map(
              (item, index) => (
                <div
                  className="anomaly"
                  key={index}
                >
                  <div className="anomaly-icon">
                    !
                  </div>

                  <div className="anomaly-info">
                    <div className="anomaly-title">
                      <strong>
                        ANOMALY DETECTED
                      </strong>

                      <span>
                        {item.resource.toUpperCase()}
                      </span>
                    </div>

                    <p>
                      Location:{" "}
                      <strong>
                        {item.location}
                      </strong>
                    </p>

                    <p>
                      {item.message}
                    </p>

                    <p>
                      <strong>
                        🧠 Analysis:
                      </strong>{" "}
                      {getAnomalyExplanation(
                        item
                      )}
                    </p>
                  </div>

                  <div className="anomaly-value">
                    <strong>
                      {item.value}{" "}
                      {item.unit}
                    </strong>

                    <small>
                      {new Date(
                        item.timestamp
                      ).toLocaleString()}
                    </small>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <h2>Consumption Insights</h2>

        <div className="insight-grid">
          <div className="insight-card">
            <h3>⚡ Energy</h3>

            <p>
              Average reading:
            </p>

            <strong>
              {averageEnergy.toFixed(1)} kWh
            </strong>
          </div>

          <div className="insight-card">
            <h3>💧 Water</h3>

            <p>
              Average reading:
            </p>

            <strong>
              {averageWater.toFixed(1)} L
            </strong>
          </div>

          <div className="insight-card">
            <h3>♻ Waste</h3>

            <p>
              Average reading:
            </p>

            <strong>
              {averageWaste.toFixed(1)} kg
            </strong>
          </div>
        </div>
      </section>

      <footer className="footer">
        <strong>
          EcoPulse
        </strong>

        <span>
          Sustainable Resource Monitoring
          Platform
        </span>
      </footer>
    </div>
  );
}

export default App;