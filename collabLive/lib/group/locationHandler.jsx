// Existing shared /_location API + SSE

import {
    apiRequest,
    subscribeToEvents,
} from '../api';

export async function getGroupLocation(apiRequest) {
    const result = await apiRequest('/_location');
    return result?.data ?? result;
}

export async function updateGroupLocation(apiRequest, location) {
    return apiRequest('/_location', {
        method: 'PATCH',
        body: JSON.stringify(location),
    });
}

export function subscribeToLocationEvents({
    apiRequest,
    onLocationUpdate,
    onError,
    headers = {},
}) {
    let closed = false;
    let refreshing = false;

    async function refreshLocation() {
        if (closed || refreshing) return;

        refreshing = true;

        try {
            const location = await getGroupLocation(apiRequest);

            if (!closed) {
                onLocationUpdate(location);
            }
        } catch (error) {
            if (!closed) onError?.(error);
        } finally {
            refreshing = false;
        }
    }

    const unsubscribe = subscribeToEvents('/_location/events', {
        headers,
        onOpen: () => {
            console.log('Connected to location event stream.');
            refreshLocation();
        },
        onMessage: refreshLocation,
        onError: event => {
            if (!closed) {
                onError?.(
                    new Error(event.message || 'Location stream failed.')
                );
            }
        },
    });

    return () => {
        closed = true;
        unsubscribe();
    };
}

export function subscribeToAttendeeEvents({
    groupId,
    apiRequest,
    onLocationUpdate,
    onError,
    headers = {},
}) {
    const unsubscribe = subscribeToEvents('/_events', {
        headers,
        onMessage: async event => {
            try {
                const change = JSON.parse(event.data);

                if (
                    change.entity !== 'attendee' ||
                    change.type !== 'updated'
                ) {
                    return;
                }

                const result = await apiRequest(
                    `/attendee/${change.id}`
                );

                const attendee = result?.data ?? result;

                if (
                    String(attendee.group_id) !== String(groupId) ||
                    attendee.finished_viewing ||
                    attendee.latitude == null ||
                    attendee.longitude == null
                ) {
                    return;
                }

                onLocationUpdate(attendee);
            } catch (error) {
                onError?.(error);
            }
        },
        onError,
    });

    return unsubscribe;
}