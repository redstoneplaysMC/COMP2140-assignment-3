
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    Alert,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { apiRequest } from '../lib/api';

function renderRuns(runs, keyPrefix = '') {
    if (!Array.isArray(runs)) return null;

    return runs.map((run, index) => {
        const key = `${keyPrefix}${index}`;

        if (run.type === 'strong') {
            return (
                <Text key={key} style={styles.bold}>
                    {renderRuns(run.runs, `${key}-`)}
                </Text>
            );
        }

        return (
            <Text key={key}>
                {run.value ?? ''}
            </Text>
        );
    });
}

function RenderList({ items, ordered }) {
    return (
        <View style={styles.list}>
            {items?.map((item, index) => (
                <View key={index} style={styles.listItem}>
                    <Text style={styles.listMarker}>
                        {ordered ? `${index + 1}.` : '•'}
                    </Text>

                    <View style={styles.listContent}>
                        <Text>{renderRuns(item.runs)}</Text>

                        {item.items?.length > 0 && (
                            <RenderList
                                items={item.items}
                                ordered={item.ordered}
                            />
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

function NormalSlide({ slideBody }) {
    function renderBlock(block, index) {
        const content = renderRuns(block.runs);

        switch (block.kind) {
            case 'heading': {
                const level = Math.min(
                    Math.max(block.level || 1, 1),
                    6
                );

                return (
                    <Text
                        key={index}
                        style={[
                            styles.heading,
                            { fontSize: Math.max(18, 32 - level * 2) },
                        ]}
                    >
                        {content}
                    </Text>
                );
            }

            case 'paragraph':
                return (
                    <Text key={index} style={styles.paragraph}>
                        {content}
                    </Text>
                );

            case 'quote':
                return (
                    <View key={index} style={styles.quote}>
                        <Text style={styles.paragraph}>{content}</Text>
                    </View>
                );

            case 'list':
                return (
                    <RenderList
                        key={index}
                        items={block.items}
                        ordered={block.ordered}
                    />
                );

            case 'note':
            default:
                return null;
        }
    }

    return (
        <View>
            {slideBody.blocks?.map(renderBlock)}
        </View>
    );
}

function PollSlide({
    slide,
    slideBody,
    attendeeId,
    presentationId,
}) {
    const [selectedOption, setSelectedOption] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [checking, setChecking] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function checkExistingResponse() {
            setChecking(true);

            try {
                const result = await apiRequest('/poll_response');

                const responses = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : [];

                const existing = responses.some(
                    (response) =>
                        Number(response.attendee_id) === Number(attendeeId) &&
                        Number(response.slide_id) === Number(slide.slide_id) &&
                        Number(response.presentation_id) === Number(presentationId)
                );

                if (!cancelled) setSubmitted(existing);
            } catch (error) {
                console.error('Could not check poll response:', error);
                if (!cancelled) {
                    Alert.alert('Error', 'Could not check your poll response.');
                }
            } finally {
                if (!cancelled) setChecking(false);
            }
        }

        if (attendeeId && slide?.is_poll) {
            checkExistingResponse();
        } else {
            setChecking(false);
        }

        return () => {
            cancelled = true;
        };
    }, [attendeeId, slide?.slide_id, presentationId]);

    async function submitResponse() {
        if (!attendeeId || selectedOption === null || submitted || submitting) {
            return;
        }

        setSubmitting(true);

        try {
            await apiRequest('/poll_response', {
                method: 'POST',
                body: JSON.stringify({
                    presentation_id: Number(presentationId),
                    attendee_id: Number(attendeeId),
                    slide_id: Number(slide.slide_id),
                    option: selectedOption,
                }),
            });

            setSubmitted(true);
        } catch (error) {
            Alert.alert(
                'Error',
                `Could not submit your response: ${error.message}`
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <View>
            <Text style={styles.heading}>
                {slideBody.name ?? 'Poll'}
            </Text>

            <View style={styles.separator} />

            <Text style={styles.paragraph}>
                {slideBody.pollQuestion}
            </Text>

            <Text style={styles.hint}>
                Select an option.
            </Text>

            {slideBody.pollOptions?.map((option, index) => (
                <Pressable
                    key={index}
                    disabled={submitted || checking || submitting}
                    onPress={() => setSelectedOption(option)}
                    style={[
                        styles.option,
                        selectedOption === option && styles.optionSelected,
                    ]}
                >
                    <Text
                        style={[
                            styles.optionText,
                            selectedOption === option && styles.optionTextSelected,
                        ]}
                    >
                        {option}
                    </Text>
                </Pressable>
            ))}

            {checking ? (
                <ActivityIndicator style={styles.pollStatus} />
            ) : submitted ? (
                <Text style={styles.status}>
                    Response already submitted.
                </Text>
            ) : (
                <Pressable
                    disabled={
                        !attendeeId ||
                        selectedOption === null ||
                        submitting
                    }
                    onPress={submitResponse}
                    style={[
                        styles.submitButton,
                        (
                            !attendeeId ||
                            selectedOption === null ||
                            submitting
                        ) && styles.disabledButton,
                    ]}
                >
                    <Text style={styles.buttonText}>
                        {submitting ? 'Submitting...' : 'Submit'}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

function CompletedSlide() {
    return (
        <View style={styles.completed}>
            <Text style={styles.heading}>Presentation Complete</Text>
            <View style={styles.separator} />
            <Text style={styles.paragraph}>
                Your responses have been submitted successfully.
            </Text>
            <Text style={styles.status}>
                You may now leave the presentation.
            </Text>
        </View>
    );
}

export default function SlidePreviewer({
    slide,
    presentationId,
    attendeeId,
    completed = false,
}) {
    if (completed) {
        return <CompletedSlide />;
    }

    if (!slide) {
        return <Text style={styles.paragraph}>No slide selected.</Text>;
    }

    if (Number(slide.presentation_id) !== Number(presentationId)) {
        return (
            <Text style={styles.paragraph}>
                Slide does not belong to this presentation.
            </Text>
        );
    }

    let slideBody;

    try {
        slideBody = typeof slide.body === 'string'
            ? JSON.parse(slide.body)
            : slide.body;
    } catch (error) {
        console.error('Could not parse slide body:', error);

        return (
            <Text style={styles.paragraph}>Invalid slide data.</Text>
        );
    }

    if (!slideBody || typeof slideBody !== 'object') {
        return <Text style={styles.paragraph}>Invalid slide data.</Text>;
    }

    if (slide.is_poll) {
        return (
            <PollSlide
                slide={slide}
                slideBody={slideBody}
                attendeeId={attendeeId}
                presentationId={presentationId}
            />
        );
    }

    return <NormalSlide slideBody={slideBody} />;
}

const styles = StyleSheet.create({
    heading: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    bold: {
        fontWeight: '700',
    },
    paragraph: {
        fontSize: 17,
        lineHeight: 26,
        color: '#374151',
        marginBottom: 16,
    },
    quote: {
        borderLeftWidth: 4,
        borderLeftColor: '#9ca3af',
        paddingLeft: 12,
        marginVertical: 12,
    },
    list: {
        marginBottom: 16,
        paddingLeft: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    listMarker: {
        width: 28,
        fontSize: 17,
        color: '#374151',
    },
    listContent: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: '#d1d5db',
        marginBottom: 18,
    },
    hint: {
        color: '#6b7280',
        marginBottom: 12,
    },
    option: {
        borderWidth: 1,
        borderColor: '#2563eb',
        borderRadius: 8,
        padding: 14,
        marginBottom: 10,
    },
    optionSelected: {
        backgroundColor: '#2563eb',
    },
    optionText: {
        fontSize: 16,
        color: '#2563eb',
    },
    optionTextSelected: {
        color: '#ffffff',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#16a34a',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    disabledButton: {
        opacity: 0.45,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    status: {
        color: '#2563eb',
        marginTop: 16,
        fontSize: 15,
    },
    pollStatus: {
        marginTop: 16,
    },
    completed: {
        alignItems: 'center',
    },
});
