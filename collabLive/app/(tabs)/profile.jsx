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
    const [profileId, setProfileId] = useState(null);
    const [savedName, setSavedName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const saved = await AsyncStorage.getItem(PROFILE_KEY);

                if (saved) {
                    const profile = JSON.parse(saved);
                    setDisplayName(profile.display_name ?? '');
                    setProfileId(profile.profile_id);
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

        const profile = {
            profile_id:
                profileId ?? `${Date.now()} -${Math.random().toString(36).slice(2, 9)} `,
            display_name: name,
        };

        try {
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

            const saved = await AsyncStorage.getItem(PROFILE_KEY);
            const verifiedProfile = JSON.parse(saved);

            setProfileId(verifiedProfile.profile_id);
            setDisplayName(verifiedProfile.display_name);
            setSavedName(verifiedProfile.display_name);

            Alert.alert(
                'Profile Verified',
                `Saved name: ${verifiedProfile.display_name}`
            );
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

            {profileId && (
                <>
                    <Text style={styles.info}>Profile created on this device.</Text>
                    <Text style={styles.info}>Saved Name: {savedName}</Text>
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