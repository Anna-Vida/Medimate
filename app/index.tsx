import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getCurrentUserId } from '../services/auth';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const [destination, setDestination] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const onboardingDone = await AsyncStorage.getItem('onboarding_done');
            if (!onboardingDone) {
                setDestination('/onboarding');
                return;
            }

            const userId = await getCurrentUserId();
            if (userId) {
                setDestination('/(tabs)');
            } else {
                setDestination('/auth/login');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setDestination('/auth/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !destination) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return <Redirect href={destination as any} />;
}
