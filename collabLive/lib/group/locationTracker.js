// Attendee GPS tracking + PATCH /attendee/:id

import { useEffect } from 'react';
import * as Location from 'expo-location';

export function useAttendeeLocation(attendee, apiRequest) {
    useEffect(() => {
        if (!attendee?.id || attendee.finished_viewing) {
            return;
        }

        let cancelled = false;
        let subscription = null;
        let lastUpdate = Promise.resolve();

        async function startTracking() {
            const { status } =
                await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted' || cancelled) {
                return;
            }

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 5,
                    timeInterval: 5000,
                },
                position => {
                    if (cancelled) return;

                    const { latitude, longitude } = position.coords;

                    lastUpdate = lastUpdate
                        .catch(() => {})
                        .then(async () => {
                            if (cancelled) return;

                            await apiRequest(
                                `/attendee/${attendee.id}`,
                                {
                                    method: 'PATCH',
                                    body: JSON.stringify({
                                        latitude,
                                        longitude,
                                    }),
                                }
                            );
                        })
                        .catch(error => {
                            console.error(
                                'Location update failed:',
                                error
                            );
                        });
                }
            );

            if (cancelled) {
                subscription.remove();
                subscription = null;
            }
        }

        startTracking().catch(error => {
            console.error('Could not start location tracking:', error);
        });

        return () => {
            cancelled = true;
            subscription?.remove();
        };
    }, [attendee?.id, attendee?.finished_viewing, apiRequest]);
}