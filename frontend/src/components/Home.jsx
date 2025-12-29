import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const Home = ({ setIsAuthenticated }) => {
    const [geoData, setGeoData] = useState(null);
    const [searchIp, setSearchIp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState([]);
    const [userIp, setUserIp] = useState('');

    const fetchGeoData = useCallback(async (ip = '') => {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');

        try {
            const response = await axios.get(
                `http://localhost:8000/api/geo/${ip}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setGeoData(response.data);
            if (!ip) {
                setUserIp(response.data.query);
            }

            // Fetch updated history
            fetchHistory();

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch geolocation');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get('http://localhost:8000/api/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    useEffect(() => {
        fetchGeoData();
    }, [fetchGeoData]);

    const handleSearch = (e) => {
        e.preventDefault();

        // Simple IP validation regex
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (!ipRegex.test(searchIp)) {
            setError('Please enter a valid IP address (e.g., 8.8.8.8)');
            return;
        }

        fetchGeoData(searchIp);
        setSearchIp('');
    };

    const handleClear = () => {
        fetchGeoData();
    };

    const handleHistoryClick = (ip) => {
        fetchGeoData(ip);
    };

    const handleDeleteHistory = async () => {
        if (selectedHistory.length === 0) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete('http://localhost:8000/api/history', {
                headers: { Authorization: `Bearer ${token}` },
                data: { ids: selectedHistory }
            });

            fetchHistory();
            setSelectedHistory([]);
        } catch (err) {
            console.error('Failed to delete history:', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1>IP Geolocation Tracker</h1>
                <div style={styles.userInfo}>
                    <span>Welcome, {user.email}</span>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        Logout
                    </button>
                </div>
            </header>

            <main style={styles.main}>
                <div style={styles.leftPanel}>
                    <div style={styles.searchSection}>
                        <form onSubmit={handleSearch} style={styles.searchForm}>
                            <input
                                type="text"
                                value={searchIp}
                                onChange={(e) => setSearchIp(e.target.value)}
                                placeholder="Enter IP address (e.g., 8.8.8.8)"
                                style={styles.searchInput}
                            />
                            <button type="submit" style={styles.searchButton}>
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                style={styles.clearButton}
                            >
                                Clear
                            </button>
                        </form>
                        {error && <div style={styles.error}>{error}</div>}
                    </div>

                    {loading ? (
                        <div style={styles.loading}>Loading geolocation data...</div>
                    ) : geoData && (
                        <div style={styles.geoInfo}>
                            <h2>Geolocation Information</h2>
                            <div style={styles.infoGrid}>
                                <div style={styles.infoItem}>
                                    <strong>IP Address:</strong>
                                    <span>{geoData.query}</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <strong>Country:</strong>
                                    <span>{geoData.country} ({geoData.countryCode})</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <strong>Region:</strong>
                                    <span>{geoData.regionName}</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <strong>City:</strong>
                                    <span>{geoData.city}</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <strong>ISP:</strong>
                                    <span>{geoData.isp}</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <strong>Timezone:</strong>
                                    <span>{geoData.timezone}</span>
                                </div>
                                <div style={styles.infoItem}>
                                    <strong>Coordinates:</strong>
                                    <span>{geoData.lat}, {geoData.lon}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={styles.historySection}>
                        <div style={styles.historyHeader}>
                            <h3>Search History</h3>
                            {selectedHistory.length > 0 && (
                                <button
                                    onClick={handleDeleteHistory}
                                    style={styles.deleteButton}
                                >
                                    Delete Selected ({selectedHistory.length})
                                </button>
                            )}
                        </div>

                        <div style={styles.historyList}>
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        ...styles.historyItem,
                                        ...(selectedHistory.includes(item.id) ? styles.selectedItem : {})
                                    }}
                                    onClick={() => handleHistoryClick(item.ip_address)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedHistory.includes(item.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedHistory([...selectedHistory, item.id]);
                                            } else {
                                                setSelectedHistory(selectedHistory.filter(id => id !== item.id));
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div style={styles.historyContent}>
                                        <div style={styles.historyIp}>{item.ip_address}</div>
                                        <div style={styles.historyLocation}>
                                            {item.city}, {item.country}
                                        </div>
                                        <div style={styles.historyTime}>
                                            {new Date(item.searched_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={styles.rightPanel}>
                    {geoData && geoData.lat && geoData.lon && (
                        <MapContainer
                            center={[geoData.lat, geoData.lon]}
                            zoom={10}
                            style={styles.map}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© OpenStreetMap contributors'
                            />
                            <Marker position={[geoData.lat, geoData.lon]}>
                                <Popup>
                                    {geoData.city}, {geoData.country}
                                </Popup>
                            </Marker>
                        </MapContainer>
                    )}
                </div>
            </main>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: '#f5f5f5',
    },
    header: {
        background: '#fff',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    logoutButton: {
        padding: '8px 16px',
        background: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    main: {
        display: 'flex',
        height: 'calc(100vh - 80px)',
    },
    leftPanel: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
    },
    rightPanel: {
        flex: 1,
        padding: '20px',
    },
    searchSection: {
        marginBottom: '30px',
    },
    searchForm: {
        display: 'flex',
        gap: '10px',
        marginBottom: '10px',
    },
    searchInput: {
        flex: 1,
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '16px',
    },
    searchButton: {
        padding: '12px 24px',
        background: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    clearButton: {
        padding: '12px 24px',
        background: '#95a5a6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    error: {
        color: '#e74c3c',
        padding: '10px',
        background: '#fadbd8',
        borderRadius: '4px',
        marginTop: '10px',
    },
    loading: {
        padding: '40px',
        textAlign: 'center',
        fontSize: '18px',
        color: '#7f8c8d',
    },
    geoInfo: {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '30px',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '15px',
        marginTop: '15px',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    historySection: {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    historyHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
    },
    deleteButton: {
        padding: '8px 16px',
        background: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    historyList: {
        maxHeight: '300px',
        overflowY: 'auto',
    },
    historyItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    selectedItem: {
        background: '#e3f2fd',
    },
    historyContent: {
        marginLeft: '10px',
    },
    historyIp: {
        fontWeight: 'bold',
        fontSize: '16px',
    },
    historyLocation: {
        color: '#666',
        fontSize: '14px',
    },
    historyTime: {
        color: '#999',
        fontSize: '12px',
    },
    map: {
        height: '100%',
        width: '100%',
        borderRadius: '8px',
    },
};

export default Home;