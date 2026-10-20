// Component to render a normal slide (non-poll)
function NormalSlide({ slideBody }) {
    // Describe some functions for each of the run types

    // Function to render runs within a block (e.g., strong text)
    function renderRuns(runs) {
        return runs?.map((run, index) => {
            if (run.type === "strong") {
                return (
                    <strong key={index}>
                        {renderRuns(run.runs)}
                    </strong>
                );
            }

            return (
                <span key={index}>
                    {run.value}
                </span>
            );
        });
    }

    // Function to render list items recursively
    function renderListItems(items, ordered) {
        const List = ordered ? "ol" : "ul";

        return (
            <List>
                {items?.map((item, index) => (
                    <li key={index}>
                        {renderRuns(item.runs)}

                        {item.items?.length > 0 &&
                            renderListItems(item.items, item.ordered)
                        }
                    </li>
                ))}
            </List>
        );
    }

    // Function to render individual blocks within a slide
    function renderBlock(block, index) {
        switch (block.kind) {

            case "heading": {
                const level = Math.min(Math.max(block.level || 1, 1), 6);
                const Heading = `h${level}`;

                return (
                    <Heading key={index}>
                        {renderRuns(block.runs)}
                    </Heading>
                );
            }

            case "paragraph":
                return (
                    <p key={index}>
                        {renderRuns(block.runs)}
                    </p>
                );

            case "quote":
                return (
                    <blockquote key={index}>
                        {renderRuns(block.runs)}
                    </blockquote>
                );

            case "list":
                return (
                    <div key={index}>
                        {renderListItems(block.items, block.ordered)}
                    </div>
                );

            case "note":
                return (
                    null
                    // <p key={index}>
                    //     {block.text}
                    // </p>
                );

            default:
                return null;
        }
    }

    // Render the slide by mapping over its blocks and using the renderBlock function for each block.
    return (
        <div>
            {slideBody.blocks?.map(renderBlock)}
        </div>
    );
}