import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { DataGridExample } from '@/components/Grid';

const HomeScreen = () => {
    return (
        <SafeAreaView>
            <Link href="/modal">Modal</Link>
            <DataGridExample />
        </SafeAreaView>
    );
};

export default HomeScreen;
