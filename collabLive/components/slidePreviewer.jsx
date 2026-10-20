import { useState, useEffect } from "react";
import CompletedSlide from "./completedSlide.jsx";
import PollSlide from "./pollSlide.jsx";
import NormalSlide from "./normalSlide.jsx";
import { apiRequest } from "../lib/api.js";

// Slide previewer function, decides whether to render a normal slide or a poll slide based on the slide data.
// Also describes the logic for validating the attendee and handling slide rendering.
export default function SlidePreviewer({ slide, presentationId, attendeeId, completed }) {
    const [selectedOption, setSelectedOption] = useState(null)
    const validAttendee =
        attendeeId !== null &&
        attendeeId !== undefined &&
        attendeeId !== "" &&
        Number.isInteger(Number(attendeeId)) &&
        Number(attendeeId) > 0;
    let slideBody;
    // console.log("validAttendee, attendeeId ?", validAttendee, attendeeId)
    if (completed) {
        return <CompletedSlide />;
    }

    if (!slide) {
        return <p>No slide selected.</p>;
    }

    if (Number(slide.presentation_id) !== Number(presentationId)) {
        return <p>Slide does not belong to this presentation.</p>;
    }

    try {
        slideBody = JSON.parse(slide.body);
    } catch (error) {
        console.error("Could not parse slide body:", error);
        return <p>Invalid slide data.</p>;
    }

    if (slide.is_poll) {
        return (
            <PollSlide
                slide={slide}
                slideBody={slideBody}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
                attendeeId={attendeeId}
                presentationId={presentationId}
                validAttendee={validAttendee}
            />
        );
    }
    return <NormalSlide slideBody={slideBody} />;
}



