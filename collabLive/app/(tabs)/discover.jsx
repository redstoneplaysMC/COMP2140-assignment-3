
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Location from 'expo-location';

export default function DiscoverScreen() {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let subscription;

        async function startWatchingLocation() {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    setError('Location permission denied');
                    return;
                }

                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,
                        distanceInterval: 5,
                    },
                    (newLocation) => {
                        setLocation(newLocation.coords);
                    }
                );
            } catch (err) {
                setError(err.message);
            }
        }

        startWatchingLocation();

        return () => {
            subscription?.remove();
        };
    }, []);

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                Discover nearby study groups
            </Text>

            {error ? (
                <Text>{error}</Text>
            ) : location ? (
                <>
                    <Text>Latitude: {location.latitude.toFixed(6)}</Text>
                    <Text>Longitude: {location.longitude.toFixed(6)}</Text>
                    <Text>Accuracy: {location.accuracy?.toFixed(1)} metres</Text>
                </>
            ) : (
                <Text>Getting your location...</Text>
            )}
        </View>
    );
}
