import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@collablive/profile';

export default function ProfileScreen() {
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(true);
    const [savedName, setSavedName] = useState('');

    useEffect(() => {
        async function loadProfile() {
            try {
                const saved = await AsyncStorage.getItem(PROFILE_KEY);

                if (saved) {
                    const profile = JSON.parse(saved);
                    setDisplayName(profile.display_name ?? '');
                }
            } catch (error) {
                Alert.alert('Error', 'Could not load your profile.');
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    async function saveProfile() {
        const name = displayName.trim();

        if (!name) {
            Alert.alert('Missing name', 'Please enter a display name.');
            return;
        }

        try {
            await AsyncStorage.setItem(
                PROFILE_KEY,
                JSON.stringify({ display_name: name })
            );

            setDisplayName(name);
            setSavedName(name);

            Alert.alert('Profile Saved', `Saved name: ${name}`);
        } catch (error) {
            Alert.alert('Error', 'Could not save your profile.');
        }
    }

    if (loading) {
        return <View style={styles.container}><Text>Loading profile...</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Profile</Text>

            <Text style={styles.label}>Display name:</Text>
            <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                maxLength={40}
                autoCapitalize="words"
            />
            <Pressable style={styles.button} onPress={saveProfile}>
                <Text style={styles.buttonText}>Save Profile</Text>
            </Pressable>

            {savedName && (
                <>
                    <Text style={styles.info}>Profile created on this device with saved name: {savedName}</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        gap: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    info: {
        color: '#666',
        marginTop: 8,
    },
});