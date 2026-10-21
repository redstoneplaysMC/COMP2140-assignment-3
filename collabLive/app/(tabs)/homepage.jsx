import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { commonStyles as styles } from '../../styles/commonstyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

const PROFILE_KEY = '@collablive/profile';

export default function HomepageScreen() {
    const [savedName, setSavedName] = useState('');
    useFocusEffect(
        useCallback(() => {
            async function loadProfile() {
                try {
                    const saved = await AsyncStorage.getItem(PROFILE_KEY);

                    if (saved) {
                        const profile = JSON.parse(saved);
                        setSavedName(profile.display_name ?? '');
                    } else {
                        setSavedName('');
                    }
                } catch (error) {
                    console.error('Could not load profile:', error);
                }
            }

            loadProfile();
        }, [])
    );
    return (
        <View style={styles.centeredContainer}>
            <View
                style={{
                    width: '100%',
                    height: 300,
                    backgroundColor: '#d1d5db',
                    borderRadius: 8,
                }}
            />

            <Text style={styles.title}>Collab Live</Text>

            <View style={styles.divider} />

            <Text style={styles.subtitle}>
                {savedName ? `Welcome, ${savedName}` : 'Welcome, Stranger!'}
            </Text>

            <Text style={styles.subtitle}>
                Use the tabs below to navigate the app, and start collaborating!
            </Text>
        </View>
    );
}