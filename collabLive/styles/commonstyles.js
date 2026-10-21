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
});