import { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { apiRequest } from '../../lib/api';
import SlidePreviewer from '../../components/slide-previewer';
import { useRouter } from 'expo-router';
import { commonStyles } from '../../styles/commonstyles';
import * as Location from 'expo-location';
const PROFILE_KEY = '@collablive/profile';
export default function StartPresentationScreen() {
    const { presentationId, groupId, attendeeId } = useLocalSearchParams();
    const [slides, setSlides] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const router = useRouter();
    const [finishing, setFinishing] = useState(false);
    const isLastSlide = completed || selectedIndex === slides.length - 1;
    const [displayName, setDisplayName] = useState('');
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [leaderId, setLeaderId] = useState(null);
    const [presentationTitle, setPresentationTitle] = useState(null);

    useEffect(() => {

        async function trackLeaderLocation() {
            let subscription;

            try {
                const permission =
                    await Location.requestForegroundPermissionsAsync();

                if (!permission.granted || cancelled) return;

                const result = await apiRequest('/study_group');
                const groups = Array.isArray(result)
                    ? result
                    : result.data ?? [];

                const currentGroup = groups.find(
                    item =>
                        String(item.group_id ?? item.id) === String(groupId)
                );

                if (
                    !currentGroup ||
                    String(currentGroup.leader_id) !== String(attendeeId) ||
                    currentGroup.is_active === false
                ) {
                    return;
                }

                async function updateLocation(position) {
                    if (cancelled) return;

                    try {
                        await apiRequest(
                            `/study_group/${currentGroup.id ?? currentGroup.group_id}`,
                            {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude,
                                }),
                            }
                        );

                        setLatitude(position.coords.latitude);
                        setLongitude(position.coords.longitude);
                    } catch (error) {
                        console.error('Could not update group location:', error);
                    }
                }

                const position = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                await updateLocation(position);

                if (cancelled) return;

                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 10000,
                        distanceInterval: 10,
                    },
                    updateLocation
                );

                if (cancelled) subscription.remove();
            } catch (error) {
                console.error('Could not track leader location:', error);
            }

            return () => subscription?.remove();
        }

        async function loadProfile() {
            try {
                const saved = await AsyncStorage.getItem(PROFILE_KEY);
                const profile = saved ? JSON.parse(saved) : {};
                setDisplayName(profile.display_name || 'Anonymous');
            } catch (error) {
                Alert.alert('Error', `Could not load profile: ${error.message}`);
            }
        }
        loadProfile();
        let cancelled = false;

        async function loadSlides() {
            setLoading(true);

            try {
                const [slideResult, presentationResult] = await Promise.all([
                    apiRequest('/slide'),
                    apiRequest('/presentation'),
                ]);

                const slidesList = Array.isArray(slideResult)
                    ? slideResult
                    : Array.isArray(slideResult.data)
                        ? slideResult.data
                        : [];

                const presentations = Array.isArray(presentationResult)
                    ? presentationResult
                    : Array.isArray(presentationResult.data)
                        ? presentationResult.data
                        : [];

                const currentPresentation = presentations.find(
                    presentation =>
                        Number(presentation.presentation_id ?? presentation.id) ===
                        Number(presentationId)
                );

                const presentationSlides = slidesList
                    .filter(
                        slide =>
                            Number(slide.presentation_id) === Number(presentationId)
                    )
                    .sort(
                        (a, b) =>
                            Number(a.slide_position) - Number(b.slide_position)
                    );

                if (!cancelled) {
                    setPresentationTitle(
                        currentPresentation?.title ?? 'Untitled Presentation'
                    );
                    setSlides(presentationSlides);
                    setSelectedIndex(0);
                }
            } catch (error) {
                if (!cancelled) {
                    Alert.alert(
                        'Error',
                        `Could not load presentation: ${error.message}`
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        async function loadGroup() {
            try {
                const result = await apiRequest('/study_group');

                const groups = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : [];

                const currentGroup = groups.find(
                    item =>
                        String(item.group_id ?? item.id) === String(groupId)
                );

                if (!currentGroup) {
                    console.log('Group not found:', groupId, groups);
                    setLeaderId(undefined);
                    return;
                }

                console.log('Current group:', currentGroup);
                console.log('Leader ID:', currentGroup.leader_id);
                console.log('Attendee ID:', attendeeId);

                setLeaderId(currentGroup.leader_id ?? null);
            } catch (error) {
                console.error('Could not load group:', error);
                setLeaderId(undefined);
            }
        }

        trackLeaderLocation();
        loadGroup();
        loadSlides();
    }, [presentationId, groupId]);

    async function finishPresentation() {
        if (finishing) return;

        setFinishing(true);

        try {
            const normaliseList = (result) => {
                if (Array.isArray(result)) return result;
                if (Array.isArray(result?.data)) return result.data;
                return [];
            };

            const [attendeeResult, groupResult] = await Promise.all([
                apiRequest(`/attendee?group_id=${encodeURIComponent(groupId)}`),
                apiRequest('/study_group'),
            ]);

            const attendees = normaliseList(attendeeResult);
            const groups = normaliseList(groupResult);

            const currentGroup = groups.find(
                item => String(item.group_id ?? item.id) === String(groupId)
            );

            if (currentGroup) {
                setLeaderId(currentGroup.leader_id);
            } else {
                console.log('Group not found:', groupId, groups);
            }

            if (!currentGroup) {
                throw new Error('The group could not be found.');
            }

            const currentAttendee = attendees.find(
                (item) =>
                    String(item.attendee_id) === String(attendeeId) &&
                    String(item.group_id) === String(groupId) &&
                    !item.finished_viewing
            );

            if (!currentAttendee) {
                throw new Error('Your active attendee record could not be found.');
            }

            const remainingAttendees = attendees.filter(
                (item) =>
                    String(item.id) !== String(currentAttendee.id) &&
                    !item.finished_viewing
            );

            // End this attendee's participation in the presentation.
            await apiRequest(`/attendee/${currentAttendee.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    finished_viewing: true,
                }),
            });

            if (remainingAttendees.length > 0) {
                // Transfer leadership if the current attendee was the leader.
                const currentIsLeader =
                    String(currentGroup.leader_id) === String(attendeeId);

                if (currentIsLeader) {
                    const nextLeader = remainingAttendees[0];

                    await apiRequest(`/study_group/${currentGroup.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            leader_id: nextLeader.attendee_id,
                        }),
                    });
                }
            } else {
                // Nobody remains: delete all attendee records, then the group.
                for (const item of attendees) {
                    await apiRequest(`/attendee/${item.id}`, {
                        method: 'DELETE',
                    });
                }

                await apiRequest(`/study_group/${currentGroup.id}`, {
                    method: 'DELETE',
                });
            }

            router.replace('/(tabs)/my-group');
        } catch (error) {
            Alert.alert(
                'Error',
                `Could not finish the presentation: ${error.message}`
            );
        } finally {
            setFinishing(false);
        }
    }

    function goNext() {
        if (selectedIndex < slides.length - 1) {
            setSelectedIndex((index) => index + 1);
        } else {
            setCompleted(true);
        }
    }

    function goPrevious() {
        if (completed) {
            setCompleted(false);
            return;
        }

        setSelectedIndex((index) => Math.max(0, index - 1));
    }

    if (loading) {
        return (
            <View style={commonStyles.centered}>
                <ActivityIndicator size="large" />
                <Text style={commonStyles.info}>Loading presentation...</Text>
            </View>
        );
    }

    if (slides.length === 0) {
        return (
            <View style={commonStyles.centered}>
                <Text style={commonStyles.title}>No slides found</Text>
                <Text style={commonStyles.info}>
                    This presentation does not contain any slides yet.
                </Text>
            </View>
        );
    }

    return (
        <View style={commonStyles.screen}>
            <View style={commonStyles.header}>
                <Text style={commonStyles.title}>{presentationTitle ?? 'Unnamed Presentation'}</Text>
                <Text style={commonStyles.info}>
                    Group ID: {groupId} | Display Name: {displayName} |
                    Lat: {latitude ?? 'N/A'} | Lon: {longitude ?? 'N/A'} |
                    Leader: {
                        leaderId === undefined
                            ? 'Unknown'
                            : leaderId === null
                                ? 'No leader assigned'
                                : String(leaderId) === String(attendeeId)
                                    ? 'Yes'
                                    : 'No'
                    }
                </Text>
            </View>

            <ScrollView
                style={commonStyles.slideScroll}
                contentContainerStyle={commonStyles.slideContent}
            >
                <SlidePreviewer
                    slide={slides[selectedIndex]}
                    presentationId={presentationId}
                    attendeeId={attendeeId}
                    completed={completed}
                />
            </ScrollView>

            <View style={commonStyles.navigation}>
                <Pressable
                    style={[
                        commonStyles.navButton,
                        selectedIndex === 0 && !completed &&
                        commonStyles.disabledButton,
                    ]}
                    disabled={selectedIndex === 0 && !completed}
                    onPress={goPrevious}
                >
                    <Text style={commonStyles.navText}>Previous</Text>
                </Pressable>

                <Text style={commonStyles.counter}>
                    {completed
                        ? 'Complete'
                        : `Slide ${selectedIndex + 1} of ${slides.length}`}
                </Text>

                <Pressable
                    style={[
                        isLastSlide ? commonStyles.navButtonRed : commonStyles.navButton,
                        finishing && commonStyles.disabledButton,
                    ]}
                    onPress={isLastSlide ? finishPresentation : goNext}
                    disabled={finishing}
                >
                    <Text style={commonStyles.navText}>
                        {finishing
                            ? 'Finishing...'
                            : isLastSlide
                                ? 'Finish'
                                : 'Next'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

