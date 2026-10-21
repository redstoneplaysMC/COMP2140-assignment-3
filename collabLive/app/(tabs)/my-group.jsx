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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

const PROFILE_KEY = '@collablive/profile';
const GROUP_MEMBERSHIP_KEY = '@collablive/group_membership';

export default function MyGroupScreen() {
    const router = useRouter();
    const [group, setGroup] = useState(null);
    const [presentations, setPresentations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [attendee, setAttendee] = useState(null);

    async function createGroup() {
        setLoading(true);

        try {
            // This endpoint should atomically create the group
            // and register the creator as its first attendee/leader.
            const result = await apiRequest('/study_group', { method: 'GET' });

            const existingGroups = Array.isArray(result)
                ? result
                : Array.isArray(result.data)
                    ? result.data
                    : [];

            const nextGroupId =
                Math.max(0, ...existingGroups.map(group => Number(group.group_id) || 0)) + 1;

            const createdResult = await apiRequest('/study_group', {
                method: 'POST',
                body: JSON.stringify({
                    group_id: nextGroupId,
                    presentation_id: 0,
                    leader_id: attendee?.attendee_id ?? 0,
                    slide_id: 0,
                    slide_order: '',
                    latitude: 0,
                    longitude: 0,
                    is_active: true
                }),
            });
            const createdGroup = createdResult.data ?? createdResult;
            const createdAttendee = await registerAttendee(createdGroup);
            setGroup(createdGroup);
            await AsyncStorage.setItem(
                GROUP_MEMBERSHIP_KEY,
                JSON.stringify({
                    group: createdGroup,
                    attendee: createdAttendee,
                })
            );
            await apiRequest(`/study_group/${createdGroup.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    leader_id: createdAttendee.attendee_id,
                }),
            });

            if (createdAttendee) {
                await apiRequest(`/attendee/${createdAttendee.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        presentation_id: createdAttendee.presentation_id,
                    }),
                });

                setAttendee((current) => ({
                    ...current,
                    presentation_id: createdAttendee.presentation_id,
                }));
            }
        } catch (error) {
            Alert.alert('Error', `Could not create group: ${error.message}`);
        } finally {
            setLoading(false);
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

            setPresentations(items);
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
                presentation_id: presentationId,
                presentation_title: presentation.title ?? 'Untitled presentation',
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

    async function leaveGroup() {
        if (!group || !attendee) return;

        try {
            const result = await apiRequest(
                `/attendee?group_id=${encodeURIComponent(group.group_id)}`
            );

            const attendees = Array.isArray(result)
                ? result
                : Array.isArray(result.data)
                    ? result.data
                    : [];

            const remainingAttendees = attendees.filter(
                (item) =>
                    String(item.id) !== String(attendee.id) &&
                    !item.finished_viewing
            );

            if (remainingAttendees.length === 0) {
                // Last active attendee: delete every attendee in the group.
                await Promise.all(
                    attendees.map((item) =>
                        apiRequest(`/attendee/${item.id}`, {
                            method: 'DELETE',
                        })
                    )
                );

                // Delete the group after its attendees have been removed.
                await apiRequest(`/study_group/${group.id}`, {
                    method: 'DELETE',
                });
            } else {
                // Other active attendees remain: delete only this attendee.
                await apiRequest(`/attendee/${attendee.id}`, {
                    method: 'DELETE',
                });

                // Transfer leadership if the departing attendee was the leader.
                if (
                    String(group.leader_id) === String(attendee.attendee_id)
                ) {
                    await apiRequest(`/study_group/${group.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                            leader_id: remainingAttendees[0].attendee_id,
                        }),
                    });
                }
            }

            setGroup(null);
            setAttendee(null);
            setPresentations([]);
            await AsyncStorage.removeItem(GROUP_MEMBERSHIP_KEY);

        } catch (error) {
            Alert.alert(
                'Error',
                `Could not leave group: ${error.message}`
            );
        }
    }

    async function registerAttendee(group) {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        const profile = saved ? JSON.parse(saved) : {};
        const displayName = profile.display_name || 'Anonymous';

        const result = await apiRequest('/attendee', {
            method: 'POST',
            body: JSON.stringify({
                display_name: displayName,
                attendee_id: profile.attendee_id ?? 0,
                finished_viewing: false,
                presentation_id: group.presentation_id ?? 0,
                group_id: group.group_id,
            }),
        });

        const createdAttendee = result.data ?? result;
        setAttendee(createdAttendee);
        return createdAttendee;
    }

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

        initialise();
    }, []);


    async function restoreMembership() {
        try {
            const saved = await AsyncStorage.getItem(GROUP_MEMBERSHIP_KEY);

            if (!saved) {
                setGroup(null);
                setAttendee(null);
                return;
            }

            const membership = JSON.parse(saved);

            const groupResult = await apiRequest('/study_group');

            const groups = Array.isArray(groupResult)
                ? groupResult
                : Array.isArray(groupResult.data)
                    ? groupResult.data
                    : [];

            const existingGroup = groups.find(
                item => String(item.id) === String(membership.group.id)
            );

            if (!existingGroup || existingGroup.is_active === false) {
                await AsyncStorage.removeItem(GROUP_MEMBERSHIP_KEY);
                setGroup(null);
                setAttendee(null);
                return;
            }

            // Restore the saved membership without requiring an attendee lookup.
            setGroup(existingGroup);
            setAttendee(membership.attendee);

            await AsyncStorage.setItem(
                GROUP_MEMBERSHIP_KEY,
                JSON.stringify({
                    group: existingGroup,
                    attendee: membership.attendee,
                })
            );
        } catch (error) {
            console.error('Could not restore group membership:', error);
        }
    }


    useFocusEffect(
        useCallback(() => {
            restoreMembership();
            loadPresentations();
        }, [])
    );

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>My Group</Text>


            {!group ? (
                <Pressable
                    style={styles.button}
                    onPress={createGroup}
                >
                    <Text style={styles.buttonText}>Create Group</Text>
                </Pressable>
            ) : (
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
                                    presentations.find(
                                        (presentation) =>
                                            Number(presentation.presentation_id ?? presentation.id) ===
                                            Number(group.presentation_id)
                                    )?.title ?? 'No name found'
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
                                    <Text style={styles.buttonText}>Return to Presentation</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={styles.button}
                                    onPress={createNewPresentation}
                                >
                                    <Text style={styles.buttonText}>Create New Presentation</Text>
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
            )}

        </ScrollView>
    );
}
