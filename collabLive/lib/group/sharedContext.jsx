import { createContext, useContext, useState } from 'react';

/**
 * Yes, essentially. GroupContext makes the group state shared across components, rather than keeping it local to MyGroupScreen.
 * GroupProvider owns the state: group and setGroup.
 * useGroup() lets any component inside the provider access that same state.
 * setGroup() updates the shared state, so every component using useGroup() receives the updated value.
 * For example, your MyGroupScreen can set the group:
 * 
 * ```jsx
 * const { group, setGroup } = useGroup();
 * setGroup(newGroup);
 * ```
 * 
 */

const GroupContext = createContext(null);

export function GroupProvider({ children }) {
    const [group, setGroup] = useState(null);

    return (
        <GroupContext.Provider value={{ group, setGroup }}>
            {children}
        </GroupContext.Provider>
    );
}

export function useGroup() {
    const context = useContext(GroupContext);

    if (!context) {
        throw new Error('useGroup must be used within GroupProvider');
    }

    return context;
}
