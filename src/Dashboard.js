
import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO, isWithinInterval, addDays } from "date-fns";
import { FaBars, FaSignOutAlt } from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { color } from "chart.js/helpers";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === "admin123@gmail.com" && password === "admin@123") {
      onLogin();
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div style={loginStyles.container}>
      <h2 style={loginStyles.heading}>Login</h2>
      {error && <p style={loginStyles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={loginStyles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={loginStyles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={loginStyles.input}
        />
        <button type="submit" style={loginStyles.button}>
          Login
        </button>
      </form>
    </div>
  );
};

const Dashboard = ({ onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredTableData, setFilteredTableData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    reservations: 0,
    upcomingReservations: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState("+15037483026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");

  const phoneNumbers = [
    { value: "+15037483026", label: "+15037483026" },
    { value: "+27872502149", label: "+27872502149" },
    { value: "+27872502261", label: "+27872502261" }
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_RESERVATION_API}/?phone=${selectedPhone}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const apiData = await response.json();

      // Check if data exists
      if (!apiData) {
        throw new Error("No data received");
      }

      processReservationData(apiData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching data:", err);
      setFilteredTableData([]);
      setChartData([]);
      setSummaryStats({
        total: 0,
        reservations: 0,
        upcomingReservations: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(process.env.REACT_APP_API_LAST_UPDATE)
      .then(res => {
        if (!res.ok) {
          throw new Error("Network response was not OK");
        }
        return res.json();
      })
      .then(data => {
        setLastUpdate(data.last_run);
      })
      .catch(err => {
        console.error("Failed to fetch last run:", err);
      });
  }, []);



  const processReservationData = (apiData) => {
    // If the API returns an array, use it directly
    // If it returns a single object, wrap it in an array
    const reservations = Array.isArray(apiData) ? apiData : [apiData];

    setFilteredTableData(reservations);

    // Prepare data for the chart
    const chartDataMap = {};

    reservations.forEach(res => {
      if (!res.reservation_details) return;

      const dateKey = res.reservation_details.reservation_date;
      if (!dateKey) return;

      if (!chartDataMap[dateKey]) {
        chartDataMap[dateKey] = {
          date: dateKey,
          reservations: 0,
          guests: 0
        };
      }

      chartDataMap[dateKey].reservations += 1;
      chartDataMap[dateKey].guests += parseInt(res.reservation_details.number_of_guests) || 0;
    });

    const sortedChartData = Object.values(chartDataMap).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    setChartData(sortedChartData);

    // Calculate summary stats
    const total = reservations.length;
    const today = new Date();
    const upcomingReservations = reservations.filter(res => {
      if (!res.reservation_details) return false;
      const resDate = new Date(`${res.reservation_details.reservation_date}T${res.reservation_details.reservation_time}`);
      return resDate > today;
    }).length;

    setSummaryStats({
      total: total,
      reservations: total,
      upcomingReservations: upcomingReservations
    });
  };

  useEffect(() => {
    fetchData();
  }, [selectedPhone, selectedDate]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div style={{
      display: "flex",
      backgroundColor: "#121212",
      color: "#fff",
      minHeight: "100vh",
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? "250px" : "50px",
        backgroundColor: "#1F1F1F",
        transition: "width 0.3s",
        padding: "20px",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}>
          {sidebarOpen && <h3>Menu</h3>}
          <FaBars onClick={toggleSidebar} style={{ cursor: "pointer" }} />
        </div>

        {sidebarOpen && (
          <div>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li style={{ marginBottom: "10px" }}>Overview</li>
            </ul>
            <button
              onClick={onLogout}
              style={{
                background: "#F44336",
                color: "#fff",
                border: "none",
                padding: "10px",
                borderRadius: "5px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <h1 style={{ color: "#fff" }}>Reservation Overview</h1>

        {/* Phone number dropdown and date picker */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
          <div>
            <label>Select Phone Number: </label>
            <select
              value={selectedPhone}
              onChange={(e) => setSelectedPhone(e.target.value)}
              style={{
                backgroundColor: "#333",
                color: "#fff",
                border: "none",
                padding: "8px",
                borderRadius: "5px",
                marginLeft: "10px"
              }}
            >
              {phoneNumbers.map(phone => (
                <option key={phone.value} value={phone.value}>
                  {phone.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Select a Date: </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              dateFormat="MMM d, yyyy"
              customInput={
                <input
                  style={{
                    backgroundColor: "#333",
                    color: "#fff",
                    border: "none",
                    padding: "5px",
                    borderRadius: "5px",
                    marginLeft: "10px"
                  }}
                />
              }
            />
          </div>

          {lastUpdate && (
            <div style={{ color: "#aaa", fontSize: "14px", marginLeft: "10px" }}>
              Last Update: {lastUpdate}
            </div>
          )}

        </div>

        {loading && <p style={{ color: "#fff" }}>Loading data...</p>}
        {error && <p style={{ color: "#F44336" }}>Error: {error}</p>}

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
          <div style={statBoxStyle}>
            <h3>Total Calls</h3>
            <div style={statValueStyle}>{summaryStats.total}</div>
          </div>
          <div style={statBoxStyle}>
            <h3>Reservations</h3>
            <div style={statValueStyle}>{summaryStats.reservations}</div>
          </div>
          <div style={statBoxStyle}>
            <h3>Upcoming</h3>
            <div style={statValueStyle}>{summaryStats.upcomingReservations}</div>
          </div>
        </div>

        {/* LineChart */}
        {chartData.length > 0 && (
          <div style={{ height: "400px", marginBottom: "30px" }}>
            <h2>Reservation Trends</h2>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                />
                <YAxis
                  stroke="#fff"
                  tick={{ fill: '#fff' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#333',
                    borderColor: '#555',
                    color: '#fff'
                  }}
                />
                <Legend
                  wrapperStyle={{
                    color: '#fff',
                    paddingTop: '20px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="reservations"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Reservations"
                />
                <Line
                  type="monotone"
                  dataKey="guests"
                  stroke="#82ca9d"
                  name="Total Guests"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Call Metadata Table */}
        {filteredTableData.length > 0 && (
          <div style={{
            display: 'flex',
            marginTop: '30px',
            overflowX: 'auto' // For responsive behavior on small screens
          }}>
            {/* Call Metadata Table */}
            <div style={{ flex: 1 }}>
              <h2>Call Information</h2>
              <table style={tableOneStyle}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F5DC', height: '70px' }}> {/* Highlighted header row */}
                    <th style={tableHeaderStyle}>Incoming Phone</th>
                    <th style={tableHeaderStyle}>restaurant Number</th>
                    <th style={tableHeaderStyle}>Call Date</th>
                    <th style={tableHeaderStyle}>Call Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((item, index) => (
                    <tr key={`call-${index}`}>
                      <td style={tableCellStyle}>{item.call_metadata?.incoming_phone_number || 'N/A'}</td>
                      <td style={tableCellStyle}>{item.call_metadata?.to_number || 'N/A'}</td>
                      <td style={tableCellStyle}>{item.call_metadata?.call_date || 'N/A'}</td>
                      <td style={tableCellStyle}>{item.call_metadata?.call_time || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reservation Table */}
            <div style={{ flex: 1 }}>
              <h2>Reservation Details</h2>
              <table style={tableTwoStyle}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', height: '70px' }}> {/* Highlighted header row */}
                    <th style={tableHeaderStyle}>Customer Name</th>
                    <th style={tableHeaderStyle}>Phone</th>
                    <th style={tableHeaderStyle}>Reservation Date</th>
                    <th style={tableHeaderStyle}>Time</th>
                    <th style={tableHeaderStyle}>Guests</th>
                    <th style={tableHeaderStyle}>Allergies</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.map((item, index) => (
                    <tr key={`reservation-${index}`}>
                      <td
                        style={{
                          ...tableCellStyle,
                          width: '220px', // or any width you prefer
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.reservation_details?.customer_name || 'N/A'}
                      </td>                      <td style={{
                        ...tableCellStyle,
                        maxWidth: '120px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{item.reservation_details?.phone_number || 'N/A'}</td>
                      <td style={tableCellStyle}>{item.reservation_details?.reservation_date || 'N/A'}</td>
                      <td style={{
                        ...tableCellStyle,
                        maxWidth: '50px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{item.reservation_details?.reservation_time || 'N/A'}</td>
                      <td style={{
                        ...tableCellStyle,
                        maxWidth: '50px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>{item.reservation_details?.number_of_guests || 'N/A'}</td>
                      <td
                        style={{
                          ...tableCellStyle,
                          maxWidth: '150px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.reservation_details?.allergies || 'None'}
                      </td>                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredTableData.length === 0 && !loading && !error && (
          <p style={{ color: "#fff" }}>No reservation data available</p>
        )}
      </div>
    </div>
  );
};

const loginStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#121212",
    color: "#fff",
  },
  heading: {
    fontSize: "2em",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "300px",
  },
  input: {
    padding: "10px",
    margin: "10px 0",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#333",
    color: "#fff",
  },
  button: {
    padding: "10px",
    margin: "20px 0",
    border: "none",
    borderRadius: "5px",
    backgroundColor: "#4CAF50",
    color: "white",
    cursor: "pointer",
  },
  error: {
    color: "#F44336",
    marginBottom: "10px",
  },
};

const statBoxStyle = {
  backgroundColor: "#1F1F1F",
  padding: "20px",
  borderRadius: "5px",
  textAlign: "center",
};

const statValueStyle = {
  fontSize: "1.5em",
  fontWeight: "bold",
};

const tableOneStyle = {
  width: "100%",
  height: "150px",
  borderCollapse: "collapse",
  marginTop: "20px",
  backgroundColor: "#F5F5DC",
  color: "#000",
};

const tableTwoStyle = {
  width: "fit-content",
  height: "150px",
  borderCollapse: "collapse",
  marginTop: "20px",
  backgroundColor: "#1F1F1F",
};

const tableHeaderStyle = {
  backgroundColor: "#333",
  color: "white",
  padding: "12px",
  border: "1px solid #444",
  textAlign: "left",
};

const tableCellStyle = {
  padding: "10px",
  border: "1px solid #444",
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
