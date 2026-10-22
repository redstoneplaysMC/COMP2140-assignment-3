import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { GroupProvider, useGroup } from '../../lib/group/sharedContext';

export default function TabLayout() {
    return (
        <GroupProvider>
            <TabNavigator />
        </GroupProvider>
    );
}

function TabNavigator() {
    const { group, attendee } = useGroup();
    const router = useRouter();

    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#6129e2' }}>
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
                    title: group ? 'Presentation' : 'Discover',
                    tabBarButton: (props) => (
                        <Pressable
                            {...props}
                            onPress={() => {
                                if (group && attendee) {
                                    router.replace({
                                        pathname: '/presentation',
                                        params: {
                                            groupId: String(group.group_id),
                                            presentationId: String(group.presentation_id),
                                            attendeeId: String(attendee.attendee_id),
                                        },
                                    });
                                } else {
                                    props.onPress?.();
                                }
                            }}
                        />
                    ),
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
    );
}