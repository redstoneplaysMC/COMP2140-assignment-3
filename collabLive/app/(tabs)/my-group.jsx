import { useRouter } from 'expo-router';
import { Button, View } from 'react-native';

export default function MyGroupScreen() {
    const router = useRouter();

    return (
        <View>
            <Button
                title="Create Group"
                onPress={() => router.push('/group/create')}
            />
        </View>
    );
}