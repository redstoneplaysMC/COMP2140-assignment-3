
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
import { useLocalSearchParams } from 'expo-router';
import { apiRequest } from '../../lib/api';
import SlidePreviewer from '../../components/slide-previewer';
import { useRouter } from 'expo-router';

export default function StartPresentationScreen() {
    const { presentationId, groupId, attendeeId } = useLocalSearchParams();

    const [slides, setSlides] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [completed, setCompleted] = useState(false);
    const router = useRouter();
    const [finishing, setFinishing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadSlides() {
            setLoading(true);

            try {
                const result = await apiRequest('/slide');

                const items = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : [];

                const presentationSlides = items
                    .filter(
                        (slide) =>
                            Number(slide.presentation_id) ===
                            Number(presentationId)
                    )
                    .sort(
                        (a, b) =>
                            Number(a.slide_position) -
                            Number(b.slide_position)
                    );

                if (!cancelled) {
                    setSlides(presentationSlides);
                    setSelectedIndex(0);
                }
            } catch (error) {
                if (!cancelled) {
                    Alert.alert(
                        'Error',
                        `Could not load slides: ${error.message}`
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        if (presentationId) {
            loadSlides();
        } else {
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [presentationId]);

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
                (item) => String(item.group_id) === String(groupId)
            );

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
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text style={styles.info}>Loading presentation...</Text>
            </View>
        );
    }

    if (slides.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.title}>No slides found</Text>
                <Text style={styles.info}>
                    This presentation does not contain any slides yet.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.title}>Presentation</Text>
                <Text style={styles.info}>Group ID: {groupId}</Text>
            </View>

            <ScrollView
                style={styles.slideScroll}
                contentContainerStyle={styles.slideContent}
            >
                <SlidePreviewer
                    slide={slides[selectedIndex]}
                    presentationId={presentationId}
                    attendeeId={attendeeId}
                    completed={completed}
                />
            </ScrollView>

            <View style={styles.navigation}>
                <Pressable
                    style={[
                        styles.navButton,
                        selectedIndex === 0 && !completed &&
                        styles.disabledButton,
                    ]}
                    disabled={selectedIndex === 0 && !completed}
                    onPress={goPrevious}
                >
                    <Text style={styles.navText}>Previous</Text>
                </Pressable>

                <Text style={styles.counter}>
                    {completed
                        ? 'Complete'
                        : `Slide ${selectedIndex + 1} of ${slides.length}`}
                </Text>

                <Pressable
                    style={[
                        styles.navButton,
                        finishing && styles.disabledButton,
                    ]}
                    onPress={completed || selectedIndex === slides.length - 1
                        ? finishPresentation
                        : goNext}
                    disabled={finishing}
                >
                    <Text style={styles.navText}>
                        {finishing
                            ? 'Finishing...'
                            : completed || selectedIndex === slides.length - 1
                                ? 'Finish'
                                : 'Next'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    info: {
        color: '#6b7280',
        marginTop: 6,
    },
    slideScroll: {
        flex: 1,
    },
    slideContent: {
        padding: 20,
        flexGrow: 1,
        backgroundColor: '#ffffff',
        margin: 12,
        borderRadius: 10,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    navigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#ffffff',
    },
    navButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    disabledButton: {
        opacity: 0.35,
    },
    navText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    counter: {
        color: '#374151',
        fontWeight: '500',
    },
});
