import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useGroupHandler({
    apiRequest,
    PROFILE_KEY,
    GROUP_MEMBERSHIP_KEY,
    group,
    attendee,
    setGroup,
    setAttendee,
    setPresentations,
    setLoading,
}) {
    async function registerAttendee(group) {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        const profile = saved ? JSON.parse(saved) : {};
        const displayName = profile.display_name || 'Anonymous';

        const result = await apiRequest('/attendee');

        const attendees = Array.isArray(result)
            ? result
            : Array.isArray(result.data)
                ? result.data
                : [];

        const usedIds = new Set(
            attendees.map(attendee => Number(attendee.attendee_id))
        );

        let attendeeId = 1;
        while (usedIds.has(attendeeId)) {
            attendeeId++;
        }

        const createdResult = await apiRequest('/attendee', {
            method: 'POST',
            body: JSON.stringify({
                display_name: displayName,
                attendee_id: attendeeId,
                finished_viewing: false,
                presentation_id: group.presentation_id ?? 0,
                group_id: group.group_id,
                latitude: null,
                longitude: null,
            }),
        });

        const createdAttendee = createdResult.data ?? createdResult;
        setAttendee(createdAttendee);

        return createdAttendee;
    }

    async function createGroup() {
        setLoading(true);

        try {
            const result = await apiRequest('/study_group', {
                method: 'GET',
            });

            const existingGroups = Array.isArray(result)
                ? result
                : Array.isArray(result.data)
                    ? result.data
                    : [];

            const nextGroupId =
                Math.max(
                    0,
                    ...existingGroups.map(
                        item => Number(item.group_id) || 0
                    )
                ) + 1;

            // const location = await getCurrentLocation();
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
                    is_active: true,
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

                setAttendee(current => ({
                    ...current,
                    presentation_id: createdAttendee.presentation_id,
                }));
            }
            return createdGroup;

        } catch (error) {
            Alert.alert(
                'Error',
                `Could not create group: ${error.message}`
            );
        } finally {
            setLoading(false);
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
                item =>
                    String(item.id) !== String(attendee.id) &&
                    !item.finished_viewing
            );

            // Preserve the attendee record and its poll-response history.
            await apiRequest(`/attendee/${attendee.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    finished_viewing: true,
                }),
            });

            if (remainingAttendees.length === 0) {
                await apiRequest(`/study_group/${group.id}`, {
                    method: 'DELETE',
                });
            } else if (
                String(group.leader_id) === String(attendee.attendee_id)
            ) {
                await apiRequest(`/study_group/${group.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        leader_id: remainingAttendees[0].attendee_id,
                    }),
                });
            }

            await AsyncStorage.removeItem(GROUP_MEMBERSHIP_KEY);

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


    async function restoreMembership() {
        try {
            const saved = await AsyncStorage.getItem(GROUP_MEMBERSHIP_KEY);

            if (!saved) {
                setGroup(null);
                setAttendee(null);
                return;
            }

            const membership = JSON.parse(saved);

            if (!membership.group?.id || !membership.attendee?.id) {
                await AsyncStorage.removeItem(GROUP_MEMBERSHIP_KEY);
                setGroup(null);
                setAttendee(null);
                return;
            }

            const [groupResult, attendeeResult] = await Promise.all([
                apiRequest('/study_group'),
                apiRequest(`/attendee?group_id=${encodeURIComponent(membership.group.group_id)}`),
            ]);

            const groups = Array.isArray(groupResult)
                ? groupResult
                : Array.isArray(groupResult?.data)
                    ? groupResult.data
                    : [];

            const attendees = Array.isArray(attendeeResult)
                ? attendeeResult
                : Array.isArray(attendeeResult?.data)
                    ? attendeeResult.data
                    : [];

            const existingGroup = groups.find(
                item => String(item.id) === String(membership.group.id)
            );

            const existingAttendee = attendees.find(
                item =>
                    String(item.id) === String(membership.attendee.id) &&
                    String(item.attendee_id) === String(membership.attendee.attendee_id) &&
                    !item.finished_viewing
            );

            if (!existingGroup || existingGroup.is_active === false || !existingAttendee) {
                await AsyncStorage.removeItem(GROUP_MEMBERSHIP_KEY);
                setGroup(null);
                setAttendee(null);
                return;
            }

            setGroup(existingGroup);
            setAttendee(existingAttendee);

            await AsyncStorage.setItem(
                GROUP_MEMBERSHIP_KEY,
                JSON.stringify({
                    group: existingGroup,
                    attendee: existingAttendee,
                })
            );
        } catch (error) {
            console.error('Could not restore group membership:', error);
        }
    }

    return {
        createGroup,
        leaveGroup,
        registerAttendee,
        restoreMembership,
    };
}
