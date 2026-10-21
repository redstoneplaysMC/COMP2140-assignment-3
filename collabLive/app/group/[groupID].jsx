
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiRequest } from '../../lib/api';

export default function GroupScreen() {
    const { groupId } = useLocalSearchParams();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadGroup() {
            try {
                const result = await apiRequest(`/groups/${groupId}`);
                setGroup(result);
            } catch (error) {
                Alert.alert('Error', 'Could not load this study group.');
            } finally {
                setLoading(false);
            }
        }

        loadGroup();
    }, [groupId]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />
                <Text>Loading group...</Text>
            </View>
        );
    }

    if (!group) {
        return (
            <View style={styles.container}>
                <Text>Study group not found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Study Group</Text>

            <Text style={styles.label}>Group ID</Text>
            <Text>{group.group_id}</Text>

            <Text style={styles.label}>Presentation</Text>
            <Text>
                {group.presentation?.title ??
                    `Presentation ${group.presentation_id}`}
            </Text>

            <Text style={styles.label}>Status</Text>
            <Text>{group.is_active ? 'Active' : 'Inactive'}</Text>

            <Text style={styles.label}>Location</Text>
            <Text>
                {group.latitude != null && group.longitude != null
                    ? `${group.latitude}, ${group.longitude}`
                    : 'Location not broadcast'}
            </Text>

            <Text style={styles.note}>
                Location broadcasting will be added here.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        gap: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    label: {
        fontWeight: '600',
        marginTop: 8,
    },
    note: {
        color: '#666',
        marginTop: 16,
    },
});
