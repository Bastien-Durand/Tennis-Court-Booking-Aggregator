import { useState } from "react";
import { useEffect } from "react";
import "./App.css";

function App() {
  const [venueData, setVenueData] = useState([]);

  async function getData() {
    const url = "http://localhost:5001/availability";
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const result = await response.json();
      setVenueData(result);
      console.log(result);
    } catch (error) {
      console.error(error.message);
    }
  }

  useEffect(() => {
    getData();
  }, []);

  return (
    <div>
      <h1>Local Tennis Court Bookings</h1>
      {venueData.length > 0 &&
        venueData.map((item) => {
          return (
            <div key={item.client_id}>
              <h2>
                {item.name} - {item.suburb}
              </h2>
              {item.slots.map((booking) => (
                <p>
                  {booking.court} - {booking.time}
                </p>
              ))}
              ;
            </div>
          );
        })}
    </div>
  );
}

export default App;
