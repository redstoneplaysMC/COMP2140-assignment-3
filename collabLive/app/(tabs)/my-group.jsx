import { useEffect, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { apiRequest } from '../../lib/api';
import { commonStyles as styles } from '../../styles/commonstyles';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useGroup } from '../../lib/group/sharedContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useGroupHandler from '../../lib/group/useGroupHandler';
import { useAttendeeLocation } from '../../lib/group/locationTracker';
import * as Location from 'expo-location';

const PROFILE_KEY = '@collablive/profile';
const GROUP_MEMBERSHIP_KEY = '@collablive/group_membership';

export default function MyGroupScreen() {
    // MyGroupScreen manages the user's group and presentations.
    // It uses the shared group context and handles group membership restoration, creation, and leaving.
    const router = useRouter();
    const { group, setGroup } = useGroup();
    const [presentations, setPresentations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [attendee, setAttendee] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    // useGroupHandler provides functions to create, leave, and restore group membership.
    const {
        createGroup,
        leaveGroup,
        restoreMembership,
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

    useAttendeeLocation(attendee, apiRequest);

    async function getCurrentLocation() {
        setGettingLocation(true);

        try {
            const { status } =
                await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Location Required', 'Please allow location access.');
                return null;
            }

            const lastKnown = await Location.getLastKnownPositionAsync({
                maxAge: 60000,
                requiredAccuracy: 200,
            });

            if (lastKnown) {
                console.log('Using cached location:', lastKnown.coords);
                setCurrentLocation(lastKnown.coords);

                Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                })
                    .then(position => setCurrentLocation(position.coords))
                    .catch(error => console.warn('Location refresh failed:', error));

                return lastKnown.coords;
            }

            console.log('No cached location; requesting fresh location');

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            console.log('Fresh location:', position.coords);
            setCurrentLocation(position.coords);
            return position.coords;
        } catch (err) {
            console.error('getCurrentLocation failed:', err);
            Alert.alert('Location Error', err.message);
            return null;
        } finally {
            setGettingLocation(false);
        }
    }

    async function loadPresentations() {
        setLoading(true);

        try {
            const result = await apiRequest('/presentation');

            const items = Array.isArray(result)
                ? result
                : Array.isArray(result.data)
                    ? result.data
                    : Array.isArray(result.presentations)
                        ? result.presentations
                        : [];

            setPresentations(
                items.filter(presentation => presentation.published_status === true)
            );
        } catch (error) {
            Alert.alert(
                'Error',
                `Could not load presentations: ${error.message}`
            );
        } finally {
            setLoading(false);
        }
    }

    async function selectPresentation(presentation) {
        if (!group) return;

        const presentationId =
            presentation.presentation_id ?? presentation.id;

        try {
            await apiRequest(`/study_group/${group.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    presentation_id: presentationId,
                }),
            });

            setGroup((currentGroup) => ({
                ...currentGroup,
                presentation_id: presentation.presentation_id ?? presentation.id,
                presentation_title: presentation.title ?? 'Untitled presentation'
            }));

            setPresentations([]);

            Alert.alert(
                'Success',
                `"${presentation.title ?? 'Presentation'}" selected for your group.`
            );
        } catch (error) {
            Alert.alert(
                'Error',
                `Could not select presentation: ${error.message}`
            );
        }
    }

    async function handleCreateGroup() {
        console.log('handleCreateGroup called');

        try {
            const createdGroup = await createGroup();
            console.log('Created group:', createdGroup);

            if (!createdGroup?.id) {
                throw new Error('Group creation did not return a group ID.');
            }

            const coords = await getCurrentLocation();
            console.log('Current coordinates:', coords);

            if (!coords?.latitude || !coords?.longitude) {
                throw new Error('Could not obtain valid coordinates.');
            }

            const updatedGroup = await apiRequest(
                `/study_group/${createdGroup.id}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                    }),
                }
            );

            console.log('Updated group from API:', updatedGroup);
        } catch (error) {
            console.error('Group location update failed:', error);
            Alert.alert('Error', error.message);
        }
    }

    // Initialise the group and presentations on component mount.
    useEffect(() => {
        async function initialise() {
            setLoading(true);

            try {
                const savedMembership = await AsyncStorage.getItem(
                    GROUP_MEMBERSHIP_KEY
                );

                if (savedMembership) {
                    const membership = JSON.parse(savedMembership);
                    const savedGroup = membership.group;
                    const savedAttendee = membership.attendee;
                    const result = await apiRequest('/study_group');
                    const records = Array.isArray(result)
                        ? result
                        : Array.isArray(result?.data)
                            ? result.data
                            : [];

                    if (!cancelled) setGroups(records);
                    const groups = Array.isArray(result)
                        ? result
                        : Array.isArray(result.data)
                            ? result.data
                            : [];
                    const existingGroup = groups.find(
                        item => item.id === savedGroup.id
                    );

                    if (existingGroup && existingGroup.is_active !== false) {
                        setGroup(existingGroup);
                        setAttendee(savedAttendee);
                    } else {
                        await AsyncStorage.removeItem(GROUP_MEMBERSHIP_KEY);
                        setGroup(null);
                        setAttendee(null);
                    }
                }

                await loadPresentations();
            } catch (error) {
                Alert.alert(
                    'Error',
                    `Could not restore group membership: ${error.message}`
                );
            } finally {
                setLoading(false);
            }
        }
        async function loadLocation() {
            try {
                const { status } =
                    await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    Alert.alert(
                        'Location Required',
                        'Please allow location access to create a group.'
                    );
                    return;
                }

                const cached = await Location.getLastKnownPositionAsync({
                    maxAge: 60000,
                    requiredAccuracy: 200,
                });

                if (cached) {
                    setCurrentLocation(cached.coords);
                } else {
                    const position = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });

                    setCurrentLocation(position.coords);
                }
            } catch (error) {
                Alert.alert('Location Error', error.message);
            }
        }

        initialise();
        loadLocation();
    }, []);

    useFocusEffect(
        useCallback(() => {
            restoreMembership(); // Added this line to restore group membership on focus
            loadPresentations();
        }, [])
    );

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    } else return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>My Group</Text>

            {!group && (
                <>
                    {currentLocation ? (
                        <Text style={styles.description}>
                            Your location:
                            {'\n'}Latitude: {currentLocation.latitude.toFixed(6)}
                            {'\n'}Longitude: {currentLocation.longitude.toFixed(6)}
                        </Text>
                    ) : (
                        <Text style={styles.description}>
                            Getting your location...
                        </Text>
                    )}

                    <Pressable
                        style={[
                            styles.button,
                            (!currentLocation || gettingLocation) && { opacity: 0.5 },
                        ]}
                        onPress={handleCreateGroup}
                        disabled={!currentLocation || gettingLocation}
                    >
                        <Text style={styles.buttonText}>Create Group</Text>
                    </Pressable>

                    <Text style={styles.description}>
                        You are not part of any group yet. Creating your own group will
                        make your group discoverable to others, but also disables you
                        from joining other groups.
                    </Text>
                </>
            )}

            {group && (
                <>
                    <Text style={styles.subtitle}>
                        Group ID: {group.group_id}
                    </Text>

                    {!group.presentation_id ? (
                        <>
                            <Text style={styles.subtitle}>
                                Select a presentation for your group.
                            </Text>

                            {presentations.length === 0 ? (
                                <Pressable
                                    style={styles.button}
                                    onPress={loadPresentations}
                                >
                                    <Text style={styles.buttonText}>
                                        Choose Presentation
                                    </Text>
                                </Pressable>
                            ) : (
                                presentations.map((presentation) => (
                                    <Pressable
                                        key={
                                            presentation.presentation_id ??
                                            presentation.id
                                        }
                                        style={styles.card}
                                        onPress={() => selectPresentation(presentation)}
                                    >
                                        <Text style={styles.cardTitle}>
                                            {presentation.title ?? 'Untitled presentation'}
                                        </Text>

                                        {!!presentation.description && (
                                            <Text style={styles.description}>
                                                {presentation.description}
                                            </Text>
                                        )}
                                    </Pressable>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.subtitle}>
                                Selected Presentation: {
                                    group.presentation_title ?? 'Untitled'
                                }
                            </Text>

                            {group?.presentation_id && attendee && !attendee.finished_viewing ? (
                                <Pressable
                                    style={styles.button}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/presentation',
                                            params: {
                                                presentationId: String(group.presentation_id),
                                                groupId: String(group.group_id),
                                                attendeeId: String(attendee.attendee_id),
                                            },
                                        })
                                    }
                                >
                                    <Text style={styles.buttonText}>Open Presentation</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={styles.button}
                                    onPress={() => {
                                        Alert.alert(
                                            'Not available',
                                            'Creating a new presentation is not implemented yet.'
                                        );
                                    }}
                                >
                                    <Text style={styles.buttonText}>
                                        'Creating a new presentation is not implemented yet.'
                                    </Text>
                                </Pressable>
                            )}
                        </>
                    )}
                    <Pressable
                        style={styles.button}
                        onPress={leaveGroup}
                    >
                        <Text style={styles.buttonText}>Leave Group</Text>
                    </Pressable>
                </>
            )
            }

        </ScrollView >
    );
}
