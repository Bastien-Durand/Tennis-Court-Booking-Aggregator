import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [venueData, setVenueData] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(0);

  const getData = async () => {
    const url = "http://localhost:5001/availability";
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const result = await response.json();
      setVenueData(result);
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  if (venueData.length === 0) {
    return <p>Loading...</p>;
  }

  const venue = venueData[selectedVenue];
  const courtNames = Object.keys(venue.courts);

  // Get all unique times across all courts for this venue
  const allTimes = [];
  Object.values(venue.courts).forEach((slots) => {
    slots.forEach((slot) => {
      if (!allTimes.includes(slot.time)) {
        allTimes.push(slot.time);
      }
    });
  });

  // Sort times chronologically
  allTimes.sort((a, b) => {
    const toMinutes = (t) => {
      const [time, period] = [t.slice(0, -2), t.slice(-2)];
      let [hours, minutes] = time.split(":").map(Number);
      if (period === "pm" && hours !== 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    return toMinutes(a) - toMinutes(b);
  });

  return (
    <div>
      <h1>Local Tennis Court Bookings</h1>

      {/* Venue tabs */}
      <div>
        {venueData.map((v, index) => (
          <button
            key={v.client_id}
            onClick={() => setSelectedVenue(index)}
            style={{ fontWeight: index === selectedVenue ? "bold" : "normal" }}
          >
            {v.name}
          </button>
        ))}
      </div>

      <h2>
        {venue.name} - {venue.suburb}
      </h2>

      {/* Grid table */}
      <table>
        <thead>
          <tr>
            <th>Time</th>
            {courtNames.map((court) => (
              <th key={court}>{court}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allTimes.map((time) => (
            <tr key={time}>
              <td>{time}</td>
              {courtNames.map((court) => {
                const slot = venue.courts[court].find((s) => s.time === time);
                return (
                  <td key={court}>
                    {slot ? (
                      <a href={slot.link} target="_blank">
                        ✓
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
