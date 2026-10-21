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

const PROFILE_KEY = '@collablive/profile';

export default function MyGroupScreen() {
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
                    leader_id: 0,
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
            // Mark this attendee as finished.
            await apiRequest(`/attendee/${attendee.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    finished_viewing: true,
                }),
            });

            // Check whether any attendees are still participating.
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
                    item.id !== attendee.id &&
                    item.attendee_id !== attendee.attendee_id &&
                    !item.finished_viewing
            );

            if (remainingAttendees.length === 0) {
                console.log('Deleting group:', group.id, group.group_id);

                const result = await apiRequest(`/study_group/${group.id}`, {
                    method: 'DELETE',
                });

                console.log('Delete response:', result);
                console.log('Group deleted successfully');
            } else if (group.leader_id === attendee.attendee_id) {
                const nextLeader = remainingAttendees[0];

                await apiRequest(`/study_group/${group.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        leader_id: nextLeader.attendee_id,
                    }),
                });
            }
            setGroup(null);
            setAttendee(null);
            setPresentations([]);
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
        // Load the user's existing active group here once the
        // backend provides an endpoint to retrieve their membership.
        loadPresentations();
    }, []);

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
                        <Text style={styles.subtitle}>
                            Selected Presentation: {
                                presentations.find(
                                    (presentation) =>
                                        (presentation.presentation_id) ===
                                        (group.presentation_id)
                                )?.title ?? 'Name not found...'
                            }
                        </Text>
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
