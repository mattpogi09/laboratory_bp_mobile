/**
 * Extracts a human-readable error message from an API error.
 * Detects network failures and returns a specific offline message.
 */
export const getApiErrorMessage = (
    error: any,
    defaultMessage: string = "Something went wrong. Please try again.",
): string => {
    // Network error — no response from server
    if (!error.response) {
        return "No internet connection. Please check your network.";
    }
    return error.response?.data?.message || error.message || defaultMessage;
};

export const handleApiError = (
    error: any,
    defaultMessage: string = "An error occurred",
): string => {
    return getApiErrorMessage(error, defaultMessage);
};

export const showApiError = (
    error: any,
    defaultMessage: string = "An error occurred",
    title: string = "Error",
) => {
    const message = getApiErrorMessage(error, defaultMessage);
    return { title, message };
};
