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

const PROFILE_KEY = '@collablive/profile';
const GROUP_MEMBERSHIP_KEY = '@collablive/group_membership';

export default function MyGroupScreen() {
    const router = useRouter();
    const { group, setGroup } = useGroup();
    const [presentations, setPresentations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [attendee, setAttendee] = useState(null);
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

            {!group ? (
                <>
                    <Pressable
                        style={styles.button}
                        onPress={createGroup}
                    >
                        <Text style={styles.buttonText}>Create Group</Text>
                    </Pressable>
                    <Text style={styles.description}>You are not part of any group yet. Creating your own group will make your group discoverable to
                        others, but also disables you from joining other groups.
                    </Text>
                </>
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
