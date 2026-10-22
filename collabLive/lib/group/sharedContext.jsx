import { createContext, useContext, useState } from 'react';

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
    const [group, setGroup] = useState(null);
    const [attendee, setAttendee] = useState(null);

    return (
        <GroupContext.Provider
            value={{
                group,
                setGroup,
                attendee,
                setAttendee,
            }}
        >
            {children}
        </GroupContext.Provider>
    );
}

export function useGroup() {
    const context = useContext(GroupContext);

    if (!context) {
        throw new Error('useGroup must be used within a GroupProvider');
    }

    return context;
}