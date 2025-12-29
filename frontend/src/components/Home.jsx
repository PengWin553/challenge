import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to update map center when coordinates change
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 10);
    }, [center, map]);
    return null;
}

const Home = ({ setIsAuthenticated }) => {
    const [geoData, setGeoData] = useState(null);
    const [searchIp, setSearchIp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState([]);
    const [userGeoData, setUserGeoData] = useState(null);
    const [showHistory, setShowHistory] = useState(false); // For mobile toggle

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

            if (!ip && !userGeoData) {
                setUserGeoData(response.data);
            }

            if (ip) {
                fetchHistory();
            }

        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch geolocation');
        } finally {
            setLoading(false);
        }
    }, [userGeoData]);

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
        fetchHistory();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();

        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (!ipRegex.test(searchIp)) {
            setError('Please enter a valid IP address (e.g., 8.8.8.8)');
            return;
        }

        fetchGeoData(searchIp);
        setSearchIp('');
        setShowHistory(false); // Close history on mobile after search
    };

    const handleClear = () => {
        if (userGeoData) {
            setGeoData(userGeoData);
            setError('');
            setSearchIp('');
        }
    };

    const handleHistoryClick = (ip) => {
        fetchGeoData(ip);
        setShowHistory(false); // Close history on mobile
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-lg sticky top-0 z-[1000]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            🌍 IP Geolocation Tracker
                        </h1>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-sm sm:text-base text-gray-700 font-medium">
                                Welcome, <span className="text-indigo-600">{user.email}</span>
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Search Section */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={searchIp}
                            onChange={(e) => setSearchIp(e.target.value)}
                            placeholder="Enter IP address (e.g., 8.8.8.8)"
                            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm sm:text-base"
                        />
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="flex-1 sm:flex-none px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                            >
                                Clear
                            </button>
                        </div>
                    </form>
                    {error && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm sm:text-base">
                            {error}
                        </div>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel - Info and History */}
                    <div className="space-y-6">
                        {/* Geolocation Info */}
                        {loading ? (
                            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading geolocation data...</p>
                            </div>
                        ) : geoData && (
                            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Location Details</h2>
                                    {userGeoData && geoData.query === userGeoData.query && (
                                        <span className="inline-block px-3 py-1 bg-green-500 text-white rounded-full text-xs sm:text-sm font-semibold">
                                            Your Current Location
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">IP Address</p>
                                        <p className="text-base sm:text-lg font-bold text-indigo-600 break-all">{geoData.query}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">Country</p>
                                        <p className="text-base sm:text-lg font-bold text-gray-800">{geoData.country} ({geoData.countryCode})</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">Region</p>
                                        <p className="text-base sm:text-lg font-bold text-gray-800">{geoData.regionName}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">City</p>
                                        <p className="text-base sm:text-lg font-bold text-gray-800">{geoData.city}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg sm:col-span-2">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">ISP</p>
                                        <p className="text-base sm:text-lg font-bold text-gray-800 break-all">{geoData.isp}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">Timezone</p>
                                        <p className="text-base sm:text-lg font-bold text-gray-800">{geoData.timezone}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                                        <p className="text-xs sm:text-sm text-gray-600 font-medium">Coordinates</p>
                                        <p className="text-base sm:text-lg font-bold text-gray-800">{geoData.lat}, {geoData.lon}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* History Section */}
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                                    Search History
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="lg:hidden ml-2 text-indigo-600"
                                    >
                                        {showHistory ? '▼' : '▶'}
                                    </button>
                                </h3>
                                {selectedHistory.length > 0 && (
                                    <button
                                        onClick={handleDeleteHistory}
                                        className="px-3 py-1 sm:px-4 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200"
                                    >
                                        Delete ({selectedHistory.length})
                                    </button>
                                )}
                            </div>

                            <div className={`${showHistory ? 'block' : 'hidden'} lg:block`}>
                                <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-2">
                                    {history.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-sm sm:text-base">No search history yet.</p>
                                            <p className="text-xs sm:text-sm mt-1">Start searching for IP addresses!</p>
                                        </div>
                                    ) : (
                                        history.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${selectedHistory.includes(item.id)
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-gray-200 hover:border-indigo-300'
                                                    }`}
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
                                                    className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm sm:text-base text-gray-900 break-all">{item.ip_address}</p>
                                                    <p className="text-xs sm:text-sm text-gray-600">{item.city}, {item.country}</p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(item.searched_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Map */}
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 h-96 lg:h-full lg:min-h-[600px] relative z-0">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Map View</h3>
                        {geoData && geoData.lat && geoData.lon ? (
                            <div className="h-[calc(100%-2rem)] rounded-lg overflow-hidden shadow-inner relative z-0">
                                <MapContainer
                                    center={[geoData.lat, geoData.lon]}
                                    zoom={10}
                                    style={{ height: '100%', width: '100%' }}
                                    key={`${geoData.lat}-${geoData.lon}`}
                                >
                                    <MapUpdater center={[geoData.lat, geoData.lon]} />
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='© OpenStreetMap contributors'
                                    />
                                    <Marker position={[geoData.lat, geoData.lon]}>
                                        <Popup>
                                            <div className="text-center">
                                                <p className="font-bold">{geoData.city}</p>
                                                <p className="text-sm text-gray-600">{geoData.country}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        ) : (
                            <div className="h-[calc(100%-2rem)] flex items-center justify-center bg-gray-100 rounded-lg">
                                <p className="text-gray-500 text-sm sm:text-base">Map will appear here after search</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;