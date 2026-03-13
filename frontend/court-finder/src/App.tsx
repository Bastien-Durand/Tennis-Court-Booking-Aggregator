import { useState, useEffect } from "react";
import styles from "./App.module.css";

type Slot = {
  time: string;
  link: string;
};

type Venue = {
  client_id: string;
  name: string;
  suburb: string;
  courts: Record<string, Slot[]>;
};

function App() {
  const [venueData, setVenueData] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<number>(0);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  });

  const getData = async (): Promise<void> => {
    const url = `${import.meta.env.VITE_API_URL}/availability?date=${date}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const result = await response.json();
      setVenueData(result);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    getData();
  }, [date]);

  const formatDate = (dateStr: string): string => {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const changeDate = (direction: number): void => {
    const year = parseInt(date.slice(0, 4));
    const month = parseInt(date.slice(4, 6)) - 1;
    const day = parseInt(date.slice(6, 8));
    const d = new Date(year, month, day + direction);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 7);

    if (d < today || d > maxDate) return;

    const newDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    setDate(newDate);
    setSelectedVenue(0);
  };

  if (venueData.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading availability...</p>
      </div>
    );
  }

  const venue = venueData[selectedVenue];
  const courtNames = Object.keys(venue.courts);

  const allTimes: string[] = [];
  Object.values(venue.courts).forEach((slots) => {
    slots.forEach((slot) => {
      if (!allTimes.includes(slot.time)) {
        allTimes.push(slot.time);
      }
    });
  });

  allTimes.sort((a, b) => {
    const toMinutes = (t: string): number => {
      const [time, period] = [t.slice(0, -2), t.slice(-2)];
      let [hours, minutes] = time.split(":").map(Number);
      if (period === "pm" && hours !== 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    return toMinutes(a) - toMinutes(b);
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Court<span className={styles.titleAccent}>Finder</span>
        </h1>
        <div className={styles.dateNav}>
          <button className={styles.dateBtn} onClick={() => changeDate(-1)}>
            ← Prev
          </button>
          <div className={styles.currentDate}>{formatDate(date)}</div>
          <button className={styles.dateBtn} onClick={() => changeDate(1)}>
            Next →
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {venueData.map((v, index) => (
          <button
            key={v.client_id}
            onClick={() => setSelectedVenue(index)}
            className={`${styles.tab} ${index === selectedVenue ? styles.tabActive : ""}`}
          >
            {v.name}
            <span className={styles.tabSuburb}>{v.suburb}</span>
          </button>
        ))}
      </div>

      <div className={styles.venueInfo}>
        <div>
          <div className={styles.venueName}>{venue.name}</div>
          <div className={styles.venueMeta}>
            {venue.suburb} · {courtNames.length} Courts
          </div>
        </div>
        <div className={styles.legend}>
          <span>
            <span
              className={`${styles.legendDot} ${styles.legendAvailable}`}
            ></span>{" "}
            Available
          </span>
          <span>
            <span
              className={`${styles.legendDot} ${styles.legendUnavailable}`}
            ></span>{" "}
            Booked
          </span>
        </div>
      </div>

      <div className={styles.gridCard}>
        <table className={styles.grid}>
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
                        <a
                          href={slot.link}
                          target="_blank"
                          className={styles.available}
                        >
                          <div className={styles.dot}>
                            <div className={styles.dotInner}></div>
                          </div>
                        </a>
                      ) : (
                        <span className={styles.unavailable}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.summaryBar}>
        <div>
          <div className={styles.summaryLabel}>Available Slots</div>
          <div className={`${styles.summaryValue} ${styles.summaryHighlight}`}>
            {Object.values(venue.courts).reduce(
              (sum, times) => sum + times.length,
              0,
            )}
          </div>
        </div>
        <div>
          <div className={styles.summaryLabel}>Total Courts</div>
          <div className={styles.summaryValue}>{courtNames.length}</div>
        </div>
        <div>
          <div className={styles.summaryLabel}>Best Availability</div>
          <div className={styles.summaryValue}>
            {allTimes.length > 0
              ? `${allTimes[0]} – ${allTimes[allTimes.length - 1]}`
              : "None"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
