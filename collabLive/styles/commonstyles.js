import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from './theme';

export const commonStyles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        gap: spacing.md,
        backgroundColor: colors.background,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
        backgroundColor: colors.background,
    },
    card: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        gap: 6,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    description: {
        color: '#666',
    },
    title: {
        fontSize: typography.title,
        fontWeight: 'bold',
        color: colors.text,
    },
    subtitle: {
        fontSize: typography.subtitle,
        color: colors.text,
    },
    text: {
        fontSize: typography.body,
        color: colors.text,
    },
    secondaryText: {
        fontSize: typography.body,
        color: colors.secondaryText,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.md,
        fontSize: typography.body,
    },
    button: {
        backgroundColor: colors.primary,
        padding: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: typography.body,
        fontWeight: '600',
    },
    screen: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    info: {
        color: '#6b7280',
        marginTop: 6,
    },
    slideScroll: {
        flex: 1,
    },
    slideContent: {
        padding: 20,
        flexGrow: 1,
        backgroundColor: '#ffffff',
        margin: 12,
        borderRadius: 10,
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    navigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#ffffff',
    },
    navButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    navButtonRed: {
        backgroundColor: '#dc2626',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    disabledButton: {
        opacity: 0.35,
    },
    navText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    counter: {
        color: '#374151',
        fontWeight: '500',
    },

});