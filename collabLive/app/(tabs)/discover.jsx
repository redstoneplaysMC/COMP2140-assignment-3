import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useGroup } from '../../lib/group/sharedContext';
import { Asset } from 'expo-asset';
import { apiRequest } from '../../lib/api';
import { commonStyles } from '../../styles/commonstyles';

import useGroupHandler from '../../lib/group/useGroupHandler';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Use a HTML in order to render the map with Leaflet inside the WebView; this is done since it is not easily doable inside of react-native directly.
const RADIUS_METRES = 300;
const MAP_HTML_FILE = require('../../lib/map_html.html');
const PROFILE_KEY = '@collablive/profile';
const GROUP_MEMBERSHIP_KEY = '@collablive/group_membership';


function distanceMetres(a, b) {
    const RADIUS_EARTH = 6371000; // in meters
    const radians = value => value * Math.PI / 180;
    const dLat = radians(b.latitude - a.latitude);
    const dLng = radians(b.longitude - a.longitude);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(a.latitude)) *
        Math.cos(radians(b.latitude)) *
        Math.sin(dLng / 2) ** 2;

    const clampedH = Math.min(1, Math.max(0, h));

    return RADIUS_EARTH * 2 * Math.atan2(
        Math.sqrt(clampedH),
        Math.sqrt(1 - clampedH)
    );
}

export default function DiscoverScreen() {
    const mapRef = useRef(null);
    const [mapHTML, setMapHTML] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [location, setLocation] = useState(null);
    const [groups, setGroups] = useState([]);
    const [error, setError] = useState(null);
    const router = useRouter();
    const [presentations, setPresentations] = useState([]);
    const [loading, setLoading] = useState(false);
    const {
        group,
        attendee,
        setGroup,
        setAttendee,
    } = useGroup();
    const {
        registerAttendee,
    } = useGroupHandler({
        apiRequest,
        PROFILE_KEY,
        GROUP_MEMBERSHIP_KEY,
        group,
        attendee,
        setGroup,
        setAttendee,
        setPresentations,
        setLoading,
    });

    const discoverableGroups = groups.filter(group => {
        const latitude = Number(group.latitude);
        const longitude = Number(group.longitude);

        return (
            group.is_active !== false &&
            group.latitude != null &&
            group.longitude != null &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            !(latitude === 0 && longitude === 0)
        );
    });
    const nearbyCount = location
        ? discoverableGroups.filter(group =>
            distanceMetres(location, {
                latitude: Number(group.latitude),
                longitude: Number(group.longitude),
            }) <= RADIUS_METRES
        ).length
        : 0;

    function handleMapMessage(event) {
        let message;

        try {
            message = JSON.parse(event.nativeEvent.data);
        } catch {
            return;
        }

        if (message.type !== 'select-group') return;

        const selectedGroup = groups.find(
            group => group.group_id === message.groupId
        );

        if (!selectedGroup) return;

        if (!location || distanceMetres(location, {
            latitude: Number(selectedGroup.latitude),
            longitude: Number(selectedGroup.longitude),
        }) > RADIUS_METRES) {
            Alert.alert(
                'Group too far away',
                'You can only join study groups within 300 metres of your current location.'
            );
            return;
        }

        if (group) {
            Alert.alert(
                'Already in a group',
                'Leave your current group before joining another.'
            );
            return;
        }

        Alert.alert(
            'Join study group?',
            `Would you like to join ${selectedGroup.group_name ||
            `Study group ${selectedGroup.group_id}`
            }?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Join',
                    onPress: async () => {
                        try {
                            const presentationId = selectedGroup.presentation_id;

                            if (!presentationId) {
                                Alert.alert(
                                    'Error',
                                    'This study group has no associated presentation.'
                                );
                                return;
                            }

                            // Create exactly one attendee record.
                            const createdAttendee = await registerAttendee(selectedGroup);

                            // Update shared group membership.
                            setGroup(selectedGroup);
                            setAttendee(createdAttendee);

                            // Persist membership for app restarts.
                            await AsyncStorage.setItem(
                                GROUP_MEMBERSHIP_KEY,
                                JSON.stringify({
                                    group: selectedGroup,
                                    attendee: createdAttendee,
                                })
                            );

                            // Navigate to the existing group's presentation.
                            router.replace({
                                pathname: '/presentation',
                                params: {
                                    groupId: String(selectedGroup.group_id),
                                    presentationId: String(presentationId),
                                    attendeeId: String(createdAttendee.attendee_id),
                                },
                            });
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    },
                },
            ]
        );
    }

    useEffect(() => {
        let cancelled = false;
        let subscription;
        let loading = false;

        async function loadMapHTML() {
            try {
                const asset = Asset.fromModule(MAP_HTML_FILE);
                await asset.downloadAsync();

                const html = await FileSystem.readAsStringAsync(
                    asset.localUri || asset.uri
                );

                if (!cancelled) {
                    setMapHTML(html);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to load map HTML:', err);
                    setError('Failed to load map');
                }
            }
        }

        async function loadGroups() {
            if (loading || cancelled) return;
            loading = true;

            try {
                const result = await apiRequest('/study_group');

                console.log(
                    'Study group API response:',
                    JSON.stringify(result, null, 2)
                );

                const records = Array.isArray(result)
                    ? result
                    : Array.isArray(result?.data)
                        ? result.data
                        : [];

                if (!cancelled) {
                    setGroups(records);
                }
            } catch (err) {
                console.error('Failed to load study groups:', err);

                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                loading = false;
            }
        }

        async function startLocationTracking() {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    if (!cancelled) {
                        setError('Location permission denied');
                    }
                    return;
                }

                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 3000,
                        distanceInterval: 5,
                    },
                    position => {
                        if (!cancelled) {
                            setLocation(position.coords);
                            setError(null);
                        }
                    }
                );

                const lastKnown = await Location.getLastKnownPositionAsync({
                    maxAge: 60000,
                    requiredAccuracy: 200,
                });

                if (!cancelled && lastKnown) {
                    setLocation(current => current ?? lastKnown.coords);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            }
        }

        loadMapHTML();
        startLocationTracking();
        loadGroups();

        return () => {
            cancelled = true;
            subscription?.remove();
        };
    }, []);

    useEffect(() => {
        if (!mapReady || !mapRef.current) return;

        const data = JSON.stringify({
            location: location
                ? {
                    latitude: location.latitude,
                    longitude: location.longitude,
                }
                : null,
            groups: discoverableGroups,
        });

        console.log('Sending map data:', data);

        mapRef.current.injectJavaScript(`
        if (typeof window.updateMap === 'function') {
            window.updateMap(${data});
        } else {
            console.error('window.updateMap is not defined');
        }
        true;
    `);
    }, [mapReady, location, discoverableGroups]);

    return (
        <View style={commonStyles.container}>
            <Text style={commonStyles.title}>
                Discover nearby study groups
            </Text>

            {error && <Text style={commonStyles.error}>{error}</Text>}

            {mapHTML !== null && (
                <WebView
                    ref={mapRef}
                    source={{ html: mapHTML }}
                    style={commonStyles.map}
                    onMessage={event => {
                        const message = event.nativeEvent.data;

                        if (message === 'ready') {
                            setMapReady(true);
                            return;
                        }

                        handleMapMessage(event);
                    }}
                    javaScriptEnabled
                    domStorageEnabled
                />
            )}

            <View style={commonStyles.footer}>
                <Text>
                    {location
                        ? `${nearbyCount} study groups nearby`
                        : 'Finding your location...'}
                </Text>
            </View>
        </View>
    );
}

