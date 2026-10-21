import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { GroupProvider, useGroup } from '../../lib/group/sharedContext';

export default function TabLayout() {
    return (
        <GroupProvider>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: '#6129e2',
                }}
            >
                <Tabs.Screen
                    name="homepage"
                    options={{
                        title: 'Homepage',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home-outline" size={size} color={color} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="discover"
                    options={{
                        title: 'Discover',
                        tabBarButton: (props) => {
                            const { group } = useGroup();
                            return (
                                <Pressable
                                    {...props}
                                    disabled={!!group}
                                    style={[
                                        props.style,
                                        group && { opacity: 0.35 },
                                    ]}
                                />
                            );
                        },
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="map-outline" size={size} color={color} />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="my-group"
                    options={{
                        title: 'My Group',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="people-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="presentation"
                    options={{
                        href: null,
                        title: 'Presentation',
                    }}
                />
            </Tabs>
        </GroupProvider>
    );
}