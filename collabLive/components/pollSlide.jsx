import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api.js";

function PollSlide({
    slide,
    slideBody,
    selectedOption,
    setSelectedOption,
    attendeeId,
    presentationId,
    validAttendee
}) {
    const [submitted, setSubmitted] = useState(false);
    const slideId = slide?.slide_id;
    useEffect(() => {
        // Check if the attendee has already submitted a response for this poll slide,
        // for this presentation and this slide.
        const checkExistingResponse = async () => {
            try {
                const data = await apiRequest(`/poll_response`, {
                    method: "GET"
                });

                const existingResponse = data.data.find(
                    response =>
                        response.attendee_id === Number(attendeeId) &&
                        response.slide_id === slideId &&
                        response.presentation_id === Number(presentationId)
                );
                setSubmitted(!!existingResponse);

            } catch (error) {
                console.error("Failed to check existing poll response:", error);
            }
        };

        if (validAttendee && slide?.is_poll) {
            checkExistingResponse();
        }
    }, [attendeeId, slideId, presentationId, validAttendee]);
    // UseEffect for checking existing poll response, 
    // upon mounting and when attendeeId, slide ID, or validAttendee changes.


    // Render poll slide
    return (
        <div>
            <h2>{slideBody.name}</h2>
            <hr />
            <p>{slideBody.pollQuestion}</p>
            <div className="mb-2 mt-4">
                <i className="text-muted">Please select an option.</i>
            </div>
            <div className="mt-2">
                {slideBody.pollOptions?.map((option, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        className={`btn ${selectedOption === option
                            ? "btn-primary"
                            : "btn-outline-primary"
                            } me-2 mb-2`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <div className="mt-4">
                <button
                    type="button"
                    className="btn btn-success btn-sm"
                    // Disable the submit button if the attendee is not valid, no option is selected, or the response has already been submitted.
                    disabled={!validAttendee || selectedOption === null || submitted}
                    onClick={async () => {
                        console.log("Submitting poll response:", selectedOption);
                        try {
                            const response = await apiRequest(`/poll_response`, {
                                method: "POST",
                                body: JSON.stringify({
                                    presentation_id: Number(presentationId),
                                    attendee_id: Number(attendeeId),
                                    slide_id: Number(slide.slide_id),
                                    option: selectedOption
                                })
                            });
                            setSubmitted(true);
                            // Here you would typically make an API call to submit the response
                        } catch (error) {
                            console.error("Failed to submit poll response:", error);
                        }
                    }
                    }
                >
                    Submit
                </button>
                {/* {submitted
                    ? <p>Response Submitted for slide {slide.slide_id}.</p>
                    : null
                } */}
            </div>
        </div >
    );
}
