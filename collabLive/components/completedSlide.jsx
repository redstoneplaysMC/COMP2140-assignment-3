// Slide upon completing the presentation in attendee mode.
function CompletedSlide() {
    return (
        <div className="text-center">
            <h2>Presentation Complete</h2>
            <hr />
            <p>Your responses have been submitted successfully.</p>
            <p className="text-primary">
                You may now close this tab.
            </p>
        </div>
    );
}